import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  ShoppingBag, 
  ArrowLeft, 
  Share2, 
  Copy, 
  Check, 
  Coins, 
  Plus, 
  Minus, 
  Send, 
  AlertTriangle, 
  Sparkles,
  Phone,
  Store,
  ChevronRight,
  X
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useCommissions } from '../../hooks/useCommissions';
import { shareContent } from '../../lib/share';
import { toast } from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';

interface PublicCatalog {
  id: string;
  name: string;
  slogan: string | null;
  description: string | null;
  user_id: string;
  logo_url: string | null;
  cover_url: string | null;
  primary_color: string | null;
  background_color: string | null;
  surface_color: string | null;
  text_color?: string | null;
  title_color?: string | null;
  follow_code?: string | null;
  footer_address?: string | null;
  footer_phone?: string | null;
  footer_email?: string | null;
  footer_schedule?: string | null;
  usd_to_cup_rate?: number;
  cup_to_usd_rate?: number;
  display_currency?: 'original' | 'usd' | 'cup' | 'both';
  share_template?: string | null;
  enable_affiliates?: boolean;
}

interface PublicProduct {
  id: string;
  catalog_id: string;
  name: string;
  description: string | null;
  price: number | null;
  currency: string;
  imagen_url: string | null;
  is_out_of_stock: boolean;
  stock_status: string;
  price_cup?: number | null;
  price_usd?: number | null;
  category_id?: number | null;
  commission_amount?: number | null;
  commission_currency?: 'CUP' | 'USD';
}

interface CartItem {
  product: PublicProduct;
  quantity: number;
}

