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
import { buildWhatsAppUrl } from '../../lib/whatsapp';
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
import { ProductCard } from '../../components/store/ProductCard';
import { WhatsAppIcon } from '../../components/store/SocialIcons';
import type { CartItem, PublicCatalog, PublicProduct } from '../../types/store';

const CATALOG_SELECT =
  'id, slug, name, slogan, description, user_id, is_active, is_public, logo_url, cover_url, primary_color, background_color, surface_color, text_color, title_color, follow_code, footer_address, footer_phone, footer_email, footer_schedule, usd_to_cup_rate, cup_to_usd_rate, display_currency, share_template, enable_affiliates';

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
              'id, catalog_id, name, description, price, currency, price_cup, price_usd, imagen_url, is_out_of_stock, stock_status, category_id, commission_amount, commission_currency, is_active'
            )
            .eq('id', productId)
            .eq('catalog_id', catData.id)
            .maybeSingle(),
          supabase
            .from('products')
            .select(
              'id, catalog_id, name, description, price, currency, price_cup, price_usd, imagen_url, is_out_of_stock, stock_status, category_id, commission_amount, commission_currency, is_active, position'
            )
            .eq('catalog_id', catData.id)
            .eq('is_active', true)
            .neq('id', productId)
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

    window.open(buildWhatsAppUrl(vendorPhone, messageText), '_blank');
    setIsOrderModalOpen(false);
    setShowOrderSuccess(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 font-store">
        <div className="w-10 h-10 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-secondary text-sm font-medium animate-pulse">Cargando producto…</p>
      </div>
    );
  }

  if (error || !product || !catalog) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center font-store">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 text-red-500 mb-5">
          <AlertTriangle size={28} />
        </div>
        <h1 className="font-display text-2xl font-bold text-primary mb-2">
          {error || 'Producto no encontrado'}
        </h1>
        <p className="text-sm text-secondary max-w-sm mb-6">
          Este producto no existe o ya no está disponible en la tienda.
        </p>
        {slug && (
          <Link
            to={`/${slug}${location.search}`}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-accent text-[var(--accent-text,black)] font-semibold text-sm hover:opacity-90 transition-all shadow-lg shadow-accent/20"
          >
            <ArrowLeft size={16} /> Ir a la tienda
          </Link>
        )}
      </div>
    );
  }

  const isOutOfStock = product.is_out_of_stock || product.stock_status === 'out_of_stock';

  return (
    <div
      style={themeStyles}
      className="min-h-screen bg-background text-primary pb-28 md:pb-16 font-store selection:bg-accent selection:text-[var(--accent-text)]"
    >
      {/* Barra superior */}
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-border">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link
            to={`/${slug}${location.search}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-secondary hover:text-primary transition-colors py-1 group"
          >
            <ArrowLeft size={17} className="group-hover:-translate-x-0.5 transition-transform" />
            <span className="hidden sm:inline">Volver a la tienda</span>
            <span className="sm:hidden">Tienda</span>
          </Link>

          <Link
            to={`/${slug}${location.search}`}
            className="flex items-center gap-2 max-w-[200px] sm:max-w-xs truncate group"
          >
            {catalog.logo_url ? (
              <img
                src={catalog.logo_url}
                alt={catalog.name}
                className="w-7 h-7 rounded-lg object-cover border border-border flex-shrink-0"
              />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-[var(--accent)] text-[var(--accent-text)] flex items-center justify-center text-xs font-display font-extrabold flex-shrink-0">
                {catalog.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="font-display text-sm font-bold truncate group-hover:text-accent transition-colors">
              {catalog.name}
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShareProduct}
              className="w-10 h-10 inline-flex items-center justify-center rounded-full bg-surface border border-border text-secondary hover:text-primary hover:bg-surface-hover active:scale-95 transition-all"
              aria-label="Compartir producto"
            >
              <Share2 size={17} />
            </button>

            <Link
              to={`/${slug}${location.search}`}
              className="relative w-10 h-10 inline-flex items-center justify-center rounded-full bg-surface border border-border text-primary hover:bg-surface-hover transition-colors"
              aria-label={`Ver pedido en la tienda (${totalCartCount})`}
            >
              <ShoppingBag size={17} />
              {totalCartCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--accent)] text-[var(--accent-text)] text-[10px] font-bold leading-[18px] text-center ring-2 ring-background">
                  {totalCartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
        <nav
          aria-label="Ruta de navegación"
          className="flex items-center gap-1.5 text-xs text-secondary mb-5 overflow-hidden"
        >
          <Link to={`/${slug}${location.search}`} className="hover:text-primary transition-colors">
            {catalog.name}
          </Link>
          <ChevronRight size={13} className="opacity-50 flex-shrink-0" />
          <span className="text-primary font-medium truncate">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
          {/* Imagen */}
          <div>
            <div className="relative aspect-square w-full rounded-3xl overflow-hidden bg-surface border border-border">
              {product.imagen_url ? (
                <img
                  src={product.imagen_url}
                  alt={product.name}
                  fetchPriority="high"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-secondary/60 gap-2 p-8">
                  <ShoppingBag size={56} strokeWidth={1.5} />
                  <span className="text-xs font-medium text-secondary">Sin imagen</span>
                </div>
              )}

              {isOutOfStock && (
                <span className="absolute top-3.5 left-3.5 bg-red-500/90 backdrop-blur text-white text-xs font-semibold px-3 py-1 rounded-full shadow-lg">
                  Agotado
                </span>
              )}
            </div>
          </div>

          {/* Información */}
          <div className="flex flex-col justify-between space-y-6">
            <div className="space-y-5">
              <div>
                <Link
                  to={`/${slug}${location.search}`}
                  className="inline-flex items-center gap-1.5 text-xs text-secondary hover:text-accent font-medium mb-1.5 transition-colors"
                >
                  <Store size={13} />
                  <span>{catalog.name}</span>
                </Link>
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-primary tracking-tight leading-snug">
                  {product.name}
                </h1>
              </div>

              <PriceTag
                parts={unitPriceParts}
                className="font-display text-2xl sm:text-3xl font-extrabold text-[var(--accent)] tracking-tight"
                secondaryClassName="text-base font-medium text-secondary"
              />

              {/* Ganancia de promotor */}
              {canSeeCommissions && (product.commission_amount ?? 0) > 0 && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center flex-shrink-0">
                        <Coins size={17} />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block">
                          Tu ganancia de promotor
                        </span>
                        <span className="text-xs text-secondary">
                          Por cada venta que logres de este producto
                        </span>
                      </div>
                    </div>
                    <span className="text-base sm:text-lg font-bold text-emerald-500 tabular-nums">
                      +{product.commission_amount} {product.commission_currency || 'CUP'}
                    </span>
                  </div>

                  <div className="pt-2.5 border-t border-emerald-500/20 flex flex-wrap gap-2 items-center justify-between">
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      Comparte este enlace para atribuirte la venta
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-emerald-500 text-white font-semibold text-xs hover:bg-emerald-600 active:scale-95 transition-all"
                    >
                      {copiedLink ? <Check size={13} /> : <Copy size={13} />}
                      <span>{copiedLink ? 'Copiado' : 'Copiar mi enlace'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Cantidad */}
              {!isOutOfStock && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-secondary">Cantidad</span>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="inline-flex items-center h-11 bg-surface border border-border rounded-full px-1">
                      <button
                        type="button"
                        onClick={() => setQuantity(q => Math.max(1, q - 1))}
                        disabled={quantity <= 1}
                        className="w-9 h-9 rounded-full flex items-center justify-center text-secondary hover:text-primary hover:bg-surface-hover active:scale-90 transition-all disabled:opacity-40"
                        aria-label="Restar unidad"
                      >
                        <Minus size={15} />
                      </button>
                      <span className="w-10 text-center font-bold text-sm tabular-nums">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity(q => q + 1)}
                        className="w-9 h-9 rounded-full flex items-center justify-center text-secondary hover:text-primary hover:bg-surface-hover active:scale-90 transition-all"
                        aria-label="Sumar unidad"
                      >
                        <Plus size={15} />
                      </button>
                    </div>
                    {quantity > 1 && subtotalParts && (
                      <span className="text-sm text-secondary">
                        Subtotal:{' '}
                        <PriceTag
                          parts={subtotalParts}
                          className="font-bold text-primary"
                          secondaryClassName="text-xs text-secondary"
                        />
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Acciones (escritorio; en móvil también hay barra fija) */}
              <div className="space-y-2.5 pt-1">
                {!isOutOfStock ? (
                  <div className="hidden md:grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      className="h-12 px-5 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] font-semibold text-sm inline-flex items-center justify-center gap-2 transition-colors active:scale-[0.99]"
                    >
                      <Plus size={17} /> Agregar al pedido
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsOrderModalOpen(true)}
                      className="h-12 px-5 rounded-full bg-green-600 hover:bg-green-700 text-white font-semibold text-sm inline-flex items-center justify-center gap-2 transition-colors active:scale-[0.99]"
                    >
                      <WhatsAppIcon size={17} /> Pedir por WhatsApp
                    </button>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-center text-red-500 font-semibold text-sm">
                    Este producto está agotado por el momento.
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleShareProduct}
                    className="flex-1 h-11 px-4 rounded-full bg-surface hover:bg-surface-hover active:scale-[0.99] border border-border text-primary font-semibold text-xs inline-flex items-center justify-center gap-2 transition-colors"
                  >
                    <Share2 size={15} />
                    <span>Compartir producto</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="w-11 h-11 inline-flex items-center justify-center rounded-full bg-surface hover:bg-surface-hover active:scale-[0.99] border border-border text-secondary hover:text-primary transition-colors"
                    aria-label="Copiar enlace"
                  >
                    {copiedLink ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              {/* Descripción */}
              {product.description && (
                <div className="pt-4 border-t border-border space-y-2">
                  <h3 className="text-xs font-semibold text-secondary">Descripción</h3>
                  <div className="text-sm text-primary/90 leading-relaxed whitespace-pre-line bg-surface p-4 rounded-2xl border border-border">
                    {product.description}
                  </div>
                </div>
              )}
            </div>

            {/* Tarjeta de la tienda */}
            <div className="mt-8 pt-6 border-t border-border">
              <div className="p-4 rounded-2xl bg-surface border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {catalog.logo_url ? (
                    <img
                      src={catalog.logo_url}
                      alt={catalog.name}
                      className="w-12 h-12 rounded-2xl object-cover border border-border flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-[var(--accent)] text-[var(--accent-text)] font-display font-extrabold text-lg flex items-center justify-center flex-shrink-0">
                      {catalog.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h4 className="font-display text-sm font-bold text-primary truncate">
                      {catalog.name}
                    </h4>
                    {catalog.slogan && (
                      <p className="text-xs text-secondary mt-0.5 line-clamp-1">{catalog.slogan}</p>
                    )}
                  </div>
                </div>

                <Link
                  to={`/${slug}${location.search}`}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-10 px-4 rounded-full bg-surface-hover hover:bg-border text-xs font-semibold text-primary transition-colors flex-shrink-0"
                >
                  <Store size={14} /> Ver tienda completa
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Productos relacionados */}
        {relatedProducts.length > 0 && (
          <section className="mt-14 pt-10 border-t border-border">
            <div className="flex items-baseline justify-between mb-5">
              <h2 className="font-display text-lg sm:text-xl font-bold text-primary">
                También te puede gustar
              </h2>
              <Link
                to={`/${slug}${location.search}`}
                className="text-xs font-semibold text-[var(--accent)] hover:underline"
              >
                Ver todo →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-6 sm:gap-x-5">
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

      {/* Barra fija inferior de compra en móvil */}
      {!isOutOfStock && (
        <div className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur-xl border-t border-border px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex gap-2">
          <button
            type="button"
            onClick={handleAddToCart}
            className="flex-1 h-12 px-4 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] font-semibold text-sm inline-flex items-center justify-center gap-1.5 active:scale-[0.99]"
          >
            <Plus size={17} /> Agregar
          </button>
          <button
            type="button"
            onClick={() => setIsOrderModalOpen(true)}
            className="flex-1 h-12 px-4 rounded-full bg-green-600 hover:bg-green-700 text-white font-semibold text-sm inline-flex items-center justify-center gap-1.5 active:scale-[0.99]"
          >
            <WhatsAppIcon size={17} /> WhatsApp
          </button>
        </div>
      )}

      {/* Modal para confirmar pedido directo por WhatsApp */}
      <Modal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        title="Completar tu pedido"
      >
        <div className="space-y-4 font-store">
          <div className="p-3.5 rounded-2xl bg-surface-hover border border-border">
            <p className="text-sm font-semibold text-primary">{product.name}</p>
            <p className="text-xs text-secondary mt-0.5">
              Cantidad: {quantity} · Total: {getPriceText(product, pricingCtx, quantity)}
            </p>
          </div>

          <p className="text-sm text-secondary">
            Ingresa tus datos de contacto para coordinar la entrega por WhatsApp:
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

          <div className="flex gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => setIsOrderModalOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <button
              type="button"
              onClick={handleConfirmOrder}
              className="flex-1 h-11 px-4 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm inline-flex items-center justify-center gap-2 shadow-md"
            >
              <WhatsAppIcon size={16} /> Enviar pedido
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
          <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mx-auto">
            <Check size={28} />
          </div>
          <h3 className="font-display text-lg font-bold text-primary">
            Tu mensaje se abrió en WhatsApp
          </h3>
          <p className="text-sm text-secondary max-w-sm mx-auto">
            Completa el envío del mensaje en WhatsApp para coordinar el pago y la entrega con la tienda.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              to={`/${slug}${location.search}`}
              className="w-full py-2.5 rounded-xl bg-accent text-[var(--accent-text,black)] font-semibold text-sm text-center"
            >
              Seguir explorando la tienda
            </Link>
            <Button
              variant="ghost"
              onClick={() => setShowOrderSuccess(false)}
              className="w-full"
            >
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
