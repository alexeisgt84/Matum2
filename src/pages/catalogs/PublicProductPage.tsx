import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  ArrowLeft,
  Share2,
  Copy,
  Check,
  Coins,
  Plus,
  Minus,
  AlertTriangle,
  Store,
  ChevronRight,
  Truck,
  Clock,
  Sparkles,
  Star,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useCommissions } from '../../hooks/useCommissions';
import { useStoreTheme } from '../../hooks/useStoreTheme';
import { shareContent } from '../../lib/share';
import {
  buildPricingContext,
  getPriceParts,
  getPriceText,
} from '../../lib/pricing';
import { buildWhatsAppUrl, isSamePhone } from '../../lib/whatsapp';
import { toggleMarketplaceStock } from '../../lib/marketplace';
import { MarketplaceProductEditModal } from '../../components/store/MarketplaceProductEditModal';
import { applyStoreSeo } from '../../lib/seo';
import {
  isOffline,
  isNetworkError,
  getCatalogFromCache,
  saveCatalogToCache,
  getCatalogProductsFromCache,
  upsertCatalogProductsInCache,
} from '../../lib/offlineCache';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { PriceTag } from '../../components/store/PriceTag';
import { recordStoreView } from '../../lib/analytics';
import { ProductCard } from '../../components/store/ProductCard';
import { WhatsAppIcon } from '../../components/store/SocialIcons';
import type { CartItem, PublicCatalog, PublicProduct } from '../../types/store';

