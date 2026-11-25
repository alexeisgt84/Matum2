import React, { useState, useEffect, useLayoutEffect, useMemo } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  ArrowLeft,
  Share2,
  Copy,
  Check,
  Plus,
  Minus,
  AlertTriangle,
  ChevronRight,
  Truck,
  Clock,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useCommissions } from '../../hooks/useCommissions';
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
  getPriceParts,
  getPriceText,
} from '../../lib/pricing';
import { buildWhatsAppUrl, isSamePhone } from '../../lib/whatsapp';
import { toggleMarketplaceStock } from '../../lib/marketplace';
import { MarketplaceProductEditModal } from '../../components/store/MarketplaceProductEditModal';
import { applyStoreSeo } from '../../lib/seo';
import { LoadingScreen } from '../../components/ui/AnimatedLogo';
import {
  isOffline,
  isNetworkError,
  getCatalogFromCache,
  saveCatalogToCache,
  getCatalogProductsFromCache,
  upsertCatalogProductsInCache,
} from '../../lib/offlineCache';
import {
  PRODUCTS_FRESH_TTL_MS,
  computeRelatedProductsFromList,
  getVerifiedStoreSession,
  markProductPageVisited,
  saveVerifiedStoreSession,
  updateProductInStoreSession,
} from '../../lib/publicStoreSessionCache';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { PriceTag } from '../../components/store/PriceTag';
import { recordStoreView } from '../../lib/analytics';
import { ProductCard } from '../../components/store/ProductCard';
import { ProductBadgesOverlay } from '../../components/products/ProductBadges';
import { ProductCollapsibleDetails } from '../../components/products/ProductCollapsibleDetails';
import { WhatsAppIcon } from '../../components/store/SocialIcons';
import { CatalogInactiveView } from '../../components/store/CatalogInactiveView';
import type { CartItem, PublicCatalog, PublicProduct } from '../../types/store';

const CATALOG_SELECT =
  'id, slug, name, slogan, description, user_id, is_active, is_public, inactive_reason, reopen_at, logo_url, cover_url, primary_color, background_color, surface_color, text_color, title_color, follow_code, footer_address, footer_phone, footer_email, footer_schedule, footer_instagram, footer_facebook, min_order_amount, min_order_currency, usd_to_cup_rate, cup_to_usd_rate, display_currency, share_template, enable_affiliates, commission_type, commission_value, min_payout_amount, catalog_type, is_blocked, blocked_reason';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ProductRouteState {
  fromStore?: boolean;
  fromRelated?: boolean;
  catalog?: PublicCatalog;
  product?: PublicProduct;
  vendorPhone?: string;
  vendorPlan?: string;
}

const isUsableCatalog = (cat?: PublicCatalog | null): cat is PublicCatalog =>
  Boolean(cat && cat.is_active !== false && cat.is_public !== false && !cat.is_blocked);

