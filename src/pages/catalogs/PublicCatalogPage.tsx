import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Check, ChevronDown, ChevronRight, Folder, Search, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { matchesSearchTerms } from '../../lib/searchTerms';
import { useCommissions } from '../../hooks/useCommissions';
import { useAuthStore } from '../../store/authStore';
import { useStoreTheme } from '../../hooks/useStoreTheme';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import { shareContent } from '../../lib/share';
import {
  formatProductShareText,
  shareTemplateUsesProductUrl,
} from '../../lib/shareTemplate';
import { getCachedShortUrl, getOrCreateShortLink } from '../../lib/shortLinks';
import { getCurrentPublicUrl } from '../../lib/urlHelper';
import {
  buildPricingContext,
  formatAmount,
  getCartTotals,
  getPriceParts,
  getPriceText,
  getUnifiedTotal,
} from '../../lib/pricing';
import { buildWhatsAppUrl, isSamePhone } from '../../lib/whatsapp';
import { toggleMarketplaceStock } from '../../lib/marketplace';
import { MarketplaceProductEditModal } from '../../components/store/MarketplaceProductEditModal';
import { applyStoreSeo } from '../../lib/seo';
import {
  isOffline,
  isNetworkError,
  saveCatalogToCache,
  getCatalogFromCache,
  saveCatalogProductsToCache,
  getCatalogProductsFromCache,
  saveCatalogCategoriesToCache,
  getCatalogCategoriesFromCache,
} from '../../lib/offlineCache';
import {
  PRODUCTS_FRESH_TTL_MS,
  clearProductReturnMarker,
  getVerifiedStoreSession,
  markProductPageVisited,
  peekReturnFromProductSession,
  saveStoreUiSnapshot,
  saveVerifiedStoreSession,
  updateProductInStoreSession,
  type PublicStoreSessionEntry,
} from '../../lib/publicStoreSessionCache';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { LoadingScreen } from '../../components/ui/AnimatedLogo';
import { Switch } from '../../components/ui/Switch';
import { CategoryIcon } from '../../components/ui/CategoryIcon';
import { StoreHero } from '../../components/store/StoreHero';
import { StoreToolbar } from '../../components/store/StoreToolbar';
import { CategoryRail, type CategorySelection } from '../../components/store/CategoryRail';
import { ProductCard, ProductGridSkeleton } from '../../components/store/ProductCard';
import { CartFab, CartSheet, type MinOrderState } from '../../components/store/Cart';
import { ProductQuickView } from '../../components/store/ProductQuickView';
import { StoreFooter } from '../../components/store/StoreFooter';
import { CatalogInactiveView } from '../../components/store/CatalogInactiveView';
import { recordStoreView } from '../../lib/analytics';
import type {
  CartItem,
  PublicCatalog,
  PublicProduct,
  StoreCategory,
  StoreSortBy,
} from '../../types/store';

export interface PublicCatalogPageProps {
  slug?: string;
  embedded?: boolean;
  onBack?: () => void;
}