const CATALOG_SELECT =
  'id, slug, name, slogan, description, user_id, is_active, is_public, logo_url, cover_url, primary_color, background_color, surface_color, text_color, title_color, follow_code, footer_address, footer_phone, footer_email, footer_schedule, usd_to_cup_rate, cup_to_usd_rate, display_currency, share_template, enable_affiliates, catalog_type';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const PublicProductPage: React.FC = () => {
  const { slug, productId } = useParams<{ slug: string; productId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { myAffiliation, checkAffiliateStatus, registerPendingCommission } = useCommissions();

  const [catalog, setCatalog] = useState<PublicCatalog | null>(null);
  const [product, setProduct] = useState<PublicProduct | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<PublicProduct[]>([]);
  const [vendorPhone, setVendorPhone] = useState<string>('');
  const [vendorPlan, setVendorPlan] = useState<string>('free');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [quantity, setQuantity] = useState(1);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [showOrderSuccess, setShowOrderSuccess] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const isMarketplace = Boolean(
    catalog?.catalog_type === 'marketplace' ||
    (catalog?.name && /naza+r/i.test(catalog.name)) ||
    (catalog?.slug && /naza+r/i.test(catalog.slug))
  );
  const isProductOwner = Boolean(
    user?.phone && product?.contact_phone && isSamePhone(user.phone, product.contact_phone)
  );

  const handleToggleStock = async () => {
    if (!product) return;
    const nextStatus = !product.is_out_of_stock;
    const success = await toggleMarketplaceStock(product.id, nextStatus);
    if (success) {
      setProduct(prev => prev ? {
        ...prev,
        is_out_of_stock: nextStatus,
        stock_status: nextStatus ? 'out_of_stock' : 'available'
      } : null);
      toast.success(nextStatus ? 'Producto marcado como agotado' : 'Producto disponible');
    } else {
      toast.error('No se pudo cambiar el estado');
    }
  };

  const handleProductUpdated = (updated: Partial<PublicProduct>) => {
    setProduct(prev => prev ? { ...prev, ...updated } : null);
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

  useEffect(() => {
    if (!slug) return;
    try {
      localStorage.setItem(`matum_cart_${slug}`, JSON.stringify(cart));
    } catch (e) {
      console.warn('Error saving cart to localStorage', e);
    }
  }, [cart, slug]);

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
    const fetchData = async () => {
      if (!slug || !productId) return;
      setError(null);

      const cachedCat = await getCatalogFromCache(slug);
      let cachedProd: any = null;
      if (cachedCat) {
        const cachedProds = await getCatalogProductsFromCache(cachedCat.id);
        cachedProd = cachedProds?.find((p: any) => p.id === productId) || null;
        if (cachedProd) {
          setCatalog(cachedCat);
          setProduct(cachedProd);
          setVendorPhone(cachedCat._vendorInfo?.vendorPhone || cachedCat.footer_phone || '');
          setVendorPlan(cachedCat._vendorInfo?.vendorPlan || 'free');
          setLoading(false);
        }
      }

      if (isOffline()) {
        if (!cachedCat || !cachedProd) {
          setError('Sin conexión. Este producto aún no está guardado en el dispositivo.');
          setLoading(false);
        }
        return;
      }

      if (!cachedProd) setLoading(true);

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

        if (!catData || !catData.is_active) {
          if (!cachedProd) setError('Tienda no disponible o inactiva.');
          setLoading(false);
          return;
        }

        setCatalog(catData);

        const [prodResult, relatedResult, userResult] = await Promise.all([
          supabase
            .from('products')
            .select(
              'id, catalog_id, name, description, price, currency, price_cup, price_usd, imagen_url, is_out_of_stock, stock_status, category_id, commission_amount, commission_currency, delivery_cost, delivery_currency, delivery_time_value, delivery_time_unit, is_active, contact_phone, sender_name, is_featured'
            )
            .eq('id', productId)
            .eq('catalog_id', catData.id)
            .maybeSingle(),
          supabase
            .from('products')
            .select(
              'id, catalog_id, name, description, price, currency, price_cup, price_usd, imagen_url, is_out_of_stock, stock_status, category_id, commission_amount, commission_currency, delivery_cost, delivery_currency, delivery_time_value, delivery_time_unit, is_active, position, contact_phone, sender_name, is_featured'
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
          if (!cachedProd) setError('El producto no está disponible o no existe.');
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

        await saveCatalogToCache(
          { ...catData, slug: (catData as any).slug || slug },
          { vendorPhone: vPhone, vendorPlan: vPlan }
        );
        await upsertCatalogProductsInCache(catData.id, [prodResult.data]);
      } catch (err: any) {
        console.error('Error fetching product data:', err);
        if (!cachedProd) {
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

    fetchData();
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
      url: typeof window !== 'undefined' ? window.location.href : undefined,
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
  }, [product, catalog]);

  const pricingCtx = useMemo(() => buildPricingContext(catalog, vendorPlan), [catalog, vendorPlan]);
  const unitPriceParts = useMemo(
    () => (product ? getPriceParts(product, pricingCtx, 1) : null),
    [product, pricingCtx]
  );
  const subtotalParts = useMemo(
    () => (product ? getPriceParts(product, pricingCtx, quantity) : null),
    [product, pricingCtx, quantity]
  );

  const productShareUrl = useMemo(() => {
    if (typeof window === 'undefined' || !slug || !product) return '';
    const baseUrl = `${window.location.protocol}//${window.location.host}`;
    const affiliateParam =
      isApprovedAffiliate && user?.referral_code ? `?ref=${user.referral_code}` : '';
    return `${baseUrl}/${slug}/p/${product.id}${affiliateParam}`;
  }, [slug, product, isApprovedAffiliate, user?.referral_code]);

  const handleShareProduct = async () => {
    if (!product || !catalog) return;

    const priceText = getPriceText(product, pricingCtx);
    const text = catalog.share_template
      ? catalog.share_template
          .replace(/{product_name}/g, (product.name || '').trim())
          .replace(/{product_description}/g, (product.description || '').trim())
          .replace(/{product_price}/g, priceText.trim())
          .replace(/{product_currency}/g, '')
          .replace(/{catalog_name}/g, (catalog.name || '').trim())
          .replace(/{contact_number}/g, vendorPhone || '')
          .replace(/{store_url}/g, productShareUrl)
          .replace(/{product_url}/g, productShareUrl)
      : `*${product.name}*\n\nPrecio: ${priceText}\n\n${product.description || ''}\n\nVer producto: ${productShareUrl}`.trim();

    await shareContent({
      title: product.name,
      text,
      url: productShareUrl,
      imageUrl: product.imagen_url || undefined,
    });
  };

  const handleCopyLink = async () => {
    if (!productShareUrl) return;
    try {
      await navigator.clipboard.writeText(productShareUrl);
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
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
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
      toast.error('Por favor, ingresa tu nombre y número de teléfono.');
      return;
    }

    const priceText = getPriceText(product, pricingCtx);
    const unitPrice = Number(product.price) || 0;
    const totalPrice = unitPrice * quantity;

    let messageText = `🛍️ *Nuevo Pedido - Matum*\n`;
    messageText += `━━━━━━━━━━━━━━━━━━━━\n`;
    messageText += `*Tienda:* ${catalog.name}\n`;
    if (slug) {
      const currentHost = typeof window !== 'undefined' ? window.location.host : 'matum.vercel.app';
      messageText += `*Enlace del producto:* ${currentHost}/${slug}/p/${product.id}\n`;
    }
    messageText += `━━━━━━━━━━━━━━━━━━━━\n`;
    messageText += `👤 *Datos del Cliente:*\n`;
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

    const activeRef =
      (slug ? localStorage.getItem(`matum_ref_${slug}`) : null) ||
      localStorage.getItem('matum_active_ref');
    const orderRef = 'ORD-' + Math.random().toString(36).substring(2, 7).toUpperCase();

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
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 font-store">
        <div className="w-10 h-10 border-3 border-[var(--accent)] border-t-transparent rounded-full animate-spin mb-3.5" />
        <p className="text-secondary text-xs font-semibold animate-pulse tracking-wide">Cargando producto…</p>
      </div>
    );
  }

  if (error || !product || !catalog) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center font-store">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20 text-red-500 mb-3.5 shadow-sm">
          <AlertTriangle size={24} />
        </div>
        <h1 className="font-display text-xl font-bold text-primary mb-1.5">
          {error || 'Producto no encontrado'}
        </h1>
        <p className="text-xs text-secondary max-w-sm mb-5 leading-relaxed">
          Este producto no existe o ya no está disponible en la tienda.
        </p>
        {slug && (
          <Link
            to={`/${slug}${location.search}`}
            className="inline-flex items-center gap-2 h-9 px-5 rounded-full bg-accent text-[var(--accent-text,black)] font-bold text-xs hover:opacity-90 active:scale-95 transition-all shadow-md shadow-accent/25"
          >
            <ArrowLeft size={14} /> Volver a la tienda
          </Link>
        )}
      </div>
    );
  }

  const isOutOfStock = product.is_out_of_stock || product.stock_status === 'out_of_stock';

  return (
    <div
      style={themeStyles}
      className="min-h-screen bg-background text-primary pb-24 md:pb-14 font-store selection:bg-accent selection:text-[var(--accent-text)]"
    >
      {/* Barra superior moderna y redondeada */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/70 transition-all">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 h-13 flex items-center justify-between gap-2.5">
          <Link
            to={`/${slug}${location.search}`}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-surface/80 hover:bg-surface border border-border/70 text-xs font-semibold text-secondary hover:text-primary transition-all shadow-sm active:scale-95 group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            <span className="hidden sm:inline">Volver a la tienda</span>
            <span className="sm:hidden">Tienda</span>
          </Link>

          <Link
            to={`/${slug}${location.search}`}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface/60 hover:bg-surface border border-border/60 transition-all shadow-sm max-w-[200px] sm:max-w-xs group"
          >
            {catalog.logo_url ? (
              <img
                src={catalog.logo_url}
                alt={catalog.name}
                className="w-5 h-5 rounded-full object-cover border border-border/60 flex-shrink-0"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-[var(--accent)] text-[var(--accent-text)] flex items-center justify-center text-[10px] font-display font-black flex-shrink-0">
                {catalog.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="font-display text-xs font-bold truncate group-hover:text-accent transition-colors">
              {catalog.name}
            </span>
          </Link>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleShareProduct}
              className="w-9 h-9 inline-flex items-center justify-center rounded-full bg-surface/80 hover:bg-surface border border-border/70 text-secondary hover:text-primary transition-all active:scale-95 shadow-sm"
              aria-label="Compartir producto"
            >
              <Share2 size={14} />
            </button>

            <Link
              to={`/${slug}${location.search}`}
              className="relative w-9 h-9 inline-flex items-center justify-center rounded-full bg-surface/80 hover:bg-surface border border-border/70 text-primary transition-all active:scale-95 shadow-sm"
              aria-label={`Ver pedido en la tienda (${totalCartCount})`}
            >
              <ShoppingBag size={14} />
              {totalCartCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--accent)] text-[var(--accent-text)] text-[9px] font-extrabold flex items-center justify-center ring-2 ring-background shadow-sm animate-store-pop">
                  {totalCartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-7">
        <nav
          aria-label="Ruta de navegación"
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface/50 border border-border/50 text-[11px] text-secondary mb-4 overflow-hidden max-w-full"
        >
          <Link to={`/${slug}${location.search}`} className="hover:text-primary transition-colors truncate">
            {catalog.name}
          </Link>
          <ChevronRight size={11} className="opacity-40 flex-shrink-0" />
          <span className="text-primary font-medium truncate">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8 lg:gap-10">
          {/* Columna Izquierda: Imagen y badges de valor */}
          <div className="space-y-3">
            <div className="relative aspect-square w-full rounded-3xl overflow-hidden bg-surface/40 border border-border/70 shadow-sm group flex items-center justify-center">
              {product.imagen_url ? (
                <img
                  src={product.imagen_url}
                  alt={product.name}
                  fetchPriority="high"
                  className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-secondary/60 gap-2 p-6">
                  <div className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center border border-border">
                    <ShoppingBag size={32} strokeWidth={1.5} />
                  </div>
                  <span className="text-xs font-semibold text-secondary">Sin imagen disponible</span>
                </div>
              )}

              {/* Badges de estado flotantes */}
              {isOutOfStock ? (
                <span className="absolute top-3.5 left-3.5 bg-red-500/90 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-md">
                  Agotado
                </span>
              ) : (
                <span className="absolute top-3.5 left-3.5 bg-background/90 backdrop-blur-md text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold px-3 py-1 rounded-full shadow-sm flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Disponible
                </span>
              )}

              {/* Botón flotante para compartir foto */}
              <button
                type="button"
                onClick={handleShareProduct}
                className="absolute top-3.5 right-3.5 w-9 h-9 rounded-full bg-black/45 hover:bg-black/65 backdrop-blur-md text-white flex items-center justify-center transition-all opacity-90 hover:opacity-100 shadow-md active:scale-95"
                aria-label="Compartir este producto"
              >
                <Share2 size={14} />
              </button>
            </div>
          </div>

          {/* Columna Derecha: Información, Precio y Acciones */}
          <div className="flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Link
                    to={`/${slug}${location.search}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface border border-border/60 text-[11px] font-semibold text-secondary hover:text-accent transition-colors"
                  >
                    <Store size={12} />
                    <span>{catalog.name}</span>
                  </Link>
                  {product.is_featured && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-500 text-[11px] font-bold">
                      <Star size={11} className="fill-amber-500" />
                      Producto Destacado
                    </span>
                  )}
                </div>
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-primary tracking-tight leading-tight">
                  {product.name}
                </h1>
              </div>

              {/* Bloque de precio destacado */}
              <div className="p-3.5 rounded-2xl bg-surface/50 border border-border/60">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-secondary mb-1">
                  Precio
                </div>
                <PriceTag
                  parts={unitPriceParts}
                  className="font-display text-2xl sm:text-3xl font-black text-[var(--accent)] tracking-tight"
                  secondaryClassName="text-sm font-semibold text-secondary mt-0.5 block"
                />
              </div>

              {/* Tarjeta de ganancia de promotor (Afiliados) */}
              {canSeeCommissions && (product.commission_amount ?? 0) > 0 && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/25 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Coins size={16} />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block leading-tight">
                          Tu ganancia de promotor
                        </span>
                        <span className="text-[10px] text-secondary">
                          Por cada venta que logres de este producto
                        </span>
                      </div>
                    </div>
                    <span className="text-sm sm:text-base font-extrabold text-emerald-500 tabular-nums">
                      +{product.commission_amount} {product.commission_currency || 'CUP'}
                    </span>
                  </div>

                  <div className="pt-2.5 border-t border-emerald-500/20 flex flex-wrap gap-2 items-center justify-between">
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <Sparkles size={11} /> Comparte tu enlace y gana
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-semibold text-xs shadow-sm shadow-emerald-500/20 transition-all"
                    >
                      {copiedLink ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedLink ? 'Copiado' : 'Copiar mi enlace'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Información de Domicilio y Tiempo de Entrega */}
              {((product.delivery_cost !== null && product.delivery_cost !== undefined) ||
                (product.delivery_time_value !== null && product.delivery_time_value !== undefined)) && (
                <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/20 grid grid-cols-2 gap-3 text-xs shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center flex-shrink-0">
                      <Truck size={16} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] text-secondary block font-semibold uppercase tracking-wider">Costo de Domicilio</span>
                      <span className="font-extrabold text-primary truncate block text-xs sm:text-sm">
                        {product.delivery_cost !== null && product.delivery_cost !== undefined
                          ? Number(product.delivery_cost) === 0
                            ? 'Envío Gratis'
                            : `${product.delivery_cost} ${product.delivery_currency || 'CUP'}`
                          : 'A coordinar'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center flex-shrink-0">
                      <Clock size={16} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] text-secondary block font-semibold uppercase tracking-wider">Tiempo de Entrega</span>
                      <span className="font-extrabold text-primary truncate block text-xs sm:text-sm">
                        {product.delivery_time_value !== null && product.delivery_time_value !== undefined
                          ? `${product.delivery_time_value} ${product.delivery_time_unit === 'days' ? (Number(product.delivery_time_value) === 1 ? 'día' : 'días') : (Number(product.delivery_time_value) === 1 ? 'hora' : 'horas')}`
                          : 'Inmediata'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Selector de cantidad ergonómico */}
              {!isOutOfStock && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-secondary">Seleccionar cantidad</span>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="inline-flex items-center h-10 bg-surface/90 border border-border/80 rounded-full p-1 shadow-sm">
                      <button
                        type="button"
                        onClick={() => setQuantity(q => Math.max(1, q - 1))}
                        disabled={quantity <= 1}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-secondary hover:text-primary hover:bg-surface-hover active:scale-90 transition-all disabled:opacity-30"
                        aria-label="Restar unidad"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="w-9 text-center font-extrabold text-sm tabular-nums text-primary">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity(q => q + 1)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-secondary hover:text-primary hover:bg-surface-hover active:scale-90 transition-all"
                        aria-label="Sumar unidad"
                      >
                        <Plus size={13} />
                      </button>
                    </div>

                    {quantity > 1 && subtotalParts && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface border border-border/60 text-xs text-secondary shadow-sm">
                        <span>Total:</span>
                        <PriceTag
                          parts={subtotalParts}
                          className="font-bold text-primary"
                          secondaryClassName="text-[11px] text-secondary"
                        />
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Panel de control para el dueño del producto en Marketplace */}
              {isProductOwner && (
                <div className="p-3.5 rounded-2xl bg-accent/10 border border-accent/30 space-y-2 mb-2 animate-store-fade-up">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-accent">Tu publicación en Nazaar</span>
                    <span className="text-[11px] text-secondary tabular-nums">{product.contact_phone}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleToggleStock}
                      className={`h-10 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm ${
                        isOutOfStock
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-amber-600 hover:bg-amber-700 text-white'
                      }`}
                    >
                      {isOutOfStock ? 'Marcar Disponible' : 'Marcar Agotado'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditModalOpen(true)}
                      className="h-10 px-3 rounded-xl bg-accent hover:bg-accent-hover text-accent-text font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
                    >
                      Editar Publicación
                    </button>
                  </div>
                </div>
              )}

              {/* Acciones principales para pantallas de escritorio */}
              <div className="space-y-2.5 pt-1">
                {!isOutOfStock ? (
                  <div className="hidden md:grid grid-cols-2 gap-2.5">
                    {!isMarketplace && (
                      <button
                        type="button"
                        onClick={handleAddToCart}
                        className="h-12 px-5 rounded-2xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 shadow-md shadow-accent/15 transition-all active:scale-[0.98]"
                      >
                        <Plus size={16} strokeWidth={2.5} /> Agregar al pedido
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsOrderModalOpen(true)}
                      className={`h-12 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98] ${
                        isMarketplace ? 'col-span-2' : ''
                      }`}
                    >
                      <WhatsAppIcon size={16} /> Contactar por WhatsApp
                    </button>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-center text-red-500 font-bold text-xs">
                    Este producto está agotado temporalmente.
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleShareProduct}
                    className="flex-1 h-10 px-4 rounded-xl bg-surface/80 hover:bg-surface-hover active:scale-[0.98] border border-border/70 text-primary font-semibold text-xs inline-flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <Share2 size={14} />
                    <span>Compartir producto</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="w-10 h-10 rounded-xl bg-surface/80 hover:bg-surface-hover active:scale-[0.98] border border-border/70 text-secondary hover:text-primary inline-flex items-center justify-center transition-all shadow-sm"
                    aria-label="Copiar enlace"
                  >
                    {copiedLink ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
                  </button>
                </div>
              </div>

              {/* Descripción con card moderno redondeado */}
              {product.description && (
                <div className="pt-2 space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-secondary">
                    Descripción del producto
                  </h3>
                  <div className="text-xs sm:text-sm text-primary/90 leading-relaxed whitespace-pre-line bg-surface/60 p-4 rounded-2xl border border-border/70 shadow-sm">
                    {product.description}
                  </div>
                </div>
              )}
            </div>

            {/* Tarjeta del vendedor / Tienda */}
            <div className="mt-6 pt-5 border-t border-border/70">
              <div className="p-4 rounded-2xl bg-surface/70 border border-border/70 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
                <div className="flex items-center gap-3 min-w-0">
                  {catalog.logo_url ? (
                    <img
                      src={catalog.logo_url}
                      alt={catalog.name}
                      className="w-11 h-11 rounded-full object-cover border-2 border-border/70 flex-shrink-0 shadow-sm"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-[var(--accent)] text-[var(--accent-text)] font-display font-black text-sm flex items-center justify-center flex-shrink-0 shadow-sm">
                      {catalog.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h4 className="font-display text-xs sm:text-sm font-bold text-primary truncate">
                      {catalog.name}
                    </h4>
                    {catalog.slogan && (
                      <p className="text-[11px] text-secondary mt-0.5 line-clamp-1">{catalog.slogan}</p>
                    )}
                  </div>
                </div>

                <Link
                  to={`/${slug}${location.search}`}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-full bg-surface-hover hover:bg-border text-xs font-semibold text-primary transition-all shadow-sm flex-shrink-0"
                >
                  <Store size={13} /> Ver tienda completa
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Productos relacionados */}
        {relatedProducts.length > 0 && (
          <section className="mt-10 pt-7 border-t border-border/70">
            <div className="flex items-baseline justify-between mb-4">
              <div>
                <h2 className="font-display text-base sm:text-lg font-bold text-primary">
                  También te puede gustar
                </h2>
                <p className="text-xs text-secondary">Más opciones disponibles en esta tienda</p>
              </div>
              <Link
                to={`/${slug}${location.search}`}
                className="text-xs font-bold text-[var(--accent)] hover:underline inline-flex items-center gap-1"
              >
                Ver todo <ChevronRight size={13} />
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
                    onOpen={() => navigate(`/${slug}/p/${rel.id}${location.search}`)}
                    onAdd={() =>
                      setCart(prev => {
                        const existing = prev.find(i => i.product.id === rel.id);
                        if (existing) {
                          return prev.map(i =>
                            i.product.id === rel.id ? { ...i, quantity: i.quantity + 1 } : i
                          );
                        }
                        return [...prev, { product: rel, quantity: 1 }];
                      })
                    }
                    onRemove={() =>
                      setCart(prev => {
                        const existing = prev.find(i => i.product.id === rel.id);
                        if (!existing) return prev;
                        if (existing.quantity === 1) {
                          return prev.filter(i => i.product.id !== rel.id);
                        }
                        return prev.map(i =>
                          i.product.id === rel.id ? { ...i, quantity: i.quantity - 1 } : i
                        );
                      })
                    }
                    onShare={e => {
                      e.stopPropagation();
                      const relUrl = `${window.location.origin}/${slug}/p/${rel.id}${location.search}`;
                      shareContent({
                        title: rel.name,
                        text: `${rel.name} · ${getPriceText(rel, pricingCtx)}\n${relUrl}`,
                        url: relUrl,
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

      {/* Barra fija inferior de compra en móvil (Floating bottom sheet bar redondeada) */}
      {!isOutOfStock && (
        <div className="md:hidden fixed bottom-3 inset-x-3 z-30 bg-background/95 backdrop-blur-xl border border-border/80 rounded-2xl p-2.5 shadow-2xl flex gap-2">
          <button
            type="button"
            onClick={handleAddToCart}
            className="flex-1 h-11 px-3 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] font-bold text-xs inline-flex items-center justify-center gap-1.5 active:scale-[0.98] shadow-sm transition-all"
          >
            <Plus size={15} strokeWidth={2.5} /> Agregar
          </button>
          <button
            type="button"
            onClick={() => setIsOrderModalOpen(true)}
            className="flex-1 h-11 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center justify-center gap-1.5 active:scale-[0.98] shadow-md shadow-emerald-600/20 transition-all"
          >
            <WhatsAppIcon size={15} /> WhatsApp
          </button>
        </div>
      )}

      {/* Modal para confirmar pedido directo por WhatsApp */}
      <Modal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        title="Completar tu pedido"
      >
        <div className="space-y-3.5 font-store">
          <div className="p-3 rounded-2xl bg-surface border border-border/80 shadow-sm">
            <p className="text-xs font-bold text-primary">{product.name}</p>
            <p className="text-[11px] text-secondary mt-0.5">
              Cantidad: {quantity} · Total: {getPriceText(product, pricingCtx, quantity)}
            </p>
          </div>

          <p className="text-xs text-secondary leading-relaxed">
            Ingresa tus datos de contacto para coordinar la entrega y el pago directamente por WhatsApp:
          </p>

          <div className="space-y-3">
            <Input
              label="Tu nombre *"
              placeholder="Ej. Juan Pérez"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
            />
            <Input
              label="Teléfono de contacto *"
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
              className="flex-1 h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all active:scale-95"
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
          <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mx-auto shadow-sm">
            <Check size={28} />
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
              className="w-full py-2.5 rounded-xl bg-accent text-[var(--accent-text,black)] font-bold text-xs text-center shadow-md shadow-accent/20 transition-all hover:opacity-90 active:scale-95"
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