export const PublicProductPage: React.FC = () => {
  const { slug, productId } = useParams<{ slug: string; productId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { myAffiliation, checkAffiliateStatus, registerPendingCommission } = useCommissions();

  const [catalog, setCatalog] = useState<PublicCatalog | null>(null);
  const [product, setProduct] = useState<PublicProduct | null>(null);
  const [vendorPhone, setVendorPhone] = useState<string>('');
  const [vendorPlan, setVendorPlan] = useState<string>('free');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [quantity, setQuantity] = useState(1);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showOrderSuccess, setShowOrderSuccess] = useState(false);

  // Formulario de pedido
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

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

  // Guardar carrito en localStorage cuando cambie
  useEffect(() => {
    if (slug) {
      try {
        localStorage.setItem(`matum_cart_${slug}`, JSON.stringify(cart));
      } catch (e) {
        console.warn('Error saving cart to localStorage', e);
      }
    }
  }, [cart, slug]);

  // Capturar código de afiliado desde ?ref=...
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(location.search);
      const refParam = searchParams.get('ref');
      if (refParam) {
        localStorage.setItem('matum_active_ref', refParam);
        if (slug) {
          localStorage.setItem(`matum_ref_${slug}`, refParam);
        }
      }
    } catch (e) {
      console.warn('Could not save referral code to localStorage', e);
    }
  }, [location.search, slug]);

  // Cargar catálogo y producto
  useEffect(() => {
    const fetchData = async () => {
      if (!slug || !productId) return;
      setLoading(true);
      setError(null);

      try {
        // 1. Cargar catálogo por slug (o id)
        let { data: catData, error: catError } = await supabase
          .from('catalogs')
          .select('id, name, slogan, description, user_id, is_active, is_public, logo_url, cover_url, primary_color, background_color, surface_color, text_color, title_color, follow_code, footer_address, footer_phone, footer_email, footer_schedule, usd_to_cup_rate, cup_to_usd_rate, display_currency, share_template, enable_affiliates')
          .eq('slug', slug)
          .maybeSingle();

        if (!catData && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)) {
          const { data: catById } = await supabase
            .from('catalogs')
            .select('id, name, slogan, description, user_id, is_active, is_public, logo_url, cover_url, primary_color, background_color, surface_color, text_color, title_color, follow_code, footer_address, footer_phone, footer_email, footer_schedule, usd_to_cup_rate, cup_to_usd_rate, display_currency, share_template, enable_affiliates')
            .eq('id', slug)
            .maybeSingle();
          catData = catById;
        }

        if (catError || !catData || !catData.is_active) {
          setError('Tienda no disponible o inactiva.');
          setLoading(false);
          return;
        }

        setCatalog(catData);

        // 2. Cargar producto e información del vendedor
        const [prodResult, userResult] = await Promise.all([
          supabase
            .from('products')
            .select('id, catalog_id, name, description, price, currency, price_cup, price_usd, imagen_url, is_out_of_stock, stock_status, category_id, commission_amount, commission_currency, is_active')
            .eq('id', productId)
            .eq('catalog_id', catData.id)
            .maybeSingle(),
          supabase
            .from('users')
            .select('phone, plan')
            .eq('id', catData.user_id)
            .maybeSingle()
        ]);

        if (prodResult.error || !prodResult.data || !prodResult.data.is_active) {
          setError('El producto no está disponible o no existe.');
          setLoading(false);
          return;
        }

        setProduct(prodResult.data);
        setVendorPhone(userResult.data?.phone || catData.footer_phone || '');
        setVendorPlan(userResult.data?.plan || 'free');
      } catch (err: any) {
        console.error('Error fetching product data:', err);
        setError('Ocurrió un error al cargar el producto.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [slug, productId]);

  // Verificar afiliación
  useEffect(() => {
    if (catalog?.id && user?.id) {
      checkAffiliateStatus(catalog.id, user.id);
    }
  }, [catalog?.id, user?.id, checkAffiliateStatus]);

  const isApprovedAffiliate = myAffiliation?.status === 'approved';
  const isCatalogOwner = !!user && catalog?.user_id === user?.id;
  const canSeeCommissions = isApprovedAffiliate || isCatalogOwner;

  // Actualizar el título de la página
  useEffect(() => {
    if (product && catalog) {
      document.title = `${product.name} | ${catalog.name}`;
    }
  }, [product, catalog]);

  // Inyectar tema CSS dinámico del catálogo
  useEffect(() => {
    if (!catalog) return;

    const getContrastColorLocal = (hexColor: string) => {
      if (!hexColor || hexColor.length < 7) return '#ffffff';
      const r = parseInt(hexColor.slice(1, 3), 16);
      const g = parseInt(hexColor.slice(3, 5), 16);
      const b = parseInt(hexColor.slice(5, 7), 16);
      const yiq = (r * 299 + g * 587 + b * 114) / 1000;
      return yiq >= 128 ? '#121212' : '#ffffff';
    };

    const getSecondaryTextColorLocal = (hexColor: string) => {
      const contrast = getContrastColorLocal(hexColor);
      return contrast === '#ffffff' ? '#a0a0a0' : '#4b5563';
    };

    const primaryColor = catalog.primary_color || '#ff782e';
    const backgroundColor = catalog.background_color || '#0a0a0a';
    const surfaceColor = catalog.surface_color || '#1a1a1a';
    const textPrimary = catalog.text_color || getContrastColorLocal(backgroundColor);
    const textSecondary = catalog.text_color ? `${catalog.text_color}b3` : getSecondaryTextColorLocal(backgroundColor);
    const titleColor = catalog.title_color || textPrimary;
    const accentText = getContrastColorLocal(primaryColor);
    const borderVal = surfaceColor === '#1a1a1a' ? '#2a2a2a' : surfaceColor === '#ffffff' ? '#e5e7eb' : `${surfaceColor}33`;
    const surfaceHover = surfaceColor === '#1a1a1a' ? '#242424' : surfaceColor === '#ffffff' ? '#f3f4f6' : `${surfaceColor}dd`;

    const styleEl = document.createElement('style');
    styleEl.id = 'theme-dynamic-styles-product';
    styleEl.innerHTML = `
      :root {
        --background: ${backgroundColor} !important;
        --surface: ${surfaceColor} !important;
        --surface-hover: ${surfaceHover} !important;
        --border: ${borderVal} !important;
        --title-color: ${titleColor} !important;
        --text-primary: ${textPrimary} !important;
        --text-secondary: ${textSecondary} !important;
        --accent: ${primaryColor} !important;
        --accent-hover: ${primaryColor}cc !important;
        --accent-text: ${accentText} !important;
        font-family: 'Poppins', sans-serif !important;
      }
    `;

    const existing = document.getElementById('theme-dynamic-styles-product');
    if (existing) existing.remove();
    document.head.appendChild(styleEl);

    return () => {
      const el = document.getElementById('theme-dynamic-styles-product');
      if (el) el.remove();
    };
  }, [catalog]);

  // Formato de precio y moneda
  const getProductDisplayPrice = (
    price: number | null,
    currency: string,
    priceCup?: number | null,
    priceUsd?: number | null
  ) => {
    if (price === null) return 'Consultar precio';
    const hasDuality = vendorPlan && vendorPlan !== 'free';
    if (!hasDuality) return `${price.toLocaleString()} ${currency}`;

    const displayCurrency = catalog?.display_currency || 'original';
    const usdToCup = Number(catalog?.usd_to_cup_rate) || 1.0;
    const cupToUsd = Number(catalog?.cup_to_usd_rate) || 1.0;

    const pUsd = priceUsd !== null && priceUsd !== undefined ? priceUsd : (currency === 'USD' ? price : price * cupToUsd);
    const pCup = priceCup !== null && priceCup !== undefined ? priceCup : (currency === 'CUP' ? price : price * usdToCup);

    switch (displayCurrency) {
      case 'usd':
        return `${pUsd.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} USD`;
      case 'cup':
        return `${pCup.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} CUP`;
      case 'both':
        return `${pUsd.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} USD / ${pCup.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} CUP`;
      case 'original':
      default:
        return `${price.toLocaleString()} ${currency}`;
    }
  };

  // URL del producto (con código de promotor si aplica)
  const productShareUrl = useMemo(() => {
    if (typeof window === 'undefined' || !slug || !product) return '';
    const baseUrl = `${window.location.protocol}//${window.location.host}`;
    const affiliateParam = isApprovedAffiliate && user?.referral_code ? `?ref=${user.referral_code}` : '';
    return `${baseUrl}/${slug}/p/${product.id}${affiliateParam}`;
  }, [slug, product, isApprovedAffiliate, user?.referral_code]);

  // Función para compartir el producto
  const handleShareProduct = async () => {
    if (!product || !catalog) return;

    const priceText = getProductDisplayPrice(product.price, product.currency, product.price_cup, product.price_usd);
    let text = '';

    if (catalog.share_template) {
      const contactPhone = vendorPhone || '';
      text = catalog.share_template
        .replace(/{product_name}/g, (product.name || '').trim())
        .replace(/{product_description}/g, (product.description || '').trim())
        .replace(/{product_price}/g, priceText.trim())
        .replace(/{product_currency}/g, '')
        .replace(/{catalog_name}/g, (catalog.name || '').trim())
        .replace(/{contact_number}/g, contactPhone)
        .replace(/{store_url}/g, productShareUrl)
        .replace(/{product_url}/g, productShareUrl);
    } else {
      text = `*${product.name}*\n\nPrecio: ${priceText}\n\n${product.description || ''}\n\nVer producto: ${productShareUrl}`.trim();
    }

    await shareContent({
      title: product.name,
      text: text,
      url: productShareUrl,
      imageUrl: product.imagen_url || undefined
    });
  };

  // Copiar enlace directo
  const handleCopyLink = async () => {
    if (!productShareUrl) return;
    try {
      await navigator.clipboard.writeText(productShareUrl);
      setCopiedLink(true);
      toast.success(isApprovedAffiliate ? '¡Enlace de afiliado copiado!' : '¡Enlace del producto copiado!');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (err) {
      toast.error('No se pudo copiar el enlace.');
    }
  };

  // Carrito: Agregar este producto
  const handleAddToCart = () => {
    if (!product) return;
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + quantity } : item);
      }
      return [...prev, { product, quantity }];
    });
    toast.success(`${quantity} ${quantity === 1 ? 'unidad agregada' : 'unidades agregadas'} al carrito`);
  };

  const totalCartCount = useMemo(() => cart.reduce((acc, item) => acc + item.quantity, 0), [cart]);

  // Enviar pedido por WhatsApp
  const handleConfirmOrder = () => {
    if (!product || !catalog) return;

    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error('Por favor, ingresa tu nombre y número de teléfono.');
      return;
    }

    const priceText = getProductDisplayPrice(product.price, product.currency, product.price_cup, product.price_usd);
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

    // Atribución de afiliado
    const activeRef = (slug ? localStorage.getItem(`matum_ref_${slug}`) : null) || localStorage.getItem('matum_active_ref');
    const orderRef = 'ORD-' + Math.random().toString(36).substring(2, 7).toUpperCase();

    if (activeRef) {
      messageText += `🤝 *Referido por:* @${activeRef}\n`;
      messageText += `🔖 *Ref. Pedido:* ${orderRef}\n`;
      messageText += `━━━━━━━━━━━━━━━━━━━━\n`;

      // Registrar comisión si aplica
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

    let formattedPhone = vendorPhone.replace(/\D/g, '');
    if (formattedPhone.length === 8 && (formattedPhone.startsWith('5') || formattedPhone.startsWith('6'))) {
      formattedPhone = '53' + formattedPhone;
    }

    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`;
    window.open(whatsappUrl, '_blank');

    setIsOrderModalOpen(false);
    setShowOrderSuccess(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-secondary text-xs uppercase tracking-widest animate-pulse">Cargando producto...</p>
      </div>
    );
  }

  if (error || !product || !catalog) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 text-red-500 mb-6">
          <AlertTriangle size={32} />
        </div>
        <h1 className="text-xl font-black text-primary mb-2 uppercase tracking-wide">
          {error || 'Producto no encontrado'}
        </h1>
        <p className="text-xs text-secondary max-w-sm mb-6">
          Este producto no existe o ya no está disponible en la tienda.
        </p>
        {slug && (
          <Link
            to={`/${slug}${location.search}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-[var(--accent-text,black)] font-black text-xs uppercase tracking-wider hover:opacity-90 transition-all shadow-lg shadow-accent/20"
          >
            <ArrowLeft size={14} /> Ir a la tienda
          </Link>
        )}
      </div>
    );
  }

  const isOutOfStock = product.is_out_of_stock || product.stock_status === 'out_of_stock';

  return (
    <div className="min-h-screen bg-background text-primary pb-24 md:pb-16 font-poppins selection:bg-accent selection:text-black">
      {/* Barra Superior de Navegación */}
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border transition-all">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link
            to={`/${slug}${location.search}`}
            className="inline-flex items-center gap-2 text-xs font-bold text-secondary hover:text-primary transition-colors py-1 group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span className="hidden sm:inline">Volver a la tienda</span>
            <span className="sm:hidden">Tienda</span>
          </Link>

          {/* Info mini de la tienda */}
          <Link
            to={`/${slug}${location.search}`}
            className="flex items-center gap-2 max-w-[200px] sm:max-w-xs truncate group"
          >
            {catalog.logo_url ? (
              <img 
                src={catalog.logo_url} 
                alt={catalog.name} 
                className="w-7 h-7 rounded-full object-cover border border-border flex-shrink-0" 
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-black flex-shrink-0">
                {catalog.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-xs font-bold truncate group-hover:text-accent transition-colors">
              {catalog.name}
            </span>
          </Link>

          {/* Acciones del Header: Compartir + Carrito */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleShareProduct}
              className="p-2 rounded-xl bg-surface border border-border text-secondary hover:text-accent hover:border-accent/40 active:scale-95 transition-all"
              title="Compartir producto"
            >
              <Share2 size={16} />
            </button>

            {totalCartCount > 0 && (
              <Link
                to={`/${slug}${location.search}`}
                className="relative p-2 rounded-xl bg-accent/15 border border-accent/30 text-accent hover:bg-accent/25 transition-all"
                title="Ver carrito en tienda"
              >
                <ShoppingBag size={16} />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                  {totalCartCount}
                </span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Breadcrumb sutil */}
        <nav className="flex items-center gap-1.5 text-[11px] text-secondary mb-4 overflow-hidden text-ellipsis whitespace-nowrap">
          <Link to={`/${slug}${location.search}`} className="hover:text-accent transition-colors">
            {catalog.name}
          </Link>
          <ChevronRight size={12} className="opacity-50 flex-shrink-0" />
          <span className="text-primary font-medium truncate">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
          {/* Columna Izquierda: Imagen del Producto */}
          <div className="space-y-4">
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-surface border border-border shadow-md">
              {product.imagen_url ? (
                <img 
                  src={product.imagen_url} 
                  alt={product.name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-secondary gap-3 p-8">
                  <ShoppingBag size={64} className="opacity-40" />
                  <span className="text-xs font-bold uppercase tracking-widest text-secondary/70">Sin imagen disponible</span>
                </div>
              )}

              {/* Badge de estado */}
              {isOutOfStock ? (
                <div className="absolute top-3 left-3 bg-red-500/90 backdrop-blur text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-lg">
                  Agotado
                </div>
              ) : (
                <div className="absolute top-3 left-3 bg-emerald-500/90 backdrop-blur text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-lg">
                  Disponible
                </div>
              )}
            </div>
          </div>

          {/* Columna Derecha: Información y Acciones */}
          <div className="flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              {/* Título y Tienda */}
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-primary uppercase tracking-tight leading-snug">
                  {product.name}
                </h1>
                <Link
                  to={`/${slug}${location.search}`}
                  className="inline-flex items-center gap-1.5 text-xs text-secondary hover:text-accent font-medium mt-1 transition-colors"
                >
                  <Store size={13} />
                  <span>Por {catalog.name}</span>
                </Link>
              </div>

              {/* Precios */}
              <div className="p-4 rounded-2xl bg-surface border border-border">
                <span className="text-[10px] font-bold uppercase tracking-wider text-secondary block mb-1">
                  Precio
                </span>
                <div className="text-2xl sm:text-3xl font-black text-[var(--accent)] tracking-tight">
                  {getProductDisplayPrice(product.price, product.currency, product.price_cup, product.price_usd)}
                </div>
              </div>

              {/* Ganancia de Promotor (Visible para Afiliados Aprobados y Dueño) */}
              {canSeeCommissions && (product.commission_amount ?? 0) > 0 && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2.5 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                        <Coins size={16} />
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                          Tu Ganancia de Promotor
                        </span>
                        <span className="text-[11px] text-secondary">
                          Por cada venta que logres de este producto
                        </span>
                      </div>
                    </div>
                    <span className="text-base sm:text-lg font-black text-emerald-500 tabular-nums">
                      +{product.commission_amount} {product.commission_currency || 'CUP'}
                    </span>
                  </div>

                  {/* Botón rápido para copiar enlace con código de afiliado */}
                  <div className="pt-2 border-t border-emerald-500/20 flex flex-wrap gap-2 items-center justify-between">
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                      Comparte este enlace para atribuirte la venta
                    </span>
                    <button
                      onClick={handleCopyLink}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-white font-bold text-xs hover:bg-emerald-600 active:scale-95 transition-all shadow-sm"
                    >
                      {copiedLink ? <Check size={13} /> : <Copy size={13} />}
                      <span>{copiedLink ? '¡Copiado!' : 'Copiar enlace con mi código'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Selector de Cantidad */}
              {!isOutOfStock && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                    Cantidad
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-surface border border-border rounded-xl p-1">
                      <button
                        onClick={() => setQuantity(q => Math.max(1, q - 1))}
                        disabled={quantity <= 1}
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-secondary hover:text-primary hover:bg-surface-hover active:scale-90 transition-all disabled:opacity-40"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-10 text-center font-black text-sm tabular-nums">
                        {quantity}
                      </span>
                      <button
                        onClick={() => setQuantity(q => q + 1)}
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-secondary hover:text-primary hover:bg-surface-hover active:scale-90 transition-all"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <span className="text-xs text-secondary">
                      Subtotal: <b className="text-primary">{((Number(product.price) || 0) * quantity).toLocaleString()} {product.currency}</b>
                    </span>
                  </div>
                </div>
              )}

              {/* Botones de Acción de Compra */}
              <div className="space-y-2.5 pt-2">
                {!isOutOfStock ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      onClick={() => setIsOrderModalOpen(true)}
                      className="w-full py-3.5 px-4 rounded-xl bg-green-600 hover:bg-green-500 active:scale-[0.99] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-green-600/25 transition-all"
                    >
                      <Send size={15} /> Pedir por WhatsApp
                    </button>
                    <button
                      onClick={handleAddToCart}
                      className="w-full py-3.5 px-4 rounded-xl bg-accent hover:bg-accent-hover active:scale-[0.99] text-[var(--accent-text,black)] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-accent/20 transition-all"
                    >
                      <Plus size={15} /> Agregar al Carrito
                    </button>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-center text-red-500 font-bold text-xs">
                    Este producto está agotado por el momento.
                  </div>
                )}

                {/* Botón Compartir Producto */}
                <div className="flex gap-2">
                  <button
                    onClick={handleShareProduct}
                    className="flex-1 py-3 px-4 rounded-xl bg-surface hover:bg-surface-hover active:scale-[0.99] border border-border text-primary font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all group"
                  >
                    <Share2 size={15} className="group-hover:text-accent transition-colors" />
                    <span>Compartir este producto</span>
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className="p-3 rounded-xl bg-surface hover:bg-surface-hover active:scale-[0.99] border border-border text-secondary hover:text-accent transition-all"
                    title="Copiar enlace"
                  >
                    {copiedLink ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              {/* Descripción */}
              {product.description && (
                <div className="pt-4 border-t border-border space-y-2">
                  <h3 className="text-[11px] font-bold text-secondary uppercase tracking-wider">
                    Descripción del producto
                  </h3>
                  <div className="text-xs sm:text-sm text-primary/90 leading-relaxed whitespace-pre-line bg-surface/60 p-4 rounded-2xl border border-border">
                    {product.description}
                  </div>
                </div>
              )}
            </div>

            {/* Tarjeta de la Tienda al Pie */}
            <div className="mt-8 pt-6 border-t border-border">
              <div className="p-4 rounded-2xl bg-surface border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {catalog.logo_url ? (
                    <img 
                      src={catalog.logo_url} 
                      alt={catalog.name} 
                      className="w-12 h-12 rounded-xl object-cover border border-border flex-shrink-0" 
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-accent/20 text-accent font-black text-lg flex items-center justify-center flex-shrink-0">
                      {catalog.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-bold text-primary uppercase">{catalog.name}</h4>
                    {catalog.slogan && (
                      <p className="text-xs text-secondary mt-0.5">{catalog.slogan}</p>
                    )}
                  </div>
                </div>

                <Link
                  to={`/${slug}${location.search}`}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-surface-hover hover:bg-border text-xs font-bold text-primary transition-all"
                >
                  <Store size={14} /> Ver catálogo completo
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal para Confirmar Pedido de este producto por WhatsApp */}
      <Modal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        title="Completar tu Pedido"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-surface-hover border border-border flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-primary uppercase">{product.name}</p>
              <p className="text-[11px] text-secondary">
                Cantidad: {quantity} &bull; Total: {((Number(product.price) || 0) * quantity).toLocaleString()} {product.currency}
              </p>
            </div>
          </div>

          <p className="text-xs text-secondary">
            Ingresa tus datos de contacto para coordinar la entrega directamente con el vendedor por WhatsApp:
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-secondary block mb-1">
                Tu Nombre *
              </label>
              <Input
                placeholder="Ej. Juan Pérez"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-secondary block mb-1">
                Teléfono de Contacto *
              </label>
              <Input
                placeholder="Ej. 52345678"
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-secondary block mb-1">
                Dirección de Entrega (Opcional)
              </label>
              <Input
                placeholder="Ej. Calle 23 entre G y H, Vedado"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
              />
            </div>
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
              onClick={handleConfirmOrder}
              className="flex-1 py-2 px-4 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md"
            >
              <Send size={14} /> Enviar Pedido
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de Éxito al Enviar Pedido */}
      <Modal
        isOpen={showOrderSuccess}
        onClose={() => setShowOrderSuccess(false)}
        title="¡Pedido Enviado!"
      >
        <div className="text-center py-4 space-y-3">
          <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mx-auto">
            <Check size={28} />
          </div>
          <h3 className="text-base font-black uppercase text-primary">¡Tu mensaje fue enviado a WhatsApp!</h3>
          <p className="text-xs text-secondary max-w-sm mx-auto">
            Se ha abierto la conversación de WhatsApp con la tienda para coordinar el pago y la entrega.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              to={`/${slug}${location.search}`}
              className="w-full py-2.5 rounded-xl bg-accent text-[var(--accent-text,black)] font-black text-xs uppercase tracking-wider text-center"
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