export const PublicProductPage: React.FC = () => {
  const { slug, productId } = useParams<{ slug: string; productId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { settings, getAppUrl } = useSystemSettings();
  const { myAffiliation, checkAffiliateStatus, registerPendingCommission } = useCommissions();

  const navState = (location.state as ProductRouteState | null) ?? null;
  const initialSessionEntry = slug ? getVerifiedStoreSession(slug) : null;
  const canHydrateFromNavOrStore = Boolean(
    initialSessionEntry?.productsComplete ||
      navState?.fromStore ||
      (productId && navState?.product?.id === productId)
  );
  const initialCatalog = canHydrateFromNavOrStore
    ? isUsableCatalog(initialSessionEntry?.catalog)
      ? initialSessionEntry!.catalog
      : isUsableCatalog(navState?.catalog) &&
          (!slug ||
            !navState?.catalog?.slug ||
            navState.catalog.slug === slug ||
            navState.catalog.id === slug)
        ? navState!.catalog!
        : null
    : null;
  const initialProduct =
    initialCatalog && productId
      ? navState?.product?.id === productId
        ? navState.product
        : initialSessionEntry?.products.find((p) => p.id === productId) ?? null
      : null;
  const initialRelated =
    initialProduct && initialSessionEntry?.products.length
      ? computeRelatedProductsFromList(initialSessionEntry.products, initialProduct)
      : [];

  const [catalog, setCatalog] = useState<PublicCatalog | null>(() => initialCatalog);
  const [product, setProduct] = useState<PublicProduct | null>(() => initialProduct);
  const [relatedProducts, setRelatedProducts] = useState<PublicProduct[]>(() => initialRelated);
  const [vendorPhone, setVendorPhone] = useState<string>(
    () => initialSessionEntry?.vendorPhone || navState?.vendorPhone || initialCatalog?.footer_phone || ''
  );
  const [vendorPlan, setVendorPlan] = useState<string>(
    () => initialSessionEntry?.vendorPlan || navState?.vendorPlan || 'free'
  );
  const [loading, setLoading] = useState(() => !(initialCatalog && initialProduct));
  const [error, setError] = useState<string | null>(null);

  const [quantity, setQuantity] = useState(1);
  const [copiedLink, setCopiedLink] = useState(false);
  const [shortProductUrl, setShortProductUrl] = useState('');
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [showOrderSuccess, setShowOrderSuccess] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const isMarketplace = Boolean(
    catalog?.catalog_type === 'marketplace' ||
    (catalog?.name && /naz+a+r/i.test(catalog.name)) ||
    (catalog?.slug && /naz+a+r/i.test(catalog.slug))
  );
  const isProductOwner = Boolean(
    user?.phone && product?.contact_phone && isSamePhone(user.phone, product.contact_phone)
  );

  const handleToggleStock = async () => {
    if (!product) return;
    const nextStatus = !product.is_out_of_stock;
    const success = await toggleMarketplaceStock(product.id, nextStatus);
    if (success) {
      const nextStockStatus = nextStatus ? 'out_of_stock' : 'available';
      setProduct(prev => prev ? {
        ...prev,
        is_out_of_stock: nextStatus,
        stock_status: nextStockStatus
      } : null);
      if (slug || catalog?.id) {
        updateProductInStoreSession(slug || catalog!.id, product.id, {
          is_out_of_stock: nextStatus,
          stock_status: nextStockStatus,
        });
      }
      toast.success(nextStatus ? 'Producto marcado como agotado' : 'Producto disponible');
    } else {
      toast.error('No se pudo cambiar el estado');
    }
  };

  const handleProductUpdated = (updated: Partial<PublicProduct>) => {
    setProduct(prev => prev ? { ...prev, ...updated } : null);
    if (product?.id && (slug || catalog?.id)) {
      updateProductInStoreSession(slug || catalog!.id, product.id, updated);
    }
    toast.success('Publicación actualizada');
  };

  // Formulario de pedido directo (recordado en el dispositivo)
  const [customerName, setCustomerName] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('matum_buyer_info') || '{}').name || '';
    } catch {
      return '';
    }
  });
  const [customerPhone, setCustomerPhone] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('matum_buyer_info') || '{}').phone || '';
    } catch {
      return '';
    }
  });
  const [customerAddress, setCustomerAddress] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('matum_buyer_info') || '{}').address || '';
    } catch {
      return '';
    }
  });

  // Carrito persistido por tienda
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

  const { themeStyles } = useStoreTheme(catalog, {
    styleId: 'theme-dynamic-styles-product',
  });

  const persistCartNow = (nextCart: CartItem[]) => {
    if (!slug) return;
    try {
      localStorage.setItem(`matum_cart_${slug}`, JSON.stringify(nextCart));
    } catch (e) {
      console.warn('Error saving cart to localStorage', e);
    }
  };

  useEffect(() => {
    persistCartNow(cart);
  }, [cart, slug]);

  // Subir al inicio al abrir o cambiar de producto sin parpadeo
  useLayoutEffect(() => {
    if (
      typeof window !== 'undefined' &&
      typeof window.scrollTo === 'function' &&
      !/jsdom/i.test(typeof navigator !== 'undefined' ? navigator.userAgent : '')
    ) {
      try {
        window.scrollTo(0, 0);
      } catch {
        // Ignorar en entornos sin scrollTo
      }
    }
  }, [productId]);

  // Marcar visita a ficha de producto para habilitar retorno instantáneo a la tienda
  useEffect(() => {
    if (slug && catalog && !catalog.is_blocked && catalog.is_public !== false) {
      markProductPageVisited(slug);
    }
  }, [slug, catalog]);

  // Precargar chunk de la tienda si el usuario entró directo por enlace al producto
  useEffect(() => {
    const timer = setTimeout(() => {
      void import('./PublicCatalogPage').catch(() => {});
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  // Capturar código de afiliado desde ?ref=...
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(location.search);
      const refParam = searchParams.get('ref');
      if (refParam) {
        localStorage.setItem('matum_active_ref', refParam);
        if (slug) localStorage.setItem(`matum_ref_${slug}`, refParam);
      }
    } catch (e) {
      console.warn('Could not save referral code to localStorage', e);
    }
  }, [location.search, slug]);

  // Cargar catálogo y producto
  useEffect(() => {
    const getBlockedErrorMessage = (cat: { blocked_reason?: string | null }) =>
      cat.blocked_reason
        ? `Catálogo suspendido: ${cat.blocked_reason}`
        : 'Este catálogo ha sido bloqueado o suspendido por la administración.';

    const fetchData = async () => {
      if (!slug || !productId) return;
      setError(null);

      const currentSession = getVerifiedStoreSession(slug);
      const currentNavState = (location.state as ProductRouteState | null) ?? null;
      const canHydrateEffect = Boolean(
        currentSession?.productsComplete ||
          currentNavState?.fromStore ||
          currentNavState?.product?.id === productId
      );

      const hydratedCatalog = canHydrateEffect
        ? isUsableCatalog(currentSession?.catalog)
          ? currentSession!.catalog
          : isUsableCatalog(currentNavState?.catalog) &&
              (!currentNavState?.catalog?.slug ||
                currentNavState.catalog.slug === slug ||
                currentNavState.catalog.id === slug)
            ? currentNavState!.catalog!
            : null
        : null;

      const hydratedProduct = hydratedCatalog
        ? currentNavState?.product?.id === productId
          ? currentNavState.product
          : currentSession?.products.find((p) => p.id === productId) ?? null
        : null;

      const hydratedRelated =
        hydratedProduct && currentSession?.products.length
          ? computeRelatedProductsFromList(currentSession.products, hydratedProduct)
          : [];

      const hasHydratedView = Boolean(hydratedCatalog && hydratedProduct);

      if (hasHydratedView) {
        setCatalog(hydratedCatalog);
        setProduct(hydratedProduct);
        setRelatedProducts(hydratedRelated);
        setVendorPhone(
          currentSession?.vendorPhone ||
            currentNavState?.vendorPhone ||
            hydratedCatalog?.footer_phone ||
            ''
        );
        setVendorPlan(
          currentSession?.vendorPlan || currentNavState?.vendorPlan || 'free'
        );
        setQuantity(1);
        setLoading(false);
        markProductPageVisited(slug);

        if (
          currentSession?.productsComplete &&
          Date.now() - currentSession.productsFetchedAt < PRODUCTS_FRESH_TTL_MS &&
          !isOffline()
        ) {
          return;
        }
      }

      const cachedCat = hasHydratedView ? null : await getCatalogFromCache(slug);
      let cachedProd: any = null;
      if (cachedCat) {
        const cachedProds = await getCatalogProductsFromCache(cachedCat.id);
        cachedProd = cachedProds?.find((p: any) => p.id === productId) || null;
      }

      if (isOffline()) {
        if (hasHydratedView) return;
        if (!cachedCat || !cachedProd) {
          setError('Sin conexión. Este producto aún no está guardado en el dispositivo.');
        } else if (cachedCat.is_blocked) {
          setCatalog(null);
          setProduct(null);
          setError(getBlockedErrorMessage(cachedCat));
        } else if (cachedCat.is_active === false) {
          setCatalog(null);
          setProduct(null);
          setError('Tienda no disponible o inactiva.');
        } else {
          setCatalog(cachedCat);
          setProduct(cachedProd);
          setVendorPhone(cachedCat._vendorInfo?.vendorPhone || cachedCat.footer_phone || '');
          setVendorPlan(cachedCat._vendorInfo?.vendorPlan || 'free');
        }
        setLoading(false);
        return;
      }

      if (!hasHydratedView) {
        setLoading(true);
      }

      try {
        let { data: catData, error: catError } = await supabase
          .from('catalogs')
          .select(CATALOG_SELECT)
          .eq('slug', slug)
          .maybeSingle();

        if (!catData && UUID_RE.test(slug)) {
          const { data: catById } = await supabase
            .from('catalogs')
            .select(CATALOG_SELECT)
            .eq('id', slug)
            .maybeSingle();
          catData = catById;
        }

        if (catError) throw catError;

        if (catData?.is_blocked) {
          saveVerifiedStoreSession(slug, { catalog: catData });
          await saveCatalogToCache({ ...catData, slug: (catData as any).slug || slug });
          setCatalog(null);
          setProduct(null);
          setError(getBlockedErrorMessage(catData));
          setLoading(false);
          return;
        }

        if (!catData || !catData.is_public) {
          if (catData) {
            saveVerifiedStoreSession(slug, { catalog: catData });
            await saveCatalogToCache({ ...catData, slug: (catData as any).slug || slug });
          }
          setCatalog(null);
          setProduct(null);
          setError('Tienda no disponible o inactiva.');
          setLoading(false);
          return;
        }

        if (!catData.is_active) {
          saveVerifiedStoreSession(slug, { catalog: catData });
          await saveCatalogToCache({ ...catData, slug: (catData as any).slug || slug });
          setCatalog(catData);
          setProduct(null);
          setError(null);
          setLoading(false);
          return;
        }

        setCatalog(catData);
        if (!hasHydratedView && cachedProd && cachedCat?.id === catData.id) {
          setProduct(cachedProd);
          setVendorPhone(cachedCat._vendorInfo?.vendorPhone || catData.footer_phone || '');
          setVendorPlan(cachedCat._vendorInfo?.vendorPlan || 'free');
          setLoading(false);
        }

        const [prodResult, relatedResult, userResult] = await Promise.all([
          supabase
            .from('products')
            .select(
              'id, catalog_id, name, description, price, currency, price_cup, price_usd, imagen_url, is_out_of_stock, stock_status, category_id, commission_amount, commission_currency, delivery_cost, delivery_currency, delivery_time_value, delivery_time_unit, is_active, contact_phone, sender_name, is_featured, badges, details_and_dimensions, care_and_maintenance'
            )
            .eq('id', productId)
            .eq('catalog_id', catData.id)
            .maybeSingle(),
          supabase
            .from('products')
            .select(
              'id, catalog_id, name, description, price, currency, price_cup, price_usd, imagen_url, is_out_of_stock, stock_status, category_id, commission_amount, commission_currency, delivery_cost, delivery_currency, delivery_time_value, delivery_time_unit, is_active, position, contact_phone, sender_name, is_featured, badges, details_and_dimensions, care_and_maintenance'
            )
            .eq('catalog_id', catData.id)
            .eq('is_active', true)
            .neq('id', productId)
            .order('is_featured', { ascending: false })
            .order('position', { ascending: true })
            .limit(8),
          supabase.from('users').select('phone, plan').eq('id', catData.user_id).maybeSingle(),
        ]);

        if (prodResult.error) throw prodResult.error;

        if (!prodResult.data || !prodResult.data.is_active) {
          if (!cachedProd && !hasHydratedView) {
            setError('El producto no está disponible o no existe.');
          }
          setLoading(false);
          return;
        }

        const vPhone = userResult.data?.phone || catData.footer_phone || '';
        const vPlan = userResult.data?.plan || 'free';

        const currentProd = prodResult.data;
        const availableRelated = (relatedResult.data || [])
          .filter(p => !p.is_out_of_stock && p.stock_status !== 'out_of_stock')
          .sort((a, b) => {
            const sameCatA = a.category_id && a.category_id === currentProd.category_id ? 0 : 1;
            const sameCatB = b.category_id && b.category_id === currentProd.category_id ? 0 : 1;
            return sameCatA - sameCatB;
          })
          .slice(0, 4);

        setProduct(currentProd);
        setRelatedProducts(availableRelated);
        setVendorPhone(vPhone);
        setVendorPlan(vPlan);

        saveVerifiedStoreSession(slug, {
          catalog: catData,
          products: [currentProd, ...availableRelated],
          productsComplete: currentSession?.productsComplete ?? false,
          vendorPhone: vPhone,
          vendorPlan: vPlan,
        });
        markProductPageVisited(slug);

        void saveCatalogToCache(
          { ...catData, slug: (catData as any).slug || slug },
          { vendorPhone: vPhone, vendorPlan: vPlan }
        );
        void upsertCatalogProductsInCache(catData.id, [prodResult.data], {
          prefetchImages: false,
        });
      } catch (err: any) {
        console.error('Error fetching product data:', err);
        if (hasHydratedView) {
          return;
        }
        if (cachedCat && cachedProd && isNetworkError(err)) {
          if (cachedCat.is_blocked) {
            setCatalog(null);
            setProduct(null);
            setError(getBlockedErrorMessage(cachedCat));
          } else if (cachedCat.is_active === false) {
            setCatalog(null);
            setProduct(null);
            setError('Tienda no disponible o inactiva.');
          } else {
            setCatalog(cachedCat);
            setProduct(cachedProd);
            setVendorPhone(cachedCat._vendorInfo?.vendorPhone || cachedCat.footer_phone || '');
            setVendorPlan(cachedCat._vendorInfo?.vendorPlan || 'free');
          }
        } else {
          setCatalog(null);
          setProduct(null);
          setError(
            isNetworkError(err)
              ? 'Sin conexión. Este producto aún no está guardado en el dispositivo.'
              : 'Ocurrió un error al cargar el producto.'
          );
        }
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [slug, productId]);

  useEffect(() => {
    if (catalog?.id && user?.id && !isOffline()) {
      checkAffiliateStatus(catalog.id, user.id);
    }
  }, [catalog?.id, user?.id, checkAffiliateStatus]);

  // Registrar vista del producto y la tienda en analytics
  useEffect(() => {
    if (!catalog?.id || !product?.id) return;
    try {
      const searchParams = new URLSearchParams(location.search);
      const activeRef =
        searchParams.get('ref') ||
        (slug ? localStorage.getItem(`matum_ref_${slug}`) : null) ||
        localStorage.getItem('matum_active_ref');

      recordStoreView({
        catalogId: catalog.id,
        productId: product.id,
        referralCode: activeRef || undefined,
      });
    } catch (e) {
      console.warn('Error recording product view', e);
    }
  }, [catalog?.id, product?.id, slug, location.search]);

  const isApprovedAffiliate = myAffiliation?.status === 'approved';
  const isCatalogOwner = !!user && catalog?.user_id === user?.id;
  const canSeeCommissions = isApprovedAffiliate || isCatalogOwner;

  useEffect(() => {
    if (!product || !catalog) return;
    const isOut = product.is_out_of_stock || product.stock_status === 'out_of_stock';
    return applyStoreSeo({
      title: `${product.name} · ${catalog.name}`,
      description:
        product.description || `Disponible en ${catalog.name}. Haz tu pedido por WhatsApp.`,
      image: product.imagen_url || catalog.logo_url || catalog.cover_url,
      url: getCurrentPublicUrl(settings.app_url) || undefined,
      type: 'product',
      jsonLd: {
        '@type': 'Product',
        name: product.name,
        description: product.description || undefined,
        image: product.imagen_url || undefined,
        offers:
          product.price !== null
            ? {
                '@type': 'Offer',
                price: product.price,
                priceCurrency: product.currency || 'CUP',
                availability: isOut
                  ? 'https://schema.org/OutOfStock'
                  : 'https://schema.org/InStock',
              }
            : undefined,
      },
    });
  }, [product, catalog, settings.app_url]);

  const pricingCtx = useMemo(() => buildPricingContext(catalog, vendorPlan), [catalog, vendorPlan]);
  const unitPriceParts = useMemo(
    () => (product ? getPriceParts(product, pricingCtx, 1) : null),
    [product, pricingCtx]
  );
  const subtotalParts = useMemo(
    () => (product ? getPriceParts(product, pricingCtx, quantity) : null),
    [product, pricingCtx, quantity]
  );

  const shareAffiliateCode =
    (isApprovedAffiliate && user?.referral_code) || user?.referral_code || null;

  const productShareUrl = useMemo(() => {
    if (!slug || !product) return '';
    const baseUrl = getAppUrl();
    const affiliateParam = shareAffiliateCode ? `?ref=${shareAffiliateCode}` : '';
    return `${baseUrl}/${slug}/p/${product.id}${affiliateParam}`;
  }, [slug, product, shareAffiliateCode, getAppUrl]);

  const storeShareUrl = useMemo(() => {
    if (!slug) return '';
    const baseUrl = getAppUrl();
    const affiliateParam = shareAffiliateCode ? `?ref=${shareAffiliateCode}` : '';
    return `${baseUrl}/${slug}${affiliateParam}`;
  }, [slug, shareAffiliateCode, getAppUrl]);

  useEffect(() => {
    if (loading || !catalog?.id || !product?.id || !slug) {
      if (!catalog?.id || !product?.id || !slug) {
        setShortProductUrl('');
      }
      return;
    }

    let cancelled = false;
    const baseUrl = getAppUrl();
    const cached = getCachedShortUrl({
      baseUrl,
      catalogId: catalog.id,
      productId: product.id,
      referralCode: shareAffiliateCode,
    });

    if (cached) {
      setShortProductUrl(cached);
    } else {
      setShortProductUrl('');
    }

    const timer = setTimeout(() => {
      if (cancelled) return;

      if (!cached) {
        void getOrCreateShortLink({
          baseUrl,
          catalogId: catalog.id,
          productId: product.id,
          referralCode: shareAffiliateCode,
          fallbackUrl: productShareUrl,
        }).then((resolved) => {
          if (!cancelled && resolved && resolved !== productShareUrl) {
            setShortProductUrl(resolved);
          }
        });
      }

      try {
        const activeRef =
          localStorage.getItem(`matum_ref_${slug}`) ||
          localStorage.getItem('matum_active_ref');
        if (activeRef && activeRef !== (shareAffiliateCode || '')) {
          const activeFallback = `${baseUrl}/${slug}/p/${product.id}?ref=${activeRef}`;
          void getOrCreateShortLink({
            baseUrl,
            catalogId: catalog.id,
            productId: product.id,
            referralCode: activeRef,
            fallbackUrl: activeFallback,
          });
        }
      } catch {
        // Ignorar errores de almacenamiento
      }
    }, 50);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [loading, catalog?.id, product?.id, slug, shareAffiliateCode, productShareUrl, getAppUrl]);

  const handleShareProduct = async () => {
    if (!product || !catalog) return;

    const baseUrl = getAppUrl();
    const resolvedProductUrl = shareTemplateUsesProductUrl(catalog.share_template)
      ? shortProductUrl ||
        (await getOrCreateShortLink({
          baseUrl,
          catalogId: catalog.id,
          productId: product.id,
          referralCode: shareAffiliateCode,
          fallbackUrl: productShareUrl,
        }))
      : productShareUrl;

    const priceText = getPriceText(product, pricingCtx);
    const text = formatProductShareText({
      shareTemplate: catalog.share_template,
      productName: product.name,
      productDescription: product.description,
      priceText,
      currencyText: '',
      catalogName: catalog.name,
      contactNumber: vendorPhone,
      productUrl: resolvedProductUrl,
      storeUrl: storeShareUrl,
    });

    await shareContent({
      title: product.name,
      text,
      imageUrl: product.imagen_url || undefined,
    });
  };

  const handleCopyLink = async () => {
    if (!productShareUrl) return;
    try {
      const urlToCopy =
        shortProductUrl ||
        (catalog?.id && product?.id
          ? await getOrCreateShortLink({
              baseUrl: getAppUrl(),
              catalogId: catalog.id,
              productId: product.id,
              referralCode: shareAffiliateCode,
              fallbackUrl: productShareUrl,
            })
          : productShareUrl);
      await navigator.clipboard.writeText(urlToCopy);
      setCopiedLink(true);
      toast.success(
        isApprovedAffiliate ? 'Enlace de afiliado copiado' : 'Enlace del producto copiado'
      );
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      toast.error('No se pudo copiar el enlace.');
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      const nextCart = existing
        ? prev.map(item =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + quantity }
              : item
          )
        : [...prev, { product, quantity }];
      persistCartNow(nextCart);
      return nextCart;
    });
    toast.success(
      `${quantity} ${quantity === 1 ? 'unidad agregada' : 'unidades agregadas'} al pedido`
    );
  };

  const totalCartCount = useMemo(
    () => cart.reduce((acc, item) => acc + item.quantity, 0),
    [cart]
  );

  const handleConfirmOrder = () => {
    if (!product || !catalog) return;

    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error('Por favor, ingresa el nombre y número de teléfono de la persona que recibe.');
      return;
    }

    const priceText = getPriceText(product, pricingCtx);
    const unitPrice = Number(product.price) || 0;
    const totalPrice = unitPrice * quantity;

    const activeRef =
      (slug ? localStorage.getItem(`matum_ref_${slug}`) : null) ||
      localStorage.getItem('matum_active_ref');
    const orderRef = 'ORD-' + Math.random().toString(36).substring(2, 7).toUpperCase();

    let messageText = `🛍️ *Nuevo Pedido - Nazaar*\n`;
    messageText += `━━━━━━━━━━━━━━━━━━━━\n`;
    messageText += `*Tienda:* ${catalog.name}\n`;
    if (slug) {
      const baseUrl = getAppUrl();
      const refParam = activeRef ? `?ref=${activeRef}` : '';
      const longFallbackUrl = `${baseUrl}/${slug}/p/${product.id}${refParam}`;
      const orderProductUrl =
        getCachedShortUrl({
          baseUrl,
          catalogId: catalog.id,
          productId: product.id,
          referralCode: activeRef,
        }) || longFallbackUrl;
      messageText += `*Enlace del producto:* ${orderProductUrl}\n`;
    }
    messageText += `━━━━━━━━━━━━━━━━━━━━\n`;
    messageText += `👤 *Datos de la persona que recibe:*\n`;
    messageText += `• *Nombre:* ${customerName.trim()}\n`;
    messageText += `• *Teléfono:* ${customerPhone.trim()}\n`;
    if (customerAddress.trim()) {
      messageText += `• *Dirección:* ${customerAddress.trim()}\n`;
    }
    messageText += `━━━━━━━━━━━━━━━━━━━━\n`;
    messageText += `📦 *Detalle del Producto:*\n`;
    messageText += `• ${quantity}x ${product.name}\n`;
    messageText += `  Precio unitario: ${priceText}\n`;
    if (unitPrice > 0) {
      messageText += `  *Subtotal:* ${totalPrice.toLocaleString()} ${product.currency}\n`;
    }
    if (product.delivery_cost !== null && product.delivery_cost !== undefined) {
      const dText = Number(product.delivery_cost) === 0 ? 'Gratis' : `${product.delivery_cost} ${product.delivery_currency || 'CUP'}`;
      messageText += `  *Domicilio:* ${dText}\n`;
    }
    if (product.delivery_time_value !== null && product.delivery_time_value !== undefined) {
      const uText = product.delivery_time_unit === 'days' ? (Number(product.delivery_time_value) === 1 ? 'día' : 'días') : (Number(product.delivery_time_value) === 1 ? 'hora' : 'horas');
      messageText += `  *Tiempo de entrega:* ${product.delivery_time_value} ${uText}\n`;
    }
    messageText += `━━━━━━━━━━━━━━━━━━━━\n`;

    if (activeRef) {
      messageText += `🤝 *Referido por:* @${activeRef}\n`;
      messageText += `🔖 *Ref. Pedido:* ${orderRef}\n`;
      messageText += `━━━━━━━━━━━━━━━━━━━━\n`;

      const commAmount = Number(product.commission_amount) || 0;
      if (catalog.enable_affiliates && commAmount > 0) {
        const commCurrency = product.commission_currency || 'CUP';
        registerPendingCommission({
          catalogId: catalog.id,
          referralCode: activeRef,
          orderRef,
          saleTotal: totalPrice,
          currency: product.currency,
          buyerName: customerName.trim(),
          buyerPhone: customerPhone.trim(),
          commissionCup: commCurrency === 'CUP' ? commAmount * quantity : 0,
          commissionUsd: commCurrency === 'USD' ? commAmount * quantity : 0,
        });
      }
    }

    messageText += `\n¡Hola! Me gustaría confirmar este pedido. ¿Tienen disponibilidad para coordinar la entrega?`;

    try {
      localStorage.setItem(
        'matum_buyer_info',
        JSON.stringify({
          name: customerName.trim(),
          phone: customerPhone.trim(),
          address: customerAddress.trim(),
        })
      );
    } catch {
      // ignore storage errors
    }

    const targetPhone = (isMarketplace && product?.contact_phone)
      ? product.contact_phone
      : (product?.contact_phone || vendorPhone);

    window.open(buildWhatsAppUrl(targetPhone, messageText), '_blank');
    setIsOrderModalOpen(false);
    setShowOrderSuccess(true);
  };

  if (loading) {
    return <LoadingScreen label="Cargando producto…" className="font-store" />;
  }

  if (!error && catalog && catalog.is_active === false && catalog.is_public !== false) {
    return <CatalogInactiveView catalog={catalog} />;
  }

  if (error || !product || !catalog) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center font-store">
        <div className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center text-secondary mb-4">
          <AlertTriangle size={20} />
        </div>
        <h1 className="font-display text-xl font-semibold text-primary mb-1.5">
          {error || 'Producto no encontrado'}
        </h1>
        <p className="text-sm text-secondary max-w-sm mb-6 leading-relaxed">
          Este producto no existe o ya no está disponible en la tienda.
        </p>
        {slug && (
          <Link
            to={`/${slug}${location.search}`}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-xl border border-border bg-surface hover:bg-surface-hover text-primary font-semibold text-sm transition-colors"
          >
            <ArrowLeft size={15} /> Volver a la tienda
          </Link>
        )}
      </div>
    );
  }

  const isOutOfStock = product.is_out_of_stock || product.stock_status === 'out_of_stock';
  const storeUrl = `/${slug}${location.search}`;

  const deliveryCostText =
    product.delivery_cost !== null && product.delivery_cost !== undefined
      ? Number(product.delivery_cost) === 0
        ? 'Gratis'
        : `${product.delivery_cost} ${product.delivery_currency || 'CUP'}`
      : 'A coordinar';

  const deliveryTimeText =
    product.delivery_time_value !== null && product.delivery_time_value !== undefined
      ? `${product.delivery_time_value} ${
          product.delivery_time_unit === 'days'
            ? Number(product.delivery_time_value) === 1 ? 'día' : 'días'
            : Number(product.delivery_time_value) === 1 ? 'hora' : 'horas'
        }`
      : null;

  const primaryBtn =
    'inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] font-semibold transition-colors active:scale-[0.99]';
  const secondaryBtn =
    'inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface hover:bg-surface-hover text-primary font-semibold transition-colors active:scale-[0.99]';
  const iconBtn =
    'w-9 h-9 inline-flex items-center justify-center rounded-full text-secondary hover:text-primary hover:bg-surface transition-colors';

  return (
    <div
      style={themeStyles}
      className="min-h-screen bg-background text-primary pb-24 md:pb-16 font-store selection:bg-accent selection:text-[var(--accent-text)]"
    >
      {/* Barra superior */}
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-lg border-b border-border/60">
        <div className="max-w-5xl mx-auto px-3 sm:px-5 h-14 flex items-center justify-between gap-3">
          <Link
            to={storeUrl}
            onClick={(e) => {
              if (navState?.fromStore && !navState?.fromRelated) {
                e.preventDefault();
                navigate(-1);
              }
            }}
            className="inline-flex items-center gap-2 min-w-0 -ml-1 pl-1 pr-2 py-1 rounded-full hover:bg-surface transition-colors"
            aria-label="Volver a la tienda"
          >
            <ArrowLeft size={18} className="text-secondary flex-shrink-0" />
            {catalog.logo_url ? (
              <img
                src={catalog.logo_url}
                alt=""
                className="w-6 h-6 rounded-full object-cover border border-border/60 flex-shrink-0"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-surface border border-border text-primary flex items-center justify-center text-[11px] font-display font-bold flex-shrink-0">
                {catalog.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="font-display text-sm font-semibold truncate">{catalog.name}</span>
          </Link>

          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              type="button"
              onClick={handleShareProduct}
              className={iconBtn}
              aria-label="Compartir producto"
            >
              <Share2 size={17} />
            </button>
            <Link
              to={storeUrl}
              className={`relative ${iconBtn}`}
              aria-label={`Ver pedido en la tienda (${totalCartCount})`}
            >
              <ShoppingBag size={17} />
              {totalCartCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[var(--accent)] text-[var(--accent-text)] text-[9px] font-bold flex items-center justify-center ring-2 ring-background animate-store-pop">
                  {totalCartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-5 pt-4 sm:pt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 lg:gap-14 md:items-start">
          {/* Imagen */}
          <div className="md:sticky md:top-20">
            <div className="relative aspect-square w-full">
              <div className="w-full h-full rounded-2xl overflow-hidden bg-surface border border-border/60 flex items-center justify-center">
                {product.imagen_url ? (
                  <img
                    src={product.imagen_url}
                    alt={product.name}
                    fetchPriority="high"
                    className={`w-full h-full object-cover ${isOutOfStock ? 'opacity-60 grayscale' : ''}`}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 text-secondary/70">
                    <ShoppingBag size={36} strokeWidth={1.25} />
                    <span className="text-xs">Sin imagen</span>
                  </div>
                )}

                {isOutOfStock && (
                  <span className="absolute top-3 left-3 bg-background/95 border border-border text-primary text-xs font-semibold px-2.5 py-1 rounded-md">
                    Agotado
                  </span>
                )}
              </div>

              <ProductBadgesOverlay
                badges={product.badges}
                isFeatured={product.is_featured}
                size="md"
                className="-top-1.5 right-4"
              />
            </div>
          </div>

          {/* Información */}
          <div className="flex flex-col">
            {isMarketplace && product.sender_name && (
              <p className="text-xs text-secondary mb-1.5">
                Publicado por <span className="text-primary font-medium">{product.sender_name}</span>
              </p>
            )}

            <h1 className="font-display text-3xl sm:text-4xl font-bold text-primary tracking-tight leading-tight">
              {product.name}
            </h1>

            <div className="mt-3">
              <PriceTag
                parts={unitPriceParts}
                stacked
                className="font-display text-[1.75rem] sm:text-[2.25rem] leading-[1.15] font-extrabold text-primary tracking-tight"
                secondaryClassName="text-base sm:text-lg font-medium text-secondary mt-1"
              />
            </div>

            {/* Ganancia de promotor (afiliados / dueño) */}
            {canSeeCommissions && (product.commission_amount ?? 0) > 0 && (
              <div className="mt-5 flex items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-surface/60">
                <div className="min-w-0">
                  <p className="text-xs text-secondary">Tu ganancia por venta</p>
                  <p className="text-base font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    +{product.commission_amount} {product.commission_currency || 'CUP'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`${secondaryBtn} h-9 px-3.5 text-xs flex-shrink-0`}
                >
                  {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                  {copiedLink ? 'Copiado' : 'Copiar mi enlace'}
                </button>
              </div>
            )}

            <div className="mt-6 border-t border-border/60" />

            {/* Compra */}
            {isOutOfStock ? (
              <p className="mt-6 text-sm text-secondary">
                Este producto está agotado temporalmente.
              </p>
            ) : (
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-secondary">Cantidad</span>
                  <div className="flex items-center gap-3">
                    {quantity > 1 && subtotalParts && (
                      <span className="text-sm sm:text-base text-secondary">
                        Total{' '}
                        <PriceTag
                          parts={subtotalParts}
                          className="text-base sm:text-lg font-bold text-primary"
                          secondaryClassName="hidden"
                        />
                      </span>
                    )}
                    <div className="inline-flex items-center h-10 rounded-xl border border-border">
                      <button
                        type="button"
                        onClick={() => setQuantity(q => Math.max(1, q - 1))}
                        disabled={quantity <= 1}
                        className="w-10 h-full flex items-center justify-center text-secondary hover:text-primary transition-colors disabled:opacity-30"
                        aria-label="Restar unidad"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center font-semibold text-sm tabular-nums">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity(q => q + 1)}
                        className="w-10 h-full flex items-center justify-center text-secondary hover:text-primary transition-colors"
                        aria-label="Sumar unidad"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Acciones (escritorio) */}
                <div className={`hidden md:grid gap-2.5 ${isMarketplace ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {!isMarketplace && (
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      className={`${primaryBtn} h-12 px-5 text-sm`}
                    >
                      <ShoppingBag size={16} /> Agregar al pedido
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsOrderModalOpen(true)}
                    className={`${isMarketplace ? primaryBtn : secondaryBtn} h-12 px-5 text-sm`}
                  >
                    <WhatsAppIcon size={16} /> {isMarketplace ? 'Contactar por WhatsApp' : 'Pedir por WhatsApp'}
                  </button>
                </div>
              </div>
            )}

            {/* Panel del dueño de la publicación (Marketplace) */}
            {isProductOwner && (
              <div className="mt-5 p-3.5 rounded-xl border border-border bg-surface/60 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-primary">Tu publicación</span>
                  <span className="text-xs text-secondary tabular-nums">{product.contact_phone}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleToggleStock}
                    className={`${secondaryBtn} h-10 px-3 text-xs`}
                  >
                    {isOutOfStock ? 'Marcar disponible' : 'Marcar agotado'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                    className={`${secondaryBtn} h-10 px-3 text-xs`}
                  >
                    Editar publicación
                  </button>
                </div>
              </div>
            )}

            {/* Entrega */}
            <dl className="mt-6 divide-y divide-border/60 border-y border-border/60 text-sm">
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="flex items-center gap-2.5 text-secondary">
                  <Truck size={16} className="flex-shrink-0" /> Domicilio
                </dt>
                <dd className="font-medium text-primary text-right">{deliveryCostText}</dd>
              </div>
              {deliveryTimeText && (
                <div className="flex items-center justify-between gap-4 py-3">
                  <dt className="flex items-center gap-2.5 text-secondary">
                    <Clock size={16} className="flex-shrink-0" /> Tiempo de entrega
                  </dt>
                  <dd className="font-medium text-primary text-right">{deliveryTimeText}</dd>
                </div>
              )}
            </dl>

            {/* Descripción, detalles y cuidado */}
            <ProductCollapsibleDetails
              className="mt-2"
              description={product.description}
              detailsAndDimensions={product.details_and_dimensions}
              careAndMaintenance={product.care_and_maintenance}
              defaultOpen={{ description: true, details: false, care: false }}
            />
          </div>
        </div>

        {/* Productos relacionados */}
        {relatedProducts.length > 0 && (
          <section className="mt-14 pt-8 border-t border-border/60">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-xl font-semibold text-primary">
                También te puede gustar
              </h2>
              <Link
                to={storeUrl}
                className="text-sm font-medium text-secondary hover:text-primary inline-flex items-center gap-0.5 transition-colors"
              >
                Ver todo <ChevronRight size={15} />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {relatedProducts.map(rel => {
                const relQty =
                  cart.find(item => item.product.id === rel.id)?.quantity ?? 0;
                return (
                  <ProductCard
                    key={rel.id}
                    product={rel}
                    quantity={relQty}
                    price={getPriceParts(rel, pricingCtx)}
                    showCommission={canSeeCommissions}
                    isMarketplace={isMarketplace}
                    onOpen={() =>
                      navigate(`/${slug}/p/${rel.id}${location.search}`, {
                        state: {
                          fromStore: navState?.fromStore,
                          fromRelated: true,
                          catalog,
                          product: rel,
                          vendorPhone,
                          vendorPlan,
                        },
                      })
                    }
                    onAdd={() =>
                      setCart(prev => {
                        const existing = prev.find(i => i.product.id === rel.id);
                        const nextCart = existing
                          ? prev.map(i =>
                              i.product.id === rel.id ? { ...i, quantity: i.quantity + 1 } : i
                            )
                          : [...prev, { product: rel, quantity: 1 }];
                        persistCartNow(nextCart);
                        return nextCart;
                      })
                    }
                    onRemove={() =>
                      setCart(prev => {
                        const existing = prev.find(i => i.product.id === rel.id);
                        if (!existing) return prev;
                        const nextCart =
                          existing.quantity === 1
                            ? prev.filter(i => i.product.id !== rel.id)
                            : prev.map(i =>
                                i.product.id === rel.id ? { ...i, quantity: i.quantity - 1 } : i
                              );
                        persistCartNow(nextCart);
                        return nextCart;
                      })
                    }
                    onShare={async e => {
                      e.stopPropagation();
                      const baseUrl = getAppUrl();
                      const urlRef = new URLSearchParams(location.search).get('ref');
                      const effectiveRef = shareAffiliateCode || urlRef;
                      const refParam = effectiveRef
                        ? `?ref=${effectiveRef}`
                        : (location.search || '');
                      const longRelProductUrl = slug ? `${baseUrl}/${slug}/p/${rel.id}${refParam}` : '';
                      const relStoreUrl = slug ? `${baseUrl}/${slug}${refParam}` : '';
                      const relProductUrl =
                        slug && catalog.id && shareTemplateUsesProductUrl(catalog.share_template)
                          ? await getOrCreateShortLink({
                              baseUrl,
                              catalogId: catalog.id,
                              productId: rel.id,
                              referralCode: effectiveRef,
                              fallbackUrl: longRelProductUrl,
                            })
                          : longRelProductUrl;
                      const text = formatProductShareText({
                        shareTemplate: catalog.share_template,
                        productName: rel.name,
                        productDescription: rel.description,
                        priceText: getPriceText(rel, pricingCtx),
                        currencyText: '',
                        catalogName: catalog.name,
                        contactNumber: vendorPhone,
                        productUrl: relProductUrl,
                        storeUrl: relStoreUrl,
                      });
                      await shareContent({
                        title: rel.name,
                        text,
                        imageUrl: rel.imagen_url || undefined,
                      });
                    }}
                  />
                );
              })}
            </div>
          </section>
        )}
      </main>

      {/* Barra inferior de compra (móvil) */}
      {!isOutOfStock && (
        <div className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur-lg border-t border-border/60 px-3 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] flex gap-2">
          {!isMarketplace && (
            <button
              type="button"
              onClick={handleAddToCart}
              className={`${primaryBtn} flex-1 h-11 px-3 text-sm`}
            >
              <ShoppingBag size={16} /> Agregar
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOrderModalOpen(true)}
            className={`${isMarketplace ? primaryBtn : secondaryBtn} flex-1 h-11 px-3 text-sm`}
          >
            <WhatsAppIcon size={16} /> WhatsApp
          </button>
        </div>
      )}

      {/* Modal para confirmar pedido directo por WhatsApp */}
      <Modal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        title="Datos de la persona que recibe el producto"
      >
        <div className="space-y-3.5 font-store">
          <div className="p-3 rounded-xl bg-surface border border-border">
            <p className="text-xs font-bold text-primary">{product.name}</p>
            <p className="text-[11px] text-secondary mt-0.5">
              Cantidad: {quantity} · Total: {getPriceText(product, pricingCtx, quantity)}
            </p>
          </div>

          <p className="text-xs text-secondary leading-relaxed">
            Ingresa los datos de la persona que recibe el producto para coordinar la entrega y el pago directamente por WhatsApp:
          </p>

          <div className="space-y-3">
            <Input
              label="Nombre de la persona que recibe *"
              placeholder="Ej. Juan Pérez"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
            />
            <Input
              label="Teléfono de quien recibe *"
              placeholder="Ej. 52345678"
              type="tel"
              value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value)}
            />
            <Input
              label="Dirección de entrega (opcional)"
              placeholder="Ej. Calle 23 entre G y H, Vedado"
              value={customerAddress}
              onChange={e => setCustomerAddress(e.target.value)}
            />
          </div>

          <div className="flex gap-2.5 pt-2">
            <Button
              variant="ghost"
              onClick={() => setIsOrderModalOpen(false)}
              className="flex-1 rounded-xl"
            >
              Cancelar
            </Button>
            <button
              type="button"
              onClick={handleConfirmOrder}
              className={`${primaryBtn} flex-1 h-10 px-4 text-sm`}
            >
              <WhatsAppIcon size={15} /> Enviar pedido
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showOrderSuccess}
        onClose={() => setShowOrderSuccess(false)}
        title="Pedido enviado"
      >
        <div className="text-center py-4 space-y-3 font-store">
          <div className="w-12 h-12 rounded-full bg-surface border border-border text-primary flex items-center justify-center mx-auto">
            <Check size={22} />
          </div>
          <h3 className="font-display text-base font-bold text-primary">
            Tu mensaje se abrió en WhatsApp
          </h3>
          <p className="text-xs text-secondary max-w-sm mx-auto leading-relaxed">
            Completa el envío del mensaje en WhatsApp para coordinar el pago y la entrega con la tienda.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              to={`/${slug}${location.search}`}
              className={`${primaryBtn} w-full h-10 text-sm`}
            >
              Seguir explorando la tienda
            </Link>
            <Button
              variant="ghost"
              onClick={() => setShowOrderSuccess(false)}
              className="w-full rounded-xl"
            >
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>

      {product && isEditModalOpen && (
        <MarketplaceProductEditModal
          product={product}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSaved={handleProductUpdated}
        />
      )}
    </div>
  );
};