import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Input } from '../../components/ui/Input';
import { supabase } from '../../lib/supabase';
import { 
  ShoppingBag, 
  Search, 
  Plus, 
  Minus, 
  Send, 
  Smartphone, 
  AlertTriangle,
  ArrowLeft,
  X,
  Check,
  Globe,
  ArrowUpDown,
  MapPin,
  Clock,
  Phone,
  Mail,
  Settings,
  Copy,
  Coins,
  Share2
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { toast } from 'react-hot-toast';
import { DropdownMenu } from '../../components/ui/DropdownMenu';
import { useAuthStore } from '../../store/authStore';
import { Modal } from '../../components/ui/Modal';
import { Switch } from '../../components/ui/Switch';
import { CategoryIcon } from '../../components/ui/CategoryIcon';
import { shareContent } from '../../lib/share';

const InstagramIcon = ({ size = 20, className, ...props }: { size?: number; className?: string; [key: string]: any }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const FacebookIcon = ({ size = 20, className, ...props }: { size?: number; className?: string; [key: string]: any }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

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
  follow_code?: string | null;
  footer_address?: string | null;
  footer_phone?: string | null;
  footer_email?: string | null;
  footer_schedule?: string | null;
  footer_instagram?: string | null;
  footer_facebook?: string | null;
  min_order_amount?: number | null;
  min_order_currency?: string | null;
  usd_to_cup_rate?: number;
  cup_to_usd_rate?: number;
  display_currency?: 'original' | 'usd' | 'cup' | 'both';
}

interface PublicProduct {
  id: string;
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
}

interface Category {
  id: number;
  name: string;
  icon: string | null;
  display_order: number;
}

interface CartItem {
  product: PublicProduct;
  quantity: number;
}

export const PublicCatalogPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuthStore();
  const [catalog, setCatalog] = useState<PublicCatalog | null>(null);
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [vendorPhone, setVendorPhone] = useState<string>('');
  const [vendorName, setVendorName] = useState<string>('');
  const [vendorPlan, setVendorPlan] = useState<string>('free');
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados de la UI del cliente
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showOrderSuccess, setShowOrderSuccess] = useState(false);
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc'>('default');
  const [selectedProduct, setSelectedProduct] = useState<PublicProduct | null>(null);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | string | null>(null);

  // Estados para el formulario de cliente
  const [isCustomerFormOpen, setIsCustomerFormOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isDifferentRecipient, setIsDifferentRecipient] = useState(false);
  const [deliveryName, setDeliveryName] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');

  // Estados de paginación y diseño responsivo
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const [visibleCount, setVisibleCount] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Escuchar el cambio de tamaño de pantalla
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Reiniciar paginación cuando cambie la búsqueda, la categoría o el orden
  useEffect(() => {
    setVisibleCount(10);
    setCurrentPage(1);
  }, [searchQuery, sortBy, selectedCategoryId]);

  useEffect(() => {
    if (slug) {
      loadPublicCatalog();
    }
  }, [slug]);

  const loadPublicCatalog = async () => {
    setLoading(true);
    setProductsLoading(true);
    setError(null);
    try {
      // 1. Obtener catálogo público y activo por su slug (consulta ultra rápida indexada)
      const { data: catData, error: catError } = await supabase
        .from('catalogs')
        .select('id, name, slogan, description, user_id, is_active, is_public, logo_url, cover_url, primary_color, background_color, surface_color, text_color, follow_code, footer_address, footer_phone, footer_email, footer_schedule, footer_instagram, footer_facebook, min_order_amount, min_order_currency, usd_to_cup_rate, cup_to_usd_rate, display_currency')
        .eq('slug', slug)
        .single();

      if (catError || !catData) {
        setError('Catálogo no encontrado.');
        setLoading(false);
        return;
      }

      if (!catData.is_active || !catData.is_public) {
        setError('Este catálogo no se encuentra disponible actualmente.');
        setLoading(false);
        return;
      }

      // Establecemos el catálogo base inmediatamente y quitamos el loading general
      // Esto renderizará el shell de la tienda, colores del tema, header, cover, logo, etc.
      setCatalog(catData);
      setLoading(false);

      // 2. Obtener productos, categorías e info del vendedor en paralelo (concurrente)
      try {
        const [prodResult, catKeysResult, userResult] = await Promise.all([
          supabase
            .from('products')
            .select('id, name, description, price, currency, price_cup, price_usd, imagen_url, is_out_of_stock, stock_status, category_id')
            .eq('catalog_id', catData.id)
            .eq('is_active', true)
            .order('position', { ascending: true }),
          supabase
            .from('categories')
            .select('id, name, icon, display_order')
            .eq('catalog_id', catData.id)
            .eq('is_active', true)
            .order('display_order', { ascending: true }),
          supabase
            .from('users')
            .select('phone, full_name, plan')
            .eq('id', catData.user_id)
            .single()
        ]);

        // Manejar productos
        if (prodResult.error) throw prodResult.error;
        const availableProducts = (prodResult.data || []).filter(
          p => !p.is_out_of_stock && p.stock_status !== 'out_of_stock'
        );
        setProducts(availableProducts);

        // Manejar categorías
        if (!catKeysResult.error && catKeysResult.data) {
          setCategories(catKeysResult.data);
        }

        // Manejar información del vendedor
        if (!userResult.error && userResult.data) {
          setVendorPhone(userResult.data.phone || '');
          setVendorName(userResult.data.full_name || 'Vendedor Matum');
          setVendorPlan(userResult.data.plan || 'free');
        }

      } catch (parallelError: any) {
        console.error('Error cargando detalles secundarios de la tienda:', parallelError);
        toast.error('Error al cargar algunos elementos de la tienda. Intente recargar.');
      } finally {
        setProductsLoading(false);
      }

    } catch (err: any) {
      console.error(err);
      setError('Ocurrió un error al cargar el catálogo. Inténtalo de nuevo.');
      setLoading(false);
    }
  };

  // Agregar al carrito
  const addToCart = (product: PublicProduct) => {
    setCart(prevCart => {
      const existing = prevCart.find(item => item.product.id === product.id);
      if (existing) {
        return prevCart.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { product, quantity: 1 }];
    });
  };

  // Quitar del carrito / Restar cantidad
  const removeFromCart = (productId: string) => {
    setCart(prevCart => {
      const existing = prevCart.find(item => item.product.id === productId);
      if (!existing) return prevCart;
      
      if (existing.quantity === 1) {
        return prevCart.filter(item => item.product.id !== productId);
      }
      
      return prevCart.map(item => 
        item.product.id === productId 
          ? { ...item, quantity: item.quantity - 1 }
          : item
      );
    });
  };

  // Obtener cantidad de un producto específico en el carrito
  const getProductQuantity = (productId: string) => {
    const item = cart.find(item => item.product.id === productId);
    return item ? item.quantity : 0;
  };

  // Establecer cantidad específica en el carrito
  const updateCartQuantity = (product: PublicProduct, qty: number) => {
    if (qty <= 0) {
      setCart(prevCart => prevCart.filter(item => item.product.id !== product.id));
      return;
    }
    setCart(prevCart => {
      const existing = prevCart.find(item => item.product.id === product.id);
      if (existing) {
        return prevCart.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: qty }
            : item
        );
      }
      return [...prevCart, { product, quantity: qty }];
    });
  };

  // Limpiar carrito
  const clearCart = () => {
    setCart([]);
  };

  const getProductDisplayPrice = (
    price: number | null,
    currency: string,
    priceCup?: number | null,
    priceUsd?: number | null
  ) => {
    if (price === null) return 'Consultar precio';
    
    // Si es un usuario Free (gratis), ignorar la dualidad y mostrar en la moneda original
    const hasDuality = vendorPlan && vendorPlan !== 'free';
    if (!hasDuality) {
      return `${price.toLocaleString()} ${currency}`;
    }

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

  const getSubtotalDisplay = (item: CartItem) => {
    const hasDuality = vendorPlan && vendorPlan !== 'free';
    const displayCurrency = hasDuality ? (catalog?.display_currency || 'original') : 'original';
    const price = item.product.price || 0;
    const currency = item.product.currency;
    const qty = item.quantity;
    
    const usdToCup = Number(catalog?.usd_to_cup_rate) || 1.0;
    const cupToUsd = Number(catalog?.cup_to_usd_rate) || 1.0;

    const pUsd = item.product.price_usd !== null && item.product.price_usd !== undefined 
      ? item.product.price_usd 
      : (currency === 'USD' ? price : price * cupToUsd);
    const pCup = item.product.price_cup !== null && item.product.price_cup !== undefined 
      ? item.product.price_cup 
      : (currency === 'CUP' ? price : price * usdToCup);

    switch (displayCurrency) {
      case 'usd':
        return `${(pUsd * qty).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} USD`;
      case 'cup':
        return `${(pCup * qty).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} CUP`;
      case 'both':
        return `${(pUsd * qty).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} USD / ${(pCup * qty).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} CUP`;
      case 'original':
      default:
        return `${(price * qty).toLocaleString()} ${currency}`;
    }
  };

  // Totales acumulados por moneda
  const getTotals = () => {
    const hasDuality = vendorPlan && vendorPlan !== 'free';
    const displayCurrency = hasDuality ? (catalog?.display_currency || 'original') : 'original';
    
    const totals: Record<string, number> = {};
    
    if (displayCurrency === 'usd') {
      let totalUsd = 0;
      cart.forEach(item => {
        const usdToCup = Number(catalog?.usd_to_cup_rate) || 1.0;
        const cupToUsd = Number(catalog?.cup_to_usd_rate) || 1.0;
        const price = item.product.price || 0;
        const currency = item.product.currency;
        const pUsd = item.product.price_usd !== null && item.product.price_usd !== undefined 
          ? item.product.price_usd 
          : (currency === 'USD' ? price : price * cupToUsd);
        totalUsd += pUsd * item.quantity;
      });
      totals['USD'] = totalUsd;
    } else if (displayCurrency === 'cup') {
      let totalCup = 0;
      cart.forEach(item => {
        const usdToCup = Number(catalog?.usd_to_cup_rate) || 1.0;
        const cupToUsd = Number(catalog?.cup_to_usd_rate) || 1.0;
        const price = item.product.price || 0;
        const currency = item.product.currency;
        const pCup = item.product.price_cup !== null && item.product.price_cup !== undefined 
          ? item.product.price_cup 
          : (currency === 'CUP' ? price : price * usdToCup);
        totalCup += pCup * item.quantity;
      });
      totals['CUP'] = totalCup;
    } else if (displayCurrency === 'both') {
      let totalUsd = 0;
      let totalCup = 0;
      cart.forEach(item => {
        const usdToCup = Number(catalog?.usd_to_cup_rate) || 1.0;
        const cupToUsd = Number(catalog?.cup_to_usd_rate) || 1.0;
        const price = item.product.price || 0;
        const currency = item.product.currency;
        const pUsd = item.product.price_usd !== null && item.product.price_usd !== undefined 
          ? item.product.price_usd 
          : (currency === 'USD' ? price : price * cupToUsd);
        const pCup = item.product.price_cup !== null && item.product.price_cup !== undefined 
          ? item.product.price_cup 
          : (currency === 'CUP' ? price : price * usdToCup);
        totalUsd += pUsd * item.quantity;
        totalCup += pCup * item.quantity;
      });
      totals['USD'] = totalUsd;
      totals['CUP'] = totalCup;
    } else {
      // original currency behavior
      cart.forEach(item => {
        const currency = item.product.currency || 'CUP';
        const price = item.product.price || 0;
        totals[currency] = (totals[currency] || 0) + (price * item.quantity);
      });
    }
    
    return totals;
  };

  const totals = getTotals();

  // Calcular total unificado en la moneda del monto mínimo
  const getUnifiedTotal = () => {
    if (!catalog) return 0;
    const minCurrency = catalog.min_order_currency || 'CUP';
    const rateUsdToCup = catalog.usd_to_cup_rate || 1.0;
    const rateCupToUsd = catalog.cup_to_usd_rate || 1.0;

    let total = 0;
    cart.forEach(item => {
      const prodCurrency = item.product.currency || 'CUP';
      const price = item.product.price || 0;
      const subtotal = price * item.quantity;

      if (prodCurrency === minCurrency) {
        total += subtotal;
      } else if (minCurrency === 'CUP' && prodCurrency === 'USD') {
        total += subtotal * rateUsdToCup;
      } else if (minCurrency === 'USD' && prodCurrency === 'CUP') {
        total += subtotal * rateCupToUsd;
      } else {
        total += subtotal;
      }
    });

    return total;
  };

  const unifiedTotal = getUnifiedTotal();
  const minAmount = catalog?.min_order_amount || 0;
  const isMinAmountMet = minAmount <= 0 || unifiedTotal >= minAmount;
  const missingAmount = minAmount > 0 ? Math.max(0, minAmount - unifiedTotal) : 0;

  const handleOpenCustomerForm = () => {
    if (!isMinAmountMet) {
      toast.error(`El monto mínimo de pedido es de ${minAmount.toLocaleString()} ${catalog?.min_order_currency}. Te faltan ${missingAmount.toLocaleString()} ${catalog?.min_order_currency}.`);
      return;
    }
    setIsCustomerFormOpen(true);
  };

  // Filtrado de productos por búsqueda, categoría y ordenamiento por precio
  const filteredProducts = products
    .filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = selectedCategoryId === null ||
        (selectedCategoryId === 'none' && !p.category_id) ||
        (selectedCategoryId !== 'none' && p.category_id === Number(selectedCategoryId));

      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'price-asc') {
        return (a.price || 0) - (b.price || 0);
      }
      if (sortBy === 'price-desc') {
        return (b.price || 0) - (a.price || 0);
      }
      return 0; // default (posición)
    });

  const totalItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  // Asegurar que la página actual no sea mayor que el total de páginas si este cambia
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Efecto para inyectar dinámicamente el tema en :root
  useEffect(() => {
    if (!catalog) return;

    const getContrastColorLocal = (hexColor: string) => {
      if (!hexColor || !/^#[0-9A-F]{6}$/i.test(hexColor)) return '#ffffff';
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
    const textSecondary = catalog.text_color 
      ? `${catalog.text_color}b3` 
      : getSecondaryTextColorLocal(backgroundColor);
    const accentText = getContrastColorLocal(primaryColor);
    
    const borderVal = surfaceColor === '#1a1a1a' ? '#2a2a2a' : surfaceColor === '#ffffff' ? '#e5e7eb' : `${surfaceColor}33`;
    const surfaceHover = surfaceColor === '#1a1a1a' ? '#242424' : surfaceColor === '#ffffff' ? '#f3f4f6' : `${surfaceColor}dd`;

    const styleEl = document.createElement('style');
    styleEl.id = 'theme-dynamic-styles';
    styleEl.innerHTML = `
      :root {
        --background: ${backgroundColor} !important;
        --surface: ${surfaceColor} !important;
        --surface-hover: ${surfaceHover} !important;
        --border: ${borderVal} !important;
        --text-primary: ${textPrimary} !important;
        --text-secondary: ${textSecondary} !important;
        --accent: ${primaryColor} !important;
        --accent-hover: ${primaryColor}cc !important;
        --accent-text: ${accentText} !important;
      }
    `;

    const existing = document.getElementById('theme-dynamic-styles');
    if (existing) existing.remove();
    document.head.appendChild(styleEl);

    return () => {
      const el = document.getElementById('theme-dynamic-styles');
      if (el) el.remove();
    };
  }, [catalog]);

  const displayedProducts = isMobile
    ? filteredProducts.slice(0, visibleCount)
    : filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Referencia para guardar el Intersection Observer actual y evitar fugas de memoria
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Callback ref para el elemento de scroll infinito en móviles
  const lastElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!isMobile) return;

      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      if (!node) return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            setVisibleCount((prev) => Math.min(prev + 10, filteredProducts.length));
          }
        },
        { threshold: 0.1, rootMargin: '100px' }
      );

      observerRef.current.observe(node);
    },
    [isMobile, filteredProducts.length]
  );

  // Desconectar el observer al desmontar el componente
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Enviar pedido por WhatsApp con datos de envío
  const handleSendOrder = (
    name: string,
    address: string,
    phone: string,
    isDifferentRecipient: boolean,
    deliveryName: string,
    deliveryPhone: string
  ) => {
    if (cart.length === 0 || !catalog) return;

    let messageText = `🛒 *Nuevo Pedido - Matum*\n`;
    messageText += `━━━━━━━━━━━━━━━━━━━━\n`;
    messageText += `*Tienda:* ${catalog.name}\n`;
    if (slug) {
      messageText += `*Enlace:* matum.com/${slug}\n`;
    }
    messageText += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    messageText += `👤 *Datos del Cliente:*\n`;
    messageText += `• *Nombre:* ${name}\n`;
    messageText += `• *Dirección de Entrega:* ${address}\n`;
    messageText += `• *Teléfono de Contacto:* ${phone}\n`;

    if (isDifferentRecipient) {
      messageText += `\n🚚 *Persona que recibe (Destinatario):*\n`;
      messageText += `• *Nombre:* ${deliveryName}\n`;
      messageText += `• *Teléfono:* ${deliveryPhone}\n`;
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
      messageText += `   - Subtotal: *${subtotal} ${currency}*\n\n`;
    });

    messageText += `━━━━━━━━━━━━━━━━━━━━\n`;
    messageText += `💰 *Totales del Pedido:*\n`;
    Object.entries(totals).forEach(([curr, val]) => {
      messageText += `• *Total en ${curr}:* ${val.toFixed(2)} ${curr}\n`;
    });
    messageText += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    messageText += `¡Hola! Me gustaría coordinar este pedido de productos. ¿Están disponibles?`;

    // Limpiar número de teléfono
    let formattedPhone = vendorPhone.replace(/\D/g, '');
    
    // Si es un número cubano de 8 dígitos que empieza con 5 o 6, agregar código de país 53 por defecto
    if (formattedPhone.length === 8 && (formattedPhone.startsWith('5') || formattedPhone.startsWith('6'))) {
      formattedPhone = '53' + formattedPhone;
    }

    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`;
    
    // Abrir enlace en nueva pestaña
    window.open(whatsappUrl, '_blank');
    setShowOrderSuccess(true);
    clearCart();
    setIsCartOpen(false);
    setIsCustomerFormOpen(false);
    // Limpiar formulario
    setCustomerName('');
    setCustomerAddress('');
    setCustomerPhone('');
    setIsDifferentRecipient(false);
    setDeliveryName('');
    setDeliveryPhone('');
  };

  const handleShareCatalog = async () => {
    await shareContent({
      title: catalog?.name || 'Tienda',
      text: catalog?.slogan || '¡Mira esta tienda en Matum!',
      url: window.location.href,
      imageUrl: catalog?.logo_url || undefined,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-secondary text-xs uppercase tracking-widest animate-pulse">Cargando tienda...</p>
      </div>
    );
  }

  if (error || !catalog) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 text-red-500 mb-6">
          <AlertTriangle size={32} />
        </div>
        <h1 className="text-xl font-black text-primary mb-2 uppercase tracking-wide">
          {error === 'Catálogo no encontrado.' ? 'Tienda no encontrada' : 'Tienda Inactiva'}
        </h1>
        <p className="text-secondary text-sm max-w-xs mb-8">
          El enlace que has ingresado no existe o no tiene permiso de acceso público. Por favor, contacta al vendedor.
        </p>
        <Link to="/login">
          <Button variant="secondary" icon={ArrowLeft}>
            Volver a Matum
          </Button>
        </Link>
      </div>
    );
  }

  // Función para determinar si un color hexadecimal es claro u oscuro (YIQ)
  const getContrastColor = (hexColor: string) => {
    if (!hexColor || !/^#[0-9A-F]{6}$/i.test(hexColor)) return '#ffffff';
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? '#121212' : '#ffffff';
  };

  // Función para obtener texto secundario en base al primario
  const getSecondaryTextColor = (hexColor: string) => {
    const contrast = getContrastColor(hexColor);
    return contrast === '#ffffff' ? '#a0a0a0' : '#4b5563';
  };

  const primaryColor = catalog.primary_color || '#ff782e';
  const backgroundColor = catalog.background_color || '#0a0a0a';
  const surfaceColor = catalog.surface_color || '#1a1a1a';

  const textPrimary = catalog.text_color || getContrastColor(backgroundColor);
  const textSecondary = catalog.text_color 
    ? `${catalog.text_color}b3` 
    : getSecondaryTextColor(backgroundColor);

  // Colores para contrastar texto del botón y tarjetas
  const accentText = getContrastColor(primaryColor);
  
  const borderVal = surfaceColor === '#1a1a1a' ? '#2a2a2a' : surfaceColor === '#ffffff' ? '#e5e7eb' : `${surfaceColor}33`;

  // Construir las variables de tema CSS en línea
  const themeStyles = {
    '--background': backgroundColor,
    '--surface': surfaceColor,
    '--surface-hover': surfaceColor === '#1a1a1a' ? '#242424' : surfaceColor === '#ffffff' ? '#f3f4f6' : `${surfaceColor}dd`,
    '--border': borderVal,
    '--text-primary': textPrimary,
    '--text-secondary': textSecondary,
    '--accent': primaryColor,
    '--accent-hover': `${primaryColor}cc`, // opacity hover
    '--accent-text': accentText,
  } as React.CSSProperties;

  const hasCatalogRole = !!user && (user.id === catalog?.user_id || user.role === 'admin');

  return (
    <div style={themeStyles} className={`flex flex-col min-h-screen bg-[var(--background)] text-[var(--text-primary)] ${totalItemsCount > 0 ? 'pb-28' : ''}`}>
      {/* Banner de Portada */}
      <div className="relative h-28 sm:h-40 w-full bg-cover bg-center overflow-hidden border-b border-border">
        {catalog.cover_url ? (
          <img 
            src={catalog.cover_url} 
            alt="Portada Tienda" 
            className="w-full h-full object-cover animate-in fade-in duration-300"
          />
        ) : (
          /* Fondo de degradado premium por defecto */
          <div className="w-full h-full bg-gradient-to-tr from-surface via-surface-hover to-[var(--accent)]/15 relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[var(--accent)]/10 via-transparent to-transparent" />
          </div>
        )}
      </div>

      {/* Todo el contenido de la tienda en un solo contenedor para alineación perfecta */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 pb-2">
        {/* Cabecera: Logo + Nombre a la izquierda, Botones a la derecha */}
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          {/* Logo + Nombre */}
          <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
            {/* Logo de la tienda */}
            <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-background border-4 border-background flex-shrink-0 relative -mt-10 sm:-mt-16">
              {catalog.logo_url ? (
                <img 
                  src={catalog.logo_url} 
                  alt="Logo Tienda" 
                  className="w-full h-full object-cover animate-in fade-in duration-300"
                />
              ) : (
                /* Logo con inicial por defecto */
                <div className="w-full h-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent)]/40 flex items-center justify-center text-[var(--accent-text,black)] font-black text-2xl sm:text-4xl select-none">
                  {catalog.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Nombre y Descripción */}
            <div className="pb-1 min-w-0 flex-1">
              <h1 className="text-sm sm:text-2xl font-black text-primary uppercase tracking-tight break-words">
                {catalog.name}
              </h1>
              {catalog.slogan && (
                <p className="text-secondary text-[10px] sm:text-sm mt-1.5 max-w-2xl leading-relaxed whitespace-pre-line italic break-words">
                  {catalog.slogan}
                </p>
              )}
            </div>
          </div>

          {/* Botones de acción: Contactar + Compartir (siempre visibles, alineados a la derecha) */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 mt-1 sm:mt-2">
            {vendorPhone && (
              <a 
                href={`https://wa.me/${vendorPhone.replace(/\D/g, '')}`} 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 bg-green-600 hover:bg-green-500 text-white text-[9px] sm:text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all border border-green-600/20 active:scale-95 shadow-sm cursor-pointer"
              >
                <Smartphone size={10} /> Contactar
              </a>
            )}
            <button 
              onClick={handleShareCatalog}
              className="inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] text-[9px] sm:text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all border border-[var(--accent)]/20 active:scale-95 shadow-sm cursor-pointer"
            >
              <Share2 size={10} /> Compartir
            </button>
          </div>
        </div>

        {/* Buscador y Ordenador de productos */}
        <div className="mt-6 flex items-center gap-2 w-full">
          <Input
            type="text"
            placeholder="Buscar en la tienda..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={Search}
            className="!h-12 py-0"
          />

          <DropdownMenu
            trigger={
              <button className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-[var(--surface-hover)] border border-border rounded-xl hover:bg-surface text-primary transition-colors cursor-pointer select-none" title="Ordenar">
                <ArrowUpDown size={14} className="text-[var(--accent)]" />
              </button>
            }
            items={[
              {
                label: 'Posición por defecto',
                icon: sortBy === 'default' ? Check : undefined,
                onClick: () => setSortBy('default')
              },
              {
                label: 'Precio: Menor a Mayor',
                icon: sortBy === 'price-asc' ? Check : undefined,
                onClick: () => setSortBy('price-asc')
              },
              {
                label: 'Precio: Mayor a Menor',
                icon: sortBy === 'price-desc' ? Check : undefined,
                onClick: () => setSortBy('price-desc')
              }
            ]}
          />
        </div>

        {/* Chips de Categorías */}
        {productsLoading ? (
          <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none select-none">
            <div className="w-16 h-7 bg-[var(--surface)] border border-border animate-pulse rounded-full" />
            <div className="w-24 h-7 bg-[var(--surface)] border border-border animate-pulse rounded-full" />
            <div className="w-20 h-7 bg-[var(--surface)] border border-border animate-pulse rounded-full" />
            <div className="w-28 h-7 bg-[var(--surface)] border border-border animate-pulse rounded-full" />
          </div>
        ) : (
          categories.length > 0 && (
            <div className="mt-4 mb-4 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none select-none">
              <button
                onClick={() => setSelectedCategoryId(null)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                  selectedCategoryId === null
                    ? 'bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--accent)]'
                    : 'bg-[var(--surface-hover)] border-border text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-white/20'
                }`}
              >
                Todos
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all border flex items-center gap-1.5 ${
                    selectedCategoryId === cat.id
                      ? 'bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--accent)]'
                      : 'bg-[var(--surface-hover)] border-border text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-white/20'
                  }`}
                >
                  <CategoryIcon name={cat.icon} size={14} />
                  <span>{cat.name}</span>
                </button>
              ))}
              <button
                onClick={() => setSelectedCategoryId('none')}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                  selectedCategoryId === 'none'
                    ? 'bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--accent)]'
                    : 'bg-[var(--surface-hover)] border-border text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-white/20'
                }`}
              >
                Sin categoría
              </button>
            </div>
          )
        )}

        {productsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div 
                key={i} 
                className="card flex gap-4 p-4 border border-border animate-pulse select-none"
              >
                {/* Imagen de Producto Esqueleto */}
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-[var(--surface-hover)] flex-shrink-0 relative border border-border" />
                
                {/* Detalles del Producto Esqueleto */}
                <div className="flex flex-col justify-between flex-grow min-w-0 py-1">
                  <div className="space-y-2">
                    <div className="h-4 bg-[var(--surface-hover)] rounded-md w-2/3" />
                    <div className="h-3 bg-[var(--surface-hover)] rounded-md w-full" />
                    <div className="h-3 bg-[var(--surface-hover)] rounded-md w-5/6" />
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
                    <div className="h-4 bg-[var(--surface-hover)] rounded-md w-1/4" />
                    <div className="h-7 bg-[var(--surface-hover)] rounded-lg w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-secondary text-sm">No se encontraron productos en esta tienda.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {displayedProducts.map((product) => {
                const qty = getProductQuantity(product.id);
                
                return (
                  <div 
                    key={product.id} 
                    onClick={() => setSelectedProduct(product)}
                    className="card relative flex gap-4 p-4 border border-border hover:border-accent/40 hover:bg-surface-hover/20 cursor-pointer transition-all active:scale-[0.99]"
                  >
                    {/* Imagen de Producto */}
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-surface-hover flex-shrink-0 relative border border-border">
                      {product.imagen_url ? (
                        <img 
                          src={product.imagen_url} 
                          alt={product.name} 
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-secondary">
                          <ShoppingBag size={24} />
                        </div>
                      )}
                    </div>

                    {/* Detalles del Producto */}
                    <div className="flex flex-col justify-between flex-grow min-w-0">
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-primary truncate uppercase">
                          {product.name}
                        </h3>
                        {product.description && (
                          <p className="text-[10px] sm:text-xs text-secondary mt-1 line-clamp-2 leading-relaxed">
                            {product.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
                        <span className="text-xs sm:text-sm font-black text-[var(--accent)]">
                          {getProductDisplayPrice(product.price, product.currency, product.price_cup, product.price_usd)}
                        </span>

                        {/* Control de cantidades */}
                        <div 
                          className="flex items-center gap-1 bg-surface-hover p-1 rounded-lg border border-border"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {qty > 0 ? (
                            <>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeFromCart(product.id);
                                }}
                                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-surface active:scale-90 transition-all text-secondary hover:text-primary"
                              >
                                <Minus size={12} />
                              </button>
                              <span className="w-6 text-center text-xs font-bold text-primary tabular-nums">
                                {qty}
                              </span>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToCart(product);
                                }}
                                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-surface active:scale-90 transition-all text-secondary hover:text-primary"
                              >
                                <Plus size={12} />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart(product);
                              }}
                              className="px-3 py-1.5 flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-accent hover:bg-accent-hover text-[var(--accent-text,black)] rounded-lg hover:scale-[1.02] active:scale-[0.98] transition-all border border-accent/20"
                            >
                              <Plus size={10} /> Agregar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Trigger de Scroll Infinito para Móviles */}
            {isMobile && visibleCount < filteredProducts.length && (
              <div 
                ref={lastElementRef}
                id="infinite-scroll-trigger" 
                className="h-20 flex items-center justify-center mt-6"
              >
                <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* Paginación Tradicional para PC */}
            {!isMobile && totalPages > 1 && (
              <div className="flex items-center justify-center gap-1.5 mt-10 select-none">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="px-3 py-1.5 rounded-lg border border-border bg-[var(--surface-hover)] text-xs font-bold text-primary hover:bg-surface hover:border-accent/40 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                >
                  Anterior
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      currentPage === page
                        ? 'bg-accent text-[var(--accent-text,black)] font-black border border-accent/20 scale-105 shadow-md shadow-accent/10'
                        : 'border border-border bg-[var(--surface-hover)] text-primary hover:bg-surface hover:border-accent/40'
                    }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="px-3 py-1.5 rounded-lg border border-border bg-[var(--surface-hover)] text-xs font-bold text-primary hover:bg-surface hover:border-accent/40 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                >
                  Siguiente
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer Premium de la Tienda */}
      {catalog && (
        <footer className="w-full bg-[var(--surface)] border-t border-border mt-16 py-12 px-4">
          <div className="w-full max-w-4xl mx-auto flex flex-col md:flex-row justify-between gap-8">
            {/* Info principal de la tienda */}
            <div className="space-y-4 max-w-xs">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[var(--accent)] text-[var(--accent-text)] flex items-center justify-center font-black text-sm uppercase">
                  {catalog.name.charAt(0)}
                </div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary">{catalog.name}</h4>
              </div>
              {catalog.description && (
                <div className="text-[10px] text-secondary leading-relaxed whitespace-pre-line">
                  {isDescExpanded || catalog.description.length <= 150 ? (
                    <>
                      {catalog.description}
                      {catalog.description.length > 150 && (
                        <button 
                          onClick={() => setIsDescExpanded(false)}
                          className="text-[var(--accent)] hover:underline ml-1 font-bold inline-block cursor-pointer select-none"
                        >
                          Ver menos
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      {catalog.description.slice(0, 150)}
                      <button 
                        onClick={() => setIsDescExpanded(true)}
                        className="text-[var(--accent)] hover:underline ml-1 font-bold inline-block cursor-pointer select-none"
                      >
                        ...ver más
                      </button>
                    </>
                  )}
                </div>
              )}
              {catalog.follow_code && (
                <div className="flex items-center gap-1.5 text-[10px] text-secondary font-medium tracking-wide">
                  <span>Código:</span>
                  <span className="font-mono bg-[var(--surface-hover)] border border-border px-1.5 py-0.5 rounded text-[var(--accent)] font-extrabold tracking-wider">{catalog.follow_code}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(catalog.follow_code || '');
                      toast.success('¡Código copiado al portapapeles!');
                    }}
                    className="p-1 hover:bg-[var(--surface-hover)] rounded transition-colors text-secondary hover:text-primary cursor-pointer active:scale-90"
                    title="Copiar código de seguimiento"
                  >
                    <Copy size={11} />
                  </button>
                </div>
              )}
              <p className="text-[9px] text-secondary/65 uppercase tracking-widest font-medium">
                © {new Date().getFullYear()} {catalog.name}. Todos los derechos reservados.
              </p>
            </div>

            {/* Datos de contacto y ubicación */}
            <div className="flex flex-col sm:flex-row gap-8 md:gap-16">
              {/* Ubicación y Horarios */}
              {(catalog.footer_address || catalog.footer_schedule) && (
                <div className="space-y-3">
                  <h5 className="text-[10px] font-bold text-secondary uppercase tracking-widest">Ubicación y Horarios</h5>
                  <ul className="space-y-2 text-[11px]">
                    {catalog.footer_address && (
                      <li className="flex items-start gap-2 text-secondary">
                        <MapPin size={14} className="text-[var(--accent)] flex-shrink-0 mt-0.5" />
                        <span>{catalog.footer_address}</span>
                      </li>
                    )}
                    {catalog.footer_schedule && (
                      <li className="flex items-start gap-2 text-secondary">
                        <Clock size={14} className="text-[var(--accent)] flex-shrink-0 mt-0.5" />
                        <span>{catalog.footer_schedule}</span>
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Canales de Contacto */}
              {(catalog.footer_phone || catalog.footer_email || catalog.footer_instagram || catalog.footer_facebook) && (
                <div className="space-y-3">
                  <h5 className="text-[10px] font-bold text-secondary uppercase tracking-widest">Contacto</h5>
                  <ul className="space-y-2 text-[11px]">
                    {catalog.footer_phone && (
                      <li className="flex items-center gap-2 text-secondary">
                        <Phone size={14} className="text-[var(--accent)] flex-shrink-0" />
                        <a href={`https://wa.me/${catalog.footer_phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="hover:underline">
                          {catalog.footer_phone}
                        </a>
                      </li>
                    )}
                    {catalog.footer_email && (
                      <li className="flex items-center gap-2 text-secondary">
                        <Mail size={14} className="text-[var(--accent)] flex-shrink-0" />
                        <a href={`mailto:${catalog.footer_email}`} className="hover:underline">
                          {catalog.footer_email}
                        </a>
                      </li>
                    )}
                  </ul>
                  
                  {/* Redes Sociales */}
                  {(catalog.footer_instagram || catalog.footer_facebook) && (
                    <div className="flex items-center gap-3 pt-2">
                      {catalog.footer_instagram && (
                        <a 
                          href={`https://instagram.com/${catalog.footer_instagram}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="w-7 h-7 rounded-lg bg-[var(--surface-hover)] border border-border flex items-center justify-center text-secondary hover:text-[var(--accent)] hover:border-[var(--accent)]/30 transition-all"
                          title="Instagram"
                        >
                          <InstagramIcon size={14} />
                        </a>
                      )}
                      {catalog.footer_facebook && (
                        <a 
                          href={`https://facebook.com/${catalog.footer_facebook}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="w-7 h-7 rounded-lg bg-[var(--surface-hover)] border border-border flex items-center justify-center text-secondary hover:text-[var(--accent)] hover:border-[var(--accent)]/30 transition-all"
                          title="Facebook"
                        >
                          <FacebookIcon size={14} />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Acceso de Administración */}
            {hasCatalogRole && (
              <div className="space-y-3 min-w-[160px]">
                <h5 className="text-[10px] font-bold text-secondary uppercase tracking-widest">Administración</h5>
                <div className="flex flex-col gap-2">
                  <Link 
                    to="/" 
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--surface-hover)] border border-border text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--background)] hover:border-[var(--accent)]/40 hover:text-[var(--accent)] transition-all w-full sm:w-fit cursor-pointer group"
                  >
                    <ArrowLeft size={14} className="text-secondary group-hover:text-[var(--accent)] transition-colors" />
                    <span>Regresar al Home</span>
                  </Link>
                  <Link 
                    to={`/catalogs/${catalog.id}`} 
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--surface-hover)] border border-border text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--background)] hover:border-[var(--accent)]/40 hover:text-[var(--accent)] transition-all w-full sm:w-fit cursor-pointer group"
                  >
                    <Settings size={14} className="text-secondary group-hover:text-[var(--accent)] transition-colors" />
                    <span>Configurar Tienda</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </footer>
      )}

      {/* Notificación de Pedido Exitoso */}
      {showOrderSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-4 duration-300">
          <Check size={16} /> ¡Redirigiendo a WhatsApp con tu pedido!
          <button 
            onClick={() => setShowOrderSuccess(false)}
            className="ml-2 hover:opacity-80"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Barra Inferior del Carrito Flotante */}
      {totalItemsCount > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur border-t border-border px-4 py-4 shadow-2xl animate-in slide-in-from-bottom duration-300">
          <div className="w-full max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="relative bg-[var(--accent)]/15 p-2 rounded-xl border border-[var(--accent)]/20 text-[var(--accent)]">
                <ShoppingBag size={18} />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center">
                  {totalItemsCount}
                </span>
              </div>
              <div className="hidden sm:block">
                <p className="text-[10px] text-secondary uppercase tracking-widest font-medium">Pedido Total</p>
                <div className="flex gap-2 text-xs font-bold text-primary">
                  {Object.entries(totals).map(([curr, val]) => (
                    <span key={curr} className="mr-2">{val.toLocaleString()} {curr}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
              {!isMinAmountMet && catalog.min_order_amount && (
                <span className="text-[10px] sm:text-xs text-red-500 font-bold bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-lg">
                  Monto mín: {catalog.min_order_amount.toLocaleString()} {catalog.min_order_currency} (Faltan {missingAmount.toLocaleString()})
                </span>
              )}
              <div className="flex items-center gap-2">
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => setIsCartOpen(true)}
                >
                  Ver Detalle
                </Button>
                <Button 
                  variant="primary"
                  size="sm"
                  icon={Send}
                  onClick={handleOpenCustomerForm}
                  disabled={!isMinAmountMet}
                  className={`text-white transition-all ${
                    isMinAmountMet 
                      ? 'bg-green-600 hover:bg-green-500 border-green-600 hover:border-green-500' 
                      : 'bg-gray-600 border-gray-600 cursor-not-allowed opacity-50'
                  }`}
                >
                  Enviar Pedido ({totalItemsCount})
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drawer / Modal del Carrito */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsCartOpen(false)}
          />

          <div className="absolute bottom-0 inset-x-0 md:inset-y-0 md:right-0 md:left-auto md:max-w-full flex md:pl-10">
            <div className="w-full md:w-screen md:max-w-md h-[80vh] md:h-full bg-background border-t md:border-t-0 md:border-l border-border rounded-t-2xl md:rounded-t-none flex flex-col justify-between shadow-2xl animate-in slide-in-from-bottom md:slide-in-from-right duration-300">
              
              {/* Grab handle para móviles */}
              <div className="w-12 h-1 bg-border rounded-full mx-auto my-2.5 md:hidden flex-shrink-0" />

              {/* Header Carrito */}
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag size={18} className="text-[var(--accent)]" />
                  <h2 className="text-sm font-black uppercase text-primary tracking-wider">Tu Pedido</h2>
                </div>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="p-1 rounded-lg hover:bg-surface-hover text-secondary hover:text-primary"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Contenido Carrito */}
              <div className="flex-grow overflow-y-auto p-4 space-y-4">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex gap-3 p-3 rounded-xl bg-surface-hover border border-border">
                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-surface flex-shrink-0">
                      {item.product.imagen_url ? (
                        <img 
                          src={item.product.imagen_url} 
                          alt={item.product.name} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-secondary">
                          <ShoppingBag size={16} />
                        </div>
                      )}
                    </div>
                    <div className="flex-grow min-w-0 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-primary truncate uppercase">{item.product.name}</h4>
                        <p className="text-[10px] text-secondary mt-0.5">
                          {getProductDisplayPrice(item.product.price, item.product.currency, item.product.price_cup, item.product.price_usd)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] font-bold text-secondary">
                          Subtotal: {getSubtotalDisplay(item)}
                        </span>
                        
                        <div className="flex items-center gap-1 bg-surface p-0.5 rounded-md border border-border">
                          <button 
                            onClick={() => removeFromCart(item.product.id)}
                            className="w-6 h-6 flex items-center justify-center rounded text-secondary hover:text-primary hover:bg-surface-hover"
                          >
                            <Minus size={10} />
                          </button>
                          <span className="w-4 text-center text-[10px] font-bold text-primary">{item.quantity}</span>
                          <button 
                            onClick={() => addToCart(item.product)}
                            className="w-6 h-6 flex items-center justify-center rounded text-secondary hover:text-primary hover:bg-surface-hover"
                          >
                            <Plus size={10} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer Carrito */}
              <div className="p-4 border-t border-border bg-surface space-y-4">
                <div className="space-y-1.5">
                  <p className="text-[10px] text-secondary uppercase tracking-widest font-bold">Total del Pedido</p>
                  {Object.entries(totals).map(([curr, val]) => (
                    <div key={curr} className="flex justify-between items-center text-sm font-black text-primary">
                      <span>Total en {curr}:</span>
                      <span className="text-[var(--accent)]">{val.toLocaleString()} {curr}</span>
                    </div>
                  ))}

                  {!isMinAmountMet && catalog.min_order_amount && (
                    <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] font-bold space-y-1 animate-in fade-in duration-300">
                      <p className="uppercase tracking-wider">Monto Mínimo No Alcanzado</p>
                      <p className="font-normal text-secondary">
                        Para realizar un pedido en esta tienda el total debe ser al menos de <span className="font-bold text-red-500">{catalog.min_order_amount.toLocaleString()} {catalog.min_order_currency}</span>.
                      </p>
                      <p className="text-[10px]">
                        Equivalente actual: {unifiedTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} {catalog.min_order_currency} (Te faltan <span className="font-black underline">{missingAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} {catalog.min_order_currency}</span>)
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Button 
                    variant="secondary" 
                    onClick={clearCart}
                    className="w-full text-red-500 border-red-500/20 hover:bg-red-500/5 hover:border-red-500/30"
                  >
                    Vaciar Carrito
                  </Button>
                  <Button 
                    variant="primary" 
                    onClick={handleOpenCustomerForm}
                    disabled={!isMinAmountMet}
                    className={`w-full text-white flex items-center justify-center gap-1.5 transition-all ${
                      isMinAmountMet 
                        ? 'bg-green-600 hover:bg-green-500 border-green-600 hover:border-green-500' 
                        : 'bg-gray-600 border-gray-600 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <Send size={12} /> WhatsApp
                  </Button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalle de Producto */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 overflow-hidden flex flex-col justify-end md:items-center md:justify-center p-0 md:p-6 animate-in fade-in duration-200">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedProduct(null)}
          />

          {/* Caja del Modal */}
          <div className="relative w-full md:max-w-lg bg-background border-t md:border border-border rounded-t-2xl md:rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom md:zoom-in-95 duration-300 md:duration-200">
            
            {/* Grab handle para móviles */}
            <div className="w-12 h-1 bg-border rounded-full mx-auto my-2.5 md:hidden flex-shrink-0" />

            {/* Header / Botón Cerrar */}
            <button 
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-colors"
            >
              <X size={18} />
            </button>

            {/* Contenido con scroll */}
            <div className="overflow-y-auto flex-1">
              {/* Imagen del Producto */}
              <div className="h-64 sm:h-80 w-full bg-surface-hover relative overflow-hidden flex items-center justify-center border-b border-border">
                {selectedProduct.imagen_url ? (
                  <img 
                    src={selectedProduct.imagen_url} 
                    alt={selectedProduct.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-secondary flex flex-col items-center gap-2">
                    <ShoppingBag size={48} />
                    <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500">Sin Imagen</span>
                  </div>
                )}
              </div>

              {/* Información del Producto */}
              <div className="p-6 space-y-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-primary uppercase tracking-tight">
                    {selectedProduct.name}
                  </h2>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-base sm:text-lg font-black text-[var(--accent)]">
                      {getProductDisplayPrice(
                        selectedProduct.price,
                        selectedProduct.currency,
                        selectedProduct.price_cup,
                        selectedProduct.price_usd
                      )}
                    </span>
                  </div>
                </div>

                {selectedProduct.description && (
                  <div className="border-t border-border pt-4">
                    <h3 className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1.5">Descripción</h3>
                    <p className="text-xs sm:text-sm text-primary leading-relaxed whitespace-pre-line bg-surface-hover/30 p-3 rounded-xl border border-border/50">
                      {selectedProduct.description}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer con Acciones */}
            <div className="p-4 sm:p-6 border-t border-border bg-surface flex flex-col sm:flex-row gap-3">
              {/* Control de cantidad para agregar al carrito */}
              {getProductQuantity(selectedProduct.id) > 0 ? (
                <div className="flex items-center justify-between bg-surface-hover px-4 py-2.5 rounded-xl border border-border sm:flex-1 h-[46px]">
                  <span className="text-xs font-bold text-secondary">En el pedido:</span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => removeFromCart(selectedProduct.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface active:scale-90 transition-all text-secondary hover:text-primary border border-border/50"
                    >
                      <Minus size={14} />
                    </button>
                    <input 
                      type="number"
                      min="0"
                      className="w-12 text-center text-xs sm:text-sm font-bold text-primary bg-transparent outline-none focus:ring-1 focus:ring-accent rounded border border-border/30 h-8 tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      value={getProductQuantity(selectedProduct.id)}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        updateCartQuantity(selectedProduct, isNaN(val) ? 0 : val);
                      }}
                    />
                    <button 
                      onClick={() => addToCart(selectedProduct)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface active:scale-90 transition-all text-secondary hover:text-primary border border-border/50"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="primary"
                  icon={Plus}
                  onClick={() => addToCart(selectedProduct)}
                  className="sm:flex-1 py-3 text-xs uppercase"
                >
                  Agregar al Pedido
                </Button>
              )}

              {/* Botón de Contacto Directo */}
              <Button 
                variant="primary"
                icon={Send}
                onClick={() => {
                  let messageText = `¡Hola! Me interesa este producto de tu catálogo:\n\n`;
                  messageText += `🛍️ *${selectedProduct.name}*\n`;
                  if (selectedProduct.price !== null) {
                    const displayPrice = getProductDisplayPrice(
                      selectedProduct.price,
                      selectedProduct.currency,
                      selectedProduct.price_cup,
                      selectedProduct.price_usd
                    );
                    messageText += `💵 *Precio:* ${displayPrice}\n`;
                  }
                  if (slug) {
                    messageText += `🔗 *Enlace:* matum.com/${slug}\n`;
                  }
                  messageText += `\n¿Tienen disponibilidad?`;

                  let formattedPhone = vendorPhone.replace(/\D/g, '');
                  if (formattedPhone.length === 8 && (formattedPhone.startsWith('5') || formattedPhone.startsWith('6'))) {
                    formattedPhone = '53' + formattedPhone;
                  }

                  const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`;
                  window.open(whatsappUrl, '_blank');
                }}
                className="bg-green-600 hover:bg-green-500 border-green-600 hover:border-green-500 text-white sm:flex-1 py-3"
              >
                Preguntar por WhatsApp
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Formulario de Cliente */}
      <Modal
        isOpen={isCustomerFormOpen}
        onClose={() => setIsCustomerFormOpen(false)}
        title="Datos de Envío"
        footer={
          <div className="flex gap-2 w-full">
            <Button
              variant="secondary"
              onClick={() => setIsCustomerFormOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
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
              className="flex-1 bg-green-600 hover:bg-green-500 border-green-600 hover:border-green-500 text-white"
            >
              Confirmar Pedido
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-left">
          <p className="text-xs text-secondary mb-4 leading-relaxed">
            Completa tus datos para coordinar la entrega y finalizar tu solicitud de pedido a través de WhatsApp.
          </p>

          <Input
            label="Nombre Completo"
            placeholder="Ej: Juan Pérez"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Dirección de Entrega"
            placeholder="Ej: Calle 23 #456 e/ H e I, Vedado, La Habana"
            value={customerAddress}
            onChange={(e) => setCustomerAddress(e.target.value)}
            multiline
            rows={2}
            required
          />

          <Input
            label="Número de Teléfono"
            placeholder="Ej: +53 51234567"
            type="tel"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
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
            <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <Input
                label="Nombre de la persona que recibe"
                placeholder="Ej: María Gómez"
                value={deliveryName}
                onChange={(e) => setDeliveryName(e.target.value)}
                required
              />

              <Input
                label="Número de Teléfono de quien recibe"
                placeholder="Ej: +53 58765432"
                type="tel"
                value={deliveryPhone}
                onChange={(e) => setDeliveryPhone(e.target.value)}
                required
              />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