const CATALOG_SELECT =
  'id, slug, name, slogan, description, user_id, is_active, is_public, inactive_reason, reopen_at, logo_url, cover_url, primary_color, background_color, surface_color, text_color, title_color, follow_code, footer_address, footer_phone, footer_email, footer_schedule, footer_instagram, footer_facebook, min_order_amount, min_order_currency, usd_to_cup_rate, cup_to_usd_rate, display_currency, share_template, enable_affiliates, commission_type, commission_value, min_payout_amount, catalog_type, is_blocked, blocked_reason';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const PublicCatalogPage: React.FC<PublicCatalogPageProps> = ({
  slug: propSlug,
  embedded = false,
  onBack,
}) => {
  const navigate = useNavigate();
  const { slug: routeSlug } = useParams<{ slug: string }>();
  const slug = propSlug || routeSlug;
  const { user } = useAuthStore();
  const { settings, getAppUrl, getAppHost } = useSystemSettings();
  const {
    registerPendingCommission,
    checkAffiliateStatus,
    applyForAffiliation,
    myAffiliation,
    loading: affiliateActionLoading,
  } = useCommissions();

  const returnSession = !embedded && slug ? peekReturnFromProductSession(slug) : null;
  const restoredFromProductRef = useRef<PublicStoreSessionEntry | null>(returnSession);
  const restoredSlugRef = useRef<string | undefined>(returnSession ? slug : undefined);
  const navigatingToProductRef = useRef(false);

  const [catalog, setCatalog] = useState<PublicCatalog | null>(() => returnSession?.catalog ?? null);
  const [products, setProducts] = useState<PublicProduct[]>(() =>
    returnSession?.productsComplete ? returnSession.products : []
  );
  const [categories, setCategories] = useState<StoreCategory[]>(
    () => returnSession?.categories ?? []
  );
  const [vendorPhone, setVendorPhone] = useState<string>(() => returnSession?.vendorPhone ?? '');
  const [vendorPlan, setVendorPlan] = useState<string>(() => returnSession?.vendorPlan ?? 'free');
  const [loading, setLoading] = useState(() => !returnSession);
  const [productsLoading, setProductsLoading] = useState(() => !returnSession?.productsComplete);
  const [error, setError] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<PublicProduct | null>(null);
  const [isFollowing, setIsFollowing] = useState(() =>
    Boolean(returnSession && returnSession.followingUserId === user?.id && returnSession.isFollowing)
  );
  const [followLoading, setFollowLoading] = useState(false);

  const isMarketplace = Boolean(
    catalog?.catalog_type === 'marketplace' ||
    (catalog?.name && /naz+a+r/i.test(catalog.name)) ||
    (catalog?.slug && /naz+a+r/i.test(catalog.slug))
  );

  // Estado de exploración y carrito
  const [searchQuery, setSearchQuery] = useState(() => returnSession?.uiState?.searchQuery ?? '');
  const [sortBy, setSortBy] = useState<StoreSortBy>(
    () => returnSession?.uiState?.sortBy ?? 'default'
  );
  const [groupByCategory, setGroupByCategory] = useState<boolean>(() => {
    if (returnSession?.uiState) {
      return returnSession.uiState.groupByCategory;
    }
    try {
      const saved = localStorage.getItem('matum_store_group_by_category');
      return saved !== null ? saved === 'true' : false;
    } catch {
      return false;
    }
  });
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>(
    () => returnSession?.uiState?.collapsedCategories ?? {}
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<CategorySelection>(
    () => returnSession?.uiState?.selectedCategoryId ?? null
  );
  const [selectedProduct, setSelectedProduct] = useState<PublicProduct | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showOrderSuccess, setShowOrderSuccess] = useState(false);
  const [isCompactHeader, setIsCompactHeader] = useState(false);
  const [visibleCount, setVisibleCount] = useState(() => returnSession?.uiState?.visibleCount ?? 20);

  const toggleGroupByCategory = () => {
    setGroupByCategory(prev => {
      const next = !prev;
      try {
        localStorage.setItem('matum_store_group_by_category', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const toggleCategoryCollapse = (key: string) => {
    setCollapsedCategories(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined' && slug) {
      try {
        const saved = localStorage.getItem(`matum_cart_${slug}`);
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.warn('Error reading cart from localStorage', e);
      }
    }
    return [];
  });

  // Formulario de envío del cliente (recordado en el dispositivo)
  const [isCustomerFormOpen, setIsCustomerFormOpen] = useState(false);
  const [customerName, setCustomerName] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('matum_buyer_info') || '{}');
      return saved.name || '';
    } catch {
      return '';
    }
  });
  const [customerAddress, setCustomerAddress] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('matum_buyer_info') || '{}');
      return saved.address || '';
    } catch {
      return '';
    }
  });
  const [customerPhone, setCustomerPhone] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('matum_buyer_info') || '{}');
      return saved.phone || '';
    } catch {
      return '';
    }
  });
  const [isDifferentRecipient, setIsDifferentRecipient] = useState(false);
  const [deliveryName, setDeliveryName] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');

  const heroEndRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const { themeStyles, titleColor } = useStoreTheme(catalog, {
    applyToRoot: !embedded,
    styleId: 'theme-dynamic-styles',
  });

  // Capturar código de promotor/afiliado desde URL
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const refParam = params.get('ref');
      if (refParam) {
        localStorage.setItem('matum_active_ref', refParam);
        if (slug) localStorage.setItem(`matum_ref_${slug}`, refParam);
      }
    } catch (e) {
      console.warn('Could not save referral code to localStorage', e);
    }
  }, [slug]);

  // Reiniciar paginación al cambiar filtros (inmune a StrictMode cuando se restaura desde caché)
  const prevFiltersRef = useRef({
    searchQuery,
    sortBy,
    selectedCategoryId,
    groupByCategory,
  });
  useEffect(() => {
    const prev = prevFiltersRef.current;
    if (
      prev.searchQuery === searchQuery &&
      prev.sortBy === sortBy &&
      prev.selectedCategoryId === selectedCategoryId &&
      prev.groupByCategory === groupByCategory
    ) {
      return;
    }
    prevFiltersRef.current = { searchQuery, sortBy, selectedCategoryId, groupByCategory };
    setVisibleCount(20);
  }, [searchQuery, sortBy, selectedCategoryId, groupByCategory]);

  // Restaurar posición de scroll al regresar desde el detalle de producto
  useLayoutEffect(() => {
    const targetScrollY = restoredFromProductRef.current?.uiState?.scrollY ?? 0;
    if (
      targetScrollY > 0 &&
      typeof window !== 'undefined' &&
      typeof window.scrollTo === 'function' &&
      !/jsdom/i.test(typeof navigator !== 'undefined' ? navigator.userAgent : '')
    ) {
      try {
        window.scrollTo(0, targetScrollY);
      } catch {
        // Ignorar en entornos como JSDOM donde scrollTo no está implementado
      }
    }
  }, []);

  // Limpiar marcador de retorno al salir de la tienda hacia otra ruta que no sea detalle de producto
  useEffect(() => {
    const currentSlug = slug;
    return () => {
      if (!navigatingToProductRef.current && currentSlug) {
        clearProductReturnMarker(currentSlug);
      }
    };
  }, [slug]);

  // Precargar el chunk lazy de la ficha de producto cuando la tienda ya está visible
  useEffect(() => {
    if (embedded || !catalog?.id) return;
    const timer = setTimeout(() => {
      void import('./PublicProductPage').catch(() => {});
    }, 150);
    return () => clearTimeout(timer);
  }, [embedded, catalog?.id]);

  // Mostrar cabecera compacta cuando el hero sale de pantalla
  useEffect(() => {
    const node = heroEndRef.current;
    if (!node) return;
    const io = new IntersectionObserver(([entry]) => setIsCompactHeader(!entry.isIntersecting), {
      threshold: 0,
    });
    io.observe(node);
    return () => io.disconnect();
  }, [catalog?.id]);

  // Título, Open Graph y JSON-LD de la tienda
  useEffect(() => {
    if (!catalog || embedded) return;
    return applyStoreSeo({
      title: catalog.slogan ? `${catalog.name} · ${catalog.slogan}` : catalog.name,
      description:
        catalog.slogan ||
        catalog.description ||
        `Explora los productos de ${catalog.name} y haz tu pedido por WhatsApp.`,
      image: catalog.logo_url || catalog.cover_url,
      url: getCurrentPublicUrl(settings.app_url) || undefined,
      jsonLd: {
        '@type': 'Store',
        name: catalog.name,
        description: catalog.description || catalog.slogan || undefined,
        image: catalog.logo_url || catalog.cover_url || undefined,
        telephone: vendorPhone || catalog.footer_phone || undefined,
        address: catalog.footer_address || undefined,
      },
    });
  }, [catalog, embedded, vendorPhone, settings.app_url]);

  useEffect(() => {
    if (!slug) return;
    const restored =
      !embedded &&
      restoredFromProductRef.current &&
      restoredSlugRef.current === slug
        ? restoredFromProductRef.current
        : null;

    if (restored) {
      if (isOffline()) return;

      if (restored.productsComplete) {
        if (Date.now() - restored.productsFetchedAt < PRODUCTS_FRESH_TTL_MS) {
          return;
        }
        void loadPublicCatalog({ silent: true });
        return;
      }

      void loadCatalogDetails(restored.catalog, slug, {
        hasFallbackCache: false,
        silent: true,
      });
      return;
    }

    void loadPublicCatalog();
  }, [slug]);

  useEffect(() => {
    if (catalog?.id && user?.id && !isOffline()) {
      checkAffiliateStatus(catalog.id, user.id);
    }
  }, [catalog?.id, user?.id, checkAffiliateStatus]);

  useEffect(() => {
    let cancelled = false;
    const checkFollowing = async () => {
      if (!catalog?.id || !user?.id || catalog.user_id === user.id || isOffline()) {
        setIsFollowing(false);
        return;
      }

      const cachedSession = slug ? getVerifiedStoreSession(slug) : null;
      if (
        cachedSession &&
        cachedSession.catalog.id === catalog.id &&
        cachedSession.followingUserId === user.id &&
        cachedSession.isFollowing !== undefined
      ) {
        if (!cancelled) {
          setIsFollowing(cachedSession.isFollowing);
        }
        return;
      }

      try {
        const { data } = await supabase
          .from('followed_catalogs')
          .select('id, status')
          .eq('catalog_id', catalog.id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (!cancelled) {
          const accepted = data?.status === 'accepted';
          setIsFollowing(accepted);
          if (slug) {
            saveVerifiedStoreSession(slug, {
              catalog,
              isFollowing: accepted,
              followingUserId: user.id,
            });
          }
        }
      } catch {
        // Ignorar errores silenciosamente al verificar seguimiento inicial
      }
    };
    checkFollowing();
    return () => {
      cancelled = true;
    };
  }, [catalog?.id, catalog?.user_id, user?.id, slug]);

  const handleToggleFollow = async () => {
    if (!user || !catalog?.id || isCatalogOwner || followLoading) return;
    if (isOffline()) {
      toast.error('Necesitas conexión a internet para actualizar tu seguimiento');
      return;
    }

    setFollowLoading(true);
    try {
      if (isFollowing) {
        const { error: deleteError } = await supabase
          .from('followed_catalogs')
          .delete()
          .eq('catalog_id', catalog.id)
          .eq('user_id', user.id);

        if (deleteError) throw deleteError;
        setIsFollowing(false);
        if (slug) {
          saveVerifiedStoreSession(slug, {
            catalog,
            isFollowing: false,
            followingUserId: user.id,
          });
        }
        toast.success(`Dejaste de seguir "${catalog.name}"`);
      } else {
        const { data: existing } = await supabase
          .from('followed_catalogs')
          .select('id, status')
          .eq('catalog_id', catalog.id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (existing?.id) {
          if (existing.status !== 'accepted') {
            const { error: updateError } = await supabase
              .from('followed_catalogs')
              .update({ status: 'accepted' })
              .eq('id', existing.id);
            if (updateError) throw updateError;
          }
        } else {
          const { error: insertError } = await supabase
            .from('followed_catalogs')
            .insert({
              user_id: user.id,
              catalog_id: catalog.id,
              status: 'accepted',
            });
          if (insertError) throw insertError;
        }

        setIsFollowing(true);
        if (slug) {
          saveVerifiedStoreSession(slug, {
            catalog,
            isFollowing: true,
            followingUserId: user.id,
          });
        }
        toast.success(`Ahora sigues a "${catalog.name}"`);
      }
    } catch (err: any) {
      toast.error('Error al actualizar seguimiento: ' + (err?.message || 'Inténtalo de nuevo'));
    } finally {
      setFollowLoading(false);
    }
  };

  // Registrar vista de la tienda en analytics
  useEffect(() => {
    if (!catalog?.id) return;
    try {
      const activeRef = (slug ? localStorage.getItem(`matum_ref_${slug}`) : null) || localStorage.getItem('matum_active_ref');
      recordStoreView({
        catalogId: catalog.id,
        referralCode: activeRef || undefined,
      });
    } catch (e) {
      console.warn('Error recording store view', e);
    }
  }, [catalog?.id, slug]);

  // Registrar vista de producto cuando se abre la vista rápida
  useEffect(() => {
    if (!selectedProduct || !catalog?.id) return;
    try {
      const activeRef = (slug ? localStorage.getItem(`matum_ref_${slug}`) : null) || localStorage.getItem('matum_active_ref');
      recordStoreView({
        catalogId: catalog.id,
        productId: selectedProduct.id,
        referralCode: activeRef || undefined,
      });
    } catch (e) {
      console.warn('Error recording product view', e);
    }
  }, [selectedProduct?.id, catalog?.id, slug]);

  // Persistir carrito
  useEffect(() => {
    if (!slug) return;
    try {
      localStorage.setItem(`matum_cart_${slug}`, JSON.stringify(cart));
    } catch (e) {
      console.warn('Error saving cart to localStorage', e);
    }
  }, [cart, slug]);

  const isApprovedAffiliate = myAffiliation?.status === 'approved';
  const isCatalogOwner = !!user && catalog?.user_id === user?.id;
  const canSeeCommissions = isApprovedAffiliate || isCatalogOwner;
  const hasCatalogRole = !!user && (user.id === catalog?.user_id || user.role === 'admin');

  useEffect(() => {
    if (!selectedProduct || !catalog?.id || !slug) return;
    const baseUrl = getAppUrl();
    const affiliateCode =
      (isApprovedAffiliate && user?.referral_code) || user?.referral_code || null;
    const longUrl = `${baseUrl}/${slug}/p/${selectedProduct.id}${affiliateCode ? `?ref=${affiliateCode}` : ''}`;

    void getOrCreateShortLink({
      baseUrl,
      catalogId: catalog.id,
      productId: selectedProduct.id,
      referralCode: affiliateCode,
      fallbackUrl: longUrl,
    });

    try {
      const activeRef =
        localStorage.getItem(`matum_ref_${slug}`) ||
        localStorage.getItem('matum_active_ref');
      if (activeRef && activeRef !== (affiliateCode || '')) {
        void getOrCreateShortLink({
          baseUrl,
          catalogId: catalog.id,
          productId: selectedProduct.id,
          referralCode: activeRef,
          fallbackUrl: `${baseUrl}/${slug}/p/${selectedProduct.id}?ref=${activeRef}`,
        });
      }
    } catch {
      // Ignorar errores de almacenamiento
    }
  }, [selectedProduct, catalog?.id, slug, isApprovedAffiliate, user?.referral_code, getAppUrl]);

  const applyCachedPublicCatalog = async (cachedCat: any) => {
    setCatalog(cachedCat);
    if (cachedCat._vendorInfo) {
      setVendorPhone(cachedCat._vendorInfo.vendorPhone || cachedCat.footer_phone || '');
      setVendorPlan(cachedCat._vendorInfo.vendorPlan || 'free');
    } else if (cachedCat.footer_phone) {
      setVendorPhone(cachedCat.footer_phone);
    }

    const [cachedProds, cachedCats] = await Promise.all([
      getCatalogProductsFromCache(cachedCat.id),
      getCatalogCategoriesFromCache(cachedCat.id),
    ]);

    if (cachedProds) {
      const uniqueCached = Array.from(
        new Map(
          cachedProds
            .filter(
              (p: any) => p.is_active !== false && !p.is_out_of_stock && p.stock_status !== 'out_of_stock'
            )
            .map((p: any) => [p.id, p])
        ).values()
      );
      setProducts(uniqueCached);
    }
    if (cachedCats) {
      setCategories(cachedCats.filter((c: any) => c.is_active !== false));
    }
    setLoading(false);
    setProductsLoading(false);
  };

  const getBlockedErrorMessage = (cat: { blocked_reason?: string | null }) =>
    cat.blocked_reason
      ? `Catálogo suspendido: ${cat.blocked_reason}`
      : 'Este catálogo ha sido bloqueado o suspendido por la administración.';

  const loadCatalogDetails = async (
    catData: PublicCatalog,
    slugParam: string,
    options: { hasFallbackCache?: boolean; silent?: boolean } = {}
  ) => {
    const { hasFallbackCache = false, silent = false } = options;
    try {
      const [prodResult, catKeysResult, userResult] = await Promise.all([
        supabase
          .from('products')
          .select(
            'id, catalog_id, name, description, price, currency, price_cup, price_usd, imagen_url, is_out_of_stock, stock_status, category_id, commission_amount, commission_currency, delivery_cost, delivery_currency, delivery_time_value, delivery_time_unit, is_active, position, contact_phone, sender_name, is_featured, badges, details_and_dimensions, care_and_maintenance'
          )
          .eq('catalog_id', catData.id)
          .eq('is_active', true)
          .order('is_featured', { ascending: false })
          .order('position', { ascending: true }),
        supabase
          .from('categories')
          .select('id, name, icon, display_order, is_active')
          .eq('catalog_id', catData.id)
          .eq('is_active', true)
          .order('display_order', { ascending: true }),
        supabase.from('users').select('phone, full_name, plan').eq('id', catData.user_id).single(),
      ]);

      if (prodResult.error) throw prodResult.error;
      const allActiveProducts = prodResult.data || [];
      const uniqueActiveProducts = Array.from(
        new Map(
          allActiveProducts
            .filter(p => !p.is_out_of_stock && p.stock_status !== 'out_of_stock')
            .map(p => [p.id, p])
        ).values()
      );
      setProducts(uniqueActiveProducts);
      void saveCatalogProductsToCache(catData.id, allActiveProducts, { prefetchImages: false });

      const resolvedCategories =
        !catKeysResult.error && catKeysResult.data ? catKeysResult.data : [];
      if (!catKeysResult.error && catKeysResult.data) {
        setCategories(catKeysResult.data);
        void saveCatalogCategoriesToCache(catData.id, catKeysResult.data);
      }

      let vPhone = catData.footer_phone || '';
      let vName = 'Vendedor Nazaar';
      let vPlan = 'free';
      if (!userResult.error && userResult.data) {
        vPhone = userResult.data.phone || vPhone;
        vName = userResult.data.full_name || vName;
        vPlan = userResult.data.plan || vPlan;
        setVendorPhone(vPhone);
        setVendorPlan(vPlan);
      }

      saveVerifiedStoreSession(slugParam, {
        catalog: catData,
        products: uniqueActiveProducts,
        productsComplete: true,
        categories: resolvedCategories,
        vendorPhone: vPhone,
        vendorPlan: vPlan,
      });

      void saveCatalogToCache(
        { ...catData, slug: (catData as any).slug || slugParam },
        { vendorPhone: vPhone, vendorName: vName, vendorPlan: vPlan }
      );
    } catch (parallelError: any) {
      console.error('Error cargando detalles secundarios de la tienda:', parallelError);
      if (!silent && !hasFallbackCache && !isNetworkError(parallelError)) {
        toast.error('Error al cargar algunos elementos de la tienda. Intente recargar.');
      }
    } finally {
      setProductsLoading(false);
    }
  };

  const loadPublicCatalog = async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!slug) return;
    if (!silent) {
      setError(null);
    }

    const cachedCat = silent ? null : await getCatalogFromCache(slug);

    if (!silent && isOffline()) {
      if (!cachedCat) {
        setError('Sin conexión. Este catálogo aún no ha sido guardado en tu dispositivo.');
      } else if (cachedCat.is_blocked) {
        setCatalog(null);
        setError(getBlockedErrorMessage(cachedCat));
      } else if (cachedCat.is_public === false) {
        setCatalog(null);
        setError('Este catálogo no se encuentra disponible actualmente.');
      } else if (cachedCat.is_active === false) {
        setCatalog(cachedCat);
        setError(null);
      } else {
        await applyCachedPublicCatalog(cachedCat);
        return;
      }
      setLoading(false);
      setProductsLoading(false);
      return;
    }

    if (!silent) {
      setLoading(true);
      setProductsLoading(true);
    }

    try {
      let { data: catData, error: catError } = await supabase
        .from('catalogs')
        .select(CATALOG_SELECT)
        .eq('slug', slug)
        .maybeSingle();

      if (!catData && UUID_RE.test(slug)) {
        const { data: catById, error: idError } = await supabase
          .from('catalogs')
          .select(CATALOG_SELECT)
          .eq('id', slug)
          .maybeSingle();
        if (catById) {
          catData = catById;
          catError = idError;
        }
      }

      if (catError) throw catError;

      if (!catData) {
        setCatalog(null);
        setError('Catálogo no encontrado.');
        setLoading(false);
        setProductsLoading(false);
        return;
      }

      if (catData.is_blocked) {
        saveVerifiedStoreSession(slug, { catalog: catData });
        await saveCatalogToCache({ ...catData, slug: (catData as any).slug || slug });
        setCatalog(null);
        setError(getBlockedErrorMessage(catData));
        setLoading(false);
        setProductsLoading(false);
        return;
      }

      if (!catData.is_public) {
        saveVerifiedStoreSession(slug, { catalog: catData });
        await saveCatalogToCache({ ...catData, slug: (catData as any).slug || slug });
        setCatalog(null);
        setError('Este catálogo no se encuentra disponible actualmente.');
        setLoading(false);
        setProductsLoading(false);
        return;
      }

      if (!catData.is_active) {
        saveVerifiedStoreSession(slug, { catalog: catData });
        await saveCatalogToCache({ ...catData, slug: (catData as any).slug || slug });
        setCatalog(catData);
        setError(null);
        setLoading(false);
        setProductsLoading(false);
        return;
      }

      if (!silent && cachedCat && cachedCat.id === catData.id) {
        await applyCachedPublicCatalog({ ...cachedCat, ...catData });
      } else {
        setCatalog(catData);
        if (!silent) {
          setLoading(false);
        }
      }

      saveVerifiedStoreSession(slug, { catalog: catData });
      await loadCatalogDetails(catData, slug, {
        hasFallbackCache: Boolean(cachedCat),
        silent,
      });
    } catch (err: any) {
      console.error(err);
      if (silent) return;
      if (cachedCat && isNetworkError(err)) {
        if (cachedCat.is_blocked) {
          setCatalog(null);
          setError(getBlockedErrorMessage(cachedCat));
        } else if (cachedCat.is_active === false || cachedCat.is_public === false) {
          setCatalog(null);
          setError('Este catálogo no se encuentra disponible actualmente.');
        } else {
          await applyCachedPublicCatalog(cachedCat);
          return;
        }
      } else {
        setCatalog(null);
        setError(
          isNetworkError(err)
            ? 'Sin conexión. Este catálogo aún no ha sido guardado en tu dispositivo.'
            : 'Ocurrió un error al cargar el catálogo. Inténtalo de nuevo.'
        );
      }
      setLoading(false);
      setProductsLoading(false);
    }
  };

  // Operaciones del carrito
  const addToCart = (product: PublicProduct) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === productId);
      if (!existing) return prev;
      if (existing.quantity === 1) return prev.filter(item => item.product.id !== productId);
      return prev.map(item =>
        item.product.id === productId ? { ...item, quantity: item.quantity - 1 } : item
      );
    });
  };

  const getProductQuantity = (productId: string) =>
    cart.find(item => item.product.id === productId)?.quantity ?? 0;

  const updateCartQuantity = (product: PublicProduct, qty: number) => {
    if (qty <= 0) {
      setCart(prev => prev.filter(item => item.product.id !== product.id));
      return;
    }
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id ? { ...item, quantity: qty } : item
        );
      }
      return [...prev, { product, quantity: qty }];
    });
  };

  const clearCart = () => {
    setCart([]);
    if (slug) localStorage.removeItem(`matum_cart_${slug}`);
  };

  // Precios y totales (centralizados en src/lib/pricing.ts)
  const pricingCtx = useMemo(() => buildPricingContext(catalog, vendorPlan), [catalog, vendorPlan]);
  const totals = useMemo(() => getCartTotals(cart, pricingCtx), [cart, pricingCtx]);

  const minOrder: MinOrderState | null = useMemo(() => {
    const amount = catalog?.min_order_amount || 0;
    if (!catalog || amount <= 0) return null;
    const currency = catalog.min_order_currency || 'CUP';
    const current = getUnifiedTotal(cart, currency, {
      usdToCup: catalog.usd_to_cup_rate,
      cupToUsd: catalog.cup_to_usd_rate,
    });
    const missing = Math.max(0, amount - current);
    return { amount, currency, current, missing, met: current >= amount };
  }, [cart, catalog]);

  const isMinAmountMet = !minOrder || minOrder.met;

  const handleOpenCustomerForm = () => {
    if (minOrder && !minOrder.met) {
      toast.error(
        `El monto mínimo de pedido es de ${formatAmount(minOrder.amount)} ${minOrder.currency}. Te faltan ${formatAmount(minOrder.missing)} ${minOrder.currency}.`
      );
      return;
    }
    setIsCustomerFormOpen(true);
  };

  // Filtrado y orden de productos
  const filteredProducts = useMemo(() => {
    const sortedCats = [...categories].sort(
      (c1, c2) => (c1.display_order ?? 0) - (c2.display_order ?? 0)
    );

    const seenIds = new Set<string>();

    return products
      .filter(p => {
        if (!p?.id || seenIds.has(p.id)) return false;
        seenIds.add(p.id);

        const matchesSearch = matchesSearchTerms(p, searchQuery);
        const matchesCategory =
          selectedCategoryId === null ||
          (selectedCategoryId === 'none' && !p.category_id) ||
          (selectedCategoryId !== 'none' && p.category_id === Number(selectedCategoryId));
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return (a.price || 0) - (b.price || 0);
        if (sortBy === 'price-desc') return (b.price || 0) - (a.price || 0);
        if (sortBy === 'category') {
          const idxA =
            a.category_id != null
              ? sortedCats.findIndex(c => Number(c.id) === Number(a.category_id))
              : -1;
          const idxB =
            b.category_id != null
              ? sortedCats.findIndex(c => Number(c.id) === Number(b.category_id))
              : -1;
          const orderA = idxA !== -1 ? idxA : Number.MAX_SAFE_INTEGER;
          const orderB = idxB !== -1 ? idxB : Number.MAX_SAFE_INTEGER;
          if (orderA !== orderB) return orderA - orderB;

          // Dentro de la misma categoría, productos destacados primero
          const featDiff = Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured));
          if (featDiff !== 0) return featDiff;
          return (a.position ?? 0) - (b.position ?? 0);
        }

        // Orden 'default' (Destacados primero):
        const featDiff = Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured));
        if (featDiff !== 0) return featDiff;

        return (a.position ?? 0) - (b.position ?? 0);
      });
  }, [products, categories, searchQuery, selectedCategoryId, sortBy]);

  const hasUncategorized = useMemo(() => products.some(p => !p.category_id), [products]);
  const totalItemsCount = useMemo(
    () => cart.reduce((acc, item) => acc + item.quantity, 0),
    [cart]
  );
  const displayedProducts = useMemo(
    () => filteredProducts.slice(0, visibleCount),
    [filteredProducts, visibleCount]
  );

  // Agrupación por categorías para renderizar con separadores
  const groupedDisplayedProducts = useMemo(() => {
    if (!groupByCategory) return [];

    const sortedCats = [...categories].sort(
      (c1, c2) => (c1.display_order ?? 0) - (c2.display_order ?? 0)
    );
    const catMap = new Map<number, StoreCategory>();
    sortedCats.forEach(c => catMap.set(Number(c.id), c));

    const groupsMap = new Map<
      string,
      { key: string; name: string; icon: string | null; order: number; items: PublicProduct[] }
    >();

    displayedProducts.forEach(p => {
      const cat = p.category_id != null ? catMap.get(Number(p.category_id)) : undefined;
      const key = cat ? `cat_${cat.id}` : 'uncategorized';
      if (!groupsMap.has(key)) {
        const orderIdx = cat
          ? sortedCats.findIndex(c => Number(c.id) === Number(cat.id))
          : Number.MAX_SAFE_INTEGER;
        groupsMap.set(key, {
          key,
          name: cat ? cat.name : 'Otros productos',
          icon: cat ? cat.icon : null,
          order: orderIdx !== -1 ? orderIdx : Number.MAX_SAFE_INTEGER,
          items: [],
        });
      }
      groupsMap.get(key)!.items.push(p);
    });

    return Array.from(groupsMap.values()).sort((a, b) => a.order - b.order);
  }, [displayedProducts, categories, groupByCategory]);

  // Scroll infinito unificado (móvil y escritorio)
  const loadMoreRef = useCallback(
    (node: HTMLDivElement | null) => {
      observerRef.current?.disconnect();
      if (!node) return;
      observerRef.current = new IntersectionObserver(
        entries => {
          if (entries[0].isIntersecting) {
            setVisibleCount(prev => Math.min(prev + 20, filteredProducts.length));
          }
        },
        { threshold: 0.1, rootMargin: '240px' }
      );
      observerRef.current.observe(node);
    },
    [filteredProducts.length]
  );

  useEffect(() => () => observerRef.current?.disconnect(), []);

  // Enviar pedido por WhatsApp
  const handleSendOrder = (
    name: string,
    address: string,
    phone: string,
    differentRecipient: boolean,
    recipientName: string,
    recipientPhone: string
  ) => {
    if (cart.length === 0 || !catalog) return;

    let messageText = `🛒 *Nuevo Pedido - Nazaar*\n`;
    messageText += `━━━━━━━━━━━━━━━━━━━━\n`;
    messageText += `*Tienda:* ${catalog.name}\n`;
    if (slug) {
      const currentHost = getAppHost();
      messageText += `*Enlace:* ${currentHost}/${slug}\n`;
    }
    messageText += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    messageText += differentRecipient
      ? `👤 *Datos del Cliente:*\n`
      : `👤 *Datos de la persona que recibe:*\n`;
    messageText += `• *Nombre:* ${name}\n`;
    messageText += `• *Dirección de Entrega:* ${address}\n`;
    messageText += `• *Teléfono de Contacto:* ${phone}\n`;

    if (differentRecipient) {
      messageText += `\n🚚 *Persona que recibe (Destinatario):*\n`;
      messageText += `• *Nombre:* ${recipientName}\n`;
      messageText += `• *Teléfono:* ${recipientPhone}\n`;
    }
    messageText += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    messageText += `*Detalle de Productos:*\n`;

    cart.forEach((item, idx) => {
      const price = item.product.price || 0;
      const currency = item.product.currency || 'CUP';
      const subtotal = price * item.quantity;
      messageText += `${idx + 1}. *${item.product.name}*\n`;
      messageText += `   - Cantidad: *${item.quantity}*\n`;
      messageText += `   - Precio: ${price} ${currency}\n`;
      messageText += `   - Subtotal: *${subtotal} ${currency}*\n`;
      if (item.product.delivery_cost !== null && item.product.delivery_cost !== undefined) {
        const dText = Number(item.product.delivery_cost) === 0 ? 'Gratis' : `${item.product.delivery_cost} ${item.product.delivery_currency || 'CUP'}`;
        messageText += `   - Domicilio: ${dText}\n`;
      }
      if (item.product.delivery_time_value !== null && item.product.delivery_time_value !== undefined) {
        const uText = item.product.delivery_time_unit === 'days' ? (Number(item.product.delivery_time_value) === 1 ? 'día' : 'días') : (Number(item.product.delivery_time_value) === 1 ? 'hora' : 'horas');
        messageText += `   - Tiempo de entrega: ${item.product.delivery_time_value} ${uText}\n`;
      }
      messageText += `\n`;
    });

    messageText += `━━━━━━━━━━━━━━━━━━━━\n`;
    messageText += `💰 *Totales del Pedido:*\n`;
    Object.entries(totals).forEach(([curr, val]) => {
      messageText += `• *Total en ${curr}:* ${val.toFixed(2)} ${curr}\n`;
    });
    messageText += `━━━━━━━━━━━━━━━━━━━━\n`;

    const activeRef =
      (slug ? localStorage.getItem(`matum_ref_${slug}`) : null) ||
      localStorage.getItem('matum_active_ref');
    const orderRef = 'ORD-' + Math.random().toString(36).substring(2, 7).toUpperCase();

    if (activeRef) {
      messageText += `🤝 *Referido por:* @${activeRef}\n`;
      messageText += `🔖 *Ref. Pedido:* ${orderRef}\n`;
      messageText += `━━━━━━━━━━━━━━━━━━━━\n`;
    }
    messageText += `\n¡Hola! Me gustaría coordinar este pedido de productos. ¿Están disponibles?`;

    let commissionCup = 0;
    let commissionUsd = 0;
    cart.forEach(item => {
      const comm = Number(item.product.commission_amount) || 0;
      if (comm > 0) {
        if (item.product.commission_currency === 'USD') {
          commissionUsd += comm * item.quantity;
        } else {
          commissionCup += comm * item.quantity;
        }
      }
    });

    if (
      activeRef &&
      catalog?.id &&
      catalog.enable_affiliates &&
      (commissionCup > 0 || commissionUsd > 0)
    ) {
      const primaryCurr = Object.keys(totals)[0] || 'CUP';
      registerPendingCommission({
        catalogId: catalog.id,
        referralCode: activeRef,
        orderRef,
        saleTotal: totals[primaryCurr] || 0,
        currency: primaryCurr,
        buyerName: name,
        buyerPhone: phone,
        commissionCup,
        commissionUsd,
      });
    }

    try {
      localStorage.setItem(
        'matum_buyer_info',
        JSON.stringify({ name: name.trim(), address: address.trim(), phone: phone.trim() })
      );
    } catch {
      // ignore storage errors
    }

    window.open(buildWhatsAppUrl(vendorPhone, messageText), '_blank');
    setShowOrderSuccess(true);
    clearCart();
    setIsCartOpen(false);
    setIsCustomerFormOpen(false);
    setIsDifferentRecipient(false);
    setDeliveryName('');
    setDeliveryPhone('');
  };

  const handleShareCatalog = async () => {
    const affiliateParam = user?.referral_code ? `?ref=${user.referral_code}` : '';
    const baseUrl = getAppUrl();
    const shareUrl = slug ? `${baseUrl}/${slug}${affiliateParam}` : '';
    const shareText = catalog?.slogan
      ? `${catalog.slogan}\n\n${shareUrl}`
      : `${catalog?.name || 'Tienda'}\n\n${shareUrl}`;

    await shareContent({
      title: catalog?.name || 'Tienda',
      text: shareText,
      url: shareUrl,
      imageUrl: catalog?.logo_url || undefined,
    });
  };

  const handleShareProduct = async (product: PublicProduct, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const priceText = getPriceText(product, pricingCtx);
    const affiliateCode =
      (isApprovedAffiliate && user?.referral_code) || user?.referral_code;
    const affiliateParam = affiliateCode ? `?ref=${affiliateCode}` : '';
    const baseUrl = getAppUrl();
    const longProductUrl = slug ? `${baseUrl}/${slug}/p/${product.id}${affiliateParam}` : '';
    const storeUrl = slug ? `${baseUrl}/${slug}${affiliateParam}` : '';
    const productUrl =
      catalog?.id && slug && shareTemplateUsesProductUrl(catalog.share_template)
        ? await getOrCreateShortLink({
            baseUrl,
            catalogId: catalog.id,
            productId: product.id,
            referralCode: affiliateCode,
            fallbackUrl: longProductUrl,
          })
        : longProductUrl;

    const text = formatProductShareText({
      shareTemplate: catalog?.share_template,
      productName: product.name,
      productDescription: product.description,
      priceText,
      currencyText: '',
      catalogName: catalog?.name,
      contactNumber: vendorPhone,
      productUrl,
      storeUrl,
    });

    await shareContent({
      title: product.name,
      text,
      imageUrl: product.imagen_url || undefined,
    });
  };

  const handleAskProductWhatsApp = (product: PublicProduct) => {
    const activeRef =
      (slug ? localStorage.getItem(`matum_ref_${slug}`) : null) ||
      localStorage.getItem('matum_active_ref');

    let messageText = `¡Hola! Me interesa este producto:\n\n`;
    messageText += `🛍️ *${product.name}*\n`;
    if (product.price !== null) {
      messageText += `💵 *Precio:* ${getPriceText(product, pricingCtx)}\n`;
    }
    if (slug) {
      const baseUrl = getAppUrl();
      const refParam = activeRef ? `?ref=${activeRef}` : '';
      const longUrl = `${baseUrl}/${slug}/p/${product.id}${refParam}`;
      const productUrl = catalog?.id
        ? getCachedShortUrl({
            baseUrl,
            catalogId: catalog.id,
            productId: product.id,
            referralCode: activeRef,
          }) || longUrl
        : longUrl;
      messageText += `🔗 *Enlace del producto:* ${productUrl}\n`;
    }
    if (activeRef) {
      messageText += `\n🤝 *Referido por:* @${activeRef}\n`;
    }
    messageText += `\n¿Está disponible?`;

    const targetPhone = (isMarketplace && product.contact_phone)
      ? product.contact_phone
      : (product.contact_phone || vendorPhone);

    window.open(buildWhatsAppUrl(targetPhone, messageText), '_blank');
  };

  const handleToggleProductStock = async (product: PublicProduct) => {
    const nextStatus = !product.is_out_of_stock;
    const success = await toggleMarketplaceStock(product.id, nextStatus);
    if (success) {
      const nextStockStatus = nextStatus ? 'out_of_stock' : 'available';
      setProducts(prev =>
        prev.map(p =>
          p.id === product.id
            ? { ...p, is_out_of_stock: nextStatus, stock_status: nextStockStatus }
            : p
        )
      );
      if (slug || catalog?.id) {
        updateProductInStoreSession(slug || catalog!.id, product.id, {
          is_out_of_stock: nextStatus,
          stock_status: nextStockStatus,
        });
      }
      toast.success(nextStatus ? 'Producto marcado como agotado' : 'Producto disponible');
    } else {
      toast.error('No se pudo cambiar el estado. Inicia sesión con el número de WhatsApp correspondiente.');
    }
  };

  const handleProductUpdated = (updated: Partial<PublicProduct>) => {
    if (!editingProduct) return;
    setProducts(prev =>
      prev.map(p => (p.id === editingProduct.id ? { ...p, ...updated } : p))
    );
    if (slug || catalog?.id) {
      updateProductInStoreSession(slug || catalog!.id, editingProduct.id, updated);
    }
    toast.success('Publicación actualizada');
  };

  const openProductDetail = (product: PublicProduct) => {
    if (embedded) {
      setSelectedProduct(product);
      return;
    }

    if (slug && catalog) {
      navigatingToProductRef.current = true;
      saveStoreUiSnapshot(slug, {
        searchQuery,
        sortBy,
        groupByCategory,
        collapsedCategories,
        selectedCategoryId,
        visibleCount,
        scrollY: typeof window !== 'undefined' ? window.scrollY || 0 : 0,
      });
      markProductPageVisited(slug);
    }

    navigate(`/${slug}/p/${product.id}${window.location.search}`, {
      state: {
        fromStore: true,
        catalog,
        product,
        vendorPhone,
        vendorPlan,
      },
    });
  };

  if (loading) {
    return <LoadingScreen label="Cargando tienda…" className="font-store" />;
  }

  if (error || !catalog) {
    const isNotFound = error === 'Catálogo no encontrado.';
    const hasCustomDetail =
      Boolean(error) &&
      error !== 'Catálogo no encontrado.' &&
      error !== 'Este catálogo no se encuentra disponible actualmente.';

    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-5 text-center font-store">
        <div className="w-12 h-12 rounded-card bg-red-500/10 flex items-center justify-center border border-red-500/20 text-red-500 mb-3">
          <AlertTriangle size={22} />
        </div>
        <h1 className="font-display text-lg font-bold text-primary mb-1">
          {isNotFound ? 'Tienda no encontrada' : 'Tienda no disponible'}
        </h1>
        <p className="text-secondary text-xs max-w-xs mb-5">
          {hasCustomDetail ? error : 'El enlace que ingresaste no existe o no está activo en este momento.'}
        </p>
        <Link to="/login">
          <Button variant="secondary" size="sm" icon={ArrowLeft}>
            Volver a Nazaar
          </Button>
        </Link>
      </div>
    );
  }

  if (catalog.is_active === false) {
    return <CatalogInactiveView catalog={catalog} />;
  }

  return (
    <div
      style={themeStyles}
      className={`font-store flex flex-col min-h-screen bg-[var(--background)] text-[var(--text-primary)] ${
        totalItemsCount > 0 ? 'pb-20' : ''
      }`}
    >
      <StoreHero
        catalog={catalog}
        titleColor={titleColor}
        vendorPhone={vendorPhone}
        productCount={!productsLoading ? products.length : undefined}
        showBackButton={!embedded}
        onBack={() => (onBack ? onBack() : navigate('/'))}
        onShare={handleShareCatalog}
        affiliate={{
          isLoggedIn: !!user,
          isOwner: isCatalogOwner,
          status: myAffiliation?.status,
          loading: affiliateActionLoading,
          onApply: async () => {
            if (!user) {
              navigate(`/login?redirect=/${slug}`);
              return;
            }
            if (catalog.id) {
              const res = await applyForAffiliation(catalog.id, user?.id);
              if (res && (res as any).requireLogin) {
                navigate(`/login?redirect=/${slug}`);
              }
            }
          },
        }}
        follow={{
          canFollow: !!user && !isCatalogOwner,
          isFollowing,
          loading: followLoading,
          onToggle: handleToggleFollow,
        }}
      />

      <div ref={heroEndRef} />

      <StoreToolbar
        catalog={catalog}
        compact={isCompactHeader}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortBy={sortBy}
        onSortChange={val => {
          setSortBy(val);
          if (val === 'category') {
            setGroupByCategory(true);
            try {
              localStorage.setItem('matum_store_group_by_category', 'true');
            } catch {
              // ignore
            }
          }
        }}
        groupByCategory={groupByCategory}
        onToggleGroupByCategory={toggleGroupByCategory}
        showGroupToggle={categories.length > 0}
        cartCount={totalItemsCount}
        onOpenCart={() => setIsCartOpen(true)}
      >
        <CategoryRail
          categories={categories}
          selected={selectedCategoryId}
          onSelect={setSelectedCategoryId}
          showUncategorized={hasUncategorized}
          loading={productsLoading}
        />
      </StoreToolbar>

      <main className="flex-1 w-full max-w-6xl mx-auto px-3 pt-3 pb-3">
        {productsLoading ? (
          <ProductGridSkeleton count={8} />
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 px-3">
            <div className="w-11 h-11 rounded-card bg-surface border border-border flex items-center justify-center text-secondary mx-auto mb-3">
              <Search size={18} strokeWidth={1.5} />
            </div>
            <h2 className="font-display text-sm font-bold text-primary">
              No encontramos productos
            </h2>
            <p className="text-secondary text-xs mt-1 max-w-sm mx-auto">
              {searchQuery || selectedCategoryId !== null
                ? 'Prueba con otra búsqueda o vuelve a ver todas las categorías.'
                : 'Esta tienda aún no tiene productos publicados.'}
            </p>
            {(searchQuery || selectedCategoryId !== null) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategoryId(null);
                }}
                className="mt-3 inline-flex items-center justify-center h-8 px-3.5 rounded-lg bg-surface hover:bg-surface-hover border border-border text-xs font-semibold text-primary transition-colors"
              >
                Ver todo el catálogo
              </button>
            )}
          </div>
        ) : groupByCategory && categories.length > 0 ? (
          <>
            <div className="space-y-4">
              {groupedDisplayedProducts.map((group, groupIdx) => {
                const isCollapsed = !!collapsedCategories[group.key];
                return (
                  <section key={group.key} className="space-y-2">
                    {/* Separador de Categoría */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleCategoryCollapse(group.key)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleCategoryCollapse(group.key);
                        }
                      }}
                      className="flex items-center gap-2 py-1.5 px-2.5 bg-surface/80 hover:bg-surface border border-border cursor-pointer select-none transition-colors"
                    >
                      <span className="w-5 h-5 inline-flex items-center justify-center bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30 flex-shrink-0">
                        {group.icon ? <CategoryIcon name={group.icon} size={12} /> : <Folder size={12} />}
                      </span>
                      <h2 className="font-display text-xs font-bold uppercase tracking-wider text-primary truncate">
                        {group.name}
                      </h2>
                      <div className="h-px flex-1 bg-border mx-1" />
                      <span className="text-[10px] font-semibold text-secondary tabular-nums px-1.5 py-0.5 bg-background border border-border">
                        {group.items.length} {group.items.length === 1 ? 'producto' : 'productos'}
                      </span>
                      <span className="text-secondary">
                        {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                      </span>
                    </div>

                    {!isCollapsed && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
                        {group.items.map((product, idx) => (
                          <ProductCard
                            key={product.id}
                            product={product}
                            quantity={getProductQuantity(product.id)}
                            price={getPriceParts(product, pricingCtx)}
                            showCommission={canSeeCommissions}
                            priority={groupIdx === 0 && idx < 4}
                            isMarketplace={isMarketplace}
                            isOwner={Boolean(user?.phone && isSamePhone(user.phone, product.contact_phone))}
                            onOpen={() => openProductDetail(product)}
                            onAdd={() => addToCart(product)}
                            onRemove={() => removeFromCart(product.id)}
                            onShare={e => handleShareProduct(product, e)}
                            onToggleStock={() => handleToggleProductStock(product)}
                            onEditMarketplace={() => setEditingProduct(product)}
                            onContactWhatsApp={() => handleAskProductWhatsApp(product)}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>

            {visibleCount < filteredProducts.length && (
              <div ref={loadMoreRef} className="h-16 flex items-center justify-center mt-4">
                <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
              {displayedProducts.map((product, idx) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  quantity={getProductQuantity(product.id)}
                  price={getPriceParts(product, pricingCtx)}
                  showCommission={canSeeCommissions}
                  priority={idx < 4}
                  isMarketplace={isMarketplace}
                  isOwner={Boolean(user?.phone && isSamePhone(user.phone, product.contact_phone))}
                  onOpen={() => openProductDetail(product)}
                  onAdd={() => addToCart(product)}
                  onRemove={() => removeFromCart(product.id)}
                  onShare={e => handleShareProduct(product, e)}
                  onToggleStock={() => handleToggleProductStock(product)}
                  onEditMarketplace={() => setEditingProduct(product)}
                  onContactWhatsApp={() => handleAskProductWhatsApp(product)}
                />
              ))}
            </div>

            {visibleCount < filteredProducts.length && (
              <div ref={loadMoreRef} className="h-16 flex items-center justify-center mt-4">
                <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </>
        )}
      </main>

      <StoreFooter
        catalog={catalog}
        slug={slug}
        titleColor={titleColor}
        hasCatalogRole={hasCatalogRole}
        affiliate={{
          isLoggedIn: !!user,
          isOwner: isCatalogOwner,
          status: myAffiliation?.status,
          loading: affiliateActionLoading,
          onApply: async () => {
            if (!user) {
              navigate(`/login?redirect=/${slug}`);
              return;
            }
            if (catalog.id) {
              const res = await applyForAffiliation(catalog.id, user?.id);
              if (res && (res as any).requireLogin) {
                navigate(`/login?redirect=/${slug}`);
              }
            }
          },
        }}
      />

      {showOrderSuccess && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-3 py-2 rounded-full shadow-xl flex items-center gap-1.5 text-xs font-semibold animate-store-fade-up">
          <Check size={14} /> Redirigiendo a WhatsApp con tu pedido…
          <button
            type="button"
            onClick={() => setShowOrderSuccess(false)}
            className="ml-1 hover:opacity-80"
            aria-label="Cerrar aviso"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {!isMarketplace && (
        <CartFab
          count={totalItemsCount}
          totals={totals}
          onOpen={() => setIsCartOpen(true)}
          bottomOffsetClass={embedded ? 'bottom-16' : 'bottom-3'}
        />
      )}

      {editingProduct && (
        <MarketplaceProductEditModal
          product={editingProduct}
          isOpen={!!editingProduct}
          onClose={() => setEditingProduct(null)}
          onSaved={handleProductUpdated}
        />
      )}

      <CartSheet
        open={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        getUnitPrice={item => getPriceParts(item.product, pricingCtx, 1)}
        getSubtotal={item => getPriceParts(item.product, pricingCtx, item.quantity)}
        totals={totals}
        minOrder={minOrder}
        onAdd={item => addToCart(item.product)}
        onRemove={item => removeFromCart(item.product.id)}
        onClear={clearCart}
        onCheckout={handleOpenCustomerForm}
      />

      <ProductQuickView
        product={selectedProduct}
        price={selectedProduct ? getPriceParts(selectedProduct, pricingCtx) : null}
        quantity={selectedProduct ? getProductQuantity(selectedProduct.id) : 0}
        showCommission={canSeeCommissions}
        onClose={() => setSelectedProduct(null)}
        onAdd={() => selectedProduct && addToCart(selectedProduct)}
        onRemove={() => selectedProduct && removeFromCart(selectedProduct.id)}
        onSetQuantity={qty => selectedProduct && updateCartQuantity(selectedProduct, qty)}
        onShare={e => selectedProduct && handleShareProduct(selectedProduct, e)}
        onAskWhatsApp={() => selectedProduct && handleAskProductWhatsApp(selectedProduct)}
      />

      {/* Modal de datos de envío */}
      <Modal
        isOpen={isCustomerFormOpen}
        onClose={() => setIsCustomerFormOpen(false)}
        title="Datos de la persona que recibe el producto"
        footer={
          <div className="flex gap-2 w-full">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsCustomerFormOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!isMinAmountMet}
              onClick={() => {
                if (!customerName.trim() || !customerAddress.trim() || !customerPhone.trim()) {
                  toast.error('Por favor, completa todos los campos del formulario.');
                  return;
                }
                if (isDifferentRecipient && (!deliveryName.trim() || !deliveryPhone.trim())) {
                  toast.error('Por favor, completa los datos de la persona que recibe.');
                  return;
                }
                handleSendOrder(
                  customerName,
                  customerAddress,
                  customerPhone,
                  isDifferentRecipient,
                  deliveryName,
                  deliveryPhone
                );
              }}
              className="flex-1 bg-green-600 hover:bg-green-700 border-green-600 text-white"
            >
              Confirmar pedido
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-left font-store">
          <p className="text-xs text-secondary leading-relaxed">
            Completa los datos de la persona que recibe el producto para coordinar la entrega y finalizar tu pedido por WhatsApp.
          </p>

          <Input
            label="Nombre de la persona que recibe"
            placeholder="Ej: Juan Pérez"
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Dirección de entrega"
            placeholder="Ej: Calle 23 #456 e/ H e I, Vedado, La Habana"
            value={customerAddress}
            onChange={e => setCustomerAddress(e.target.value)}
            multiline
            rows={2}
            required
          />

          <Input
            label="Teléfono de quien recibe"
            placeholder="Ej: +53 51234567"
            type="tel"
            value={customerPhone}
            onChange={e => setCustomerPhone(e.target.value)}
            required
          />

          <div className="pt-2 border-t border-border">
            <Switch
              checked={isDifferentRecipient}
              onChange={setIsDifferentRecipient}
              label="¿El pedido lo recibe otra persona?"
              subtitle="Activa esta opción si los datos de entrega son de un destinatario diferente"
            />
          </div>

          {isDifferentRecipient && (
            <div className="space-y-3 pt-1 animate-store-fade-up">
              <Input
                label="Nombre de la persona que recibe"
                placeholder="Ej: María Gómez"
                value={deliveryName}
                onChange={e => setDeliveryName(e.target.value)}
                required
              />

              <Input
                label="Número de teléfono de quien recibe"
                placeholder="Ej: +53 58765432"
                type="tel"
                value={deliveryPhone}
                onChange={e => setDeliveryPhone(e.target.value)}
                required
              />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
