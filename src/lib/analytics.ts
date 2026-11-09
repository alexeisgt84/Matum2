import { supabase } from './supabase';

export interface ViewEvent {
  id?: string;
  catalog_id: string;
  product_id?: string | null;
  user_id?: string | null;
  referral_code?: string | null;
  visitor_id?: string | null;
  referrer_url?: string | null;
  created_at?: string;
}

export interface StoreAnalyticsItem {
  catalogId: string;
  catalogName: string;
  slug: string | null;
  logoUrl: string | null;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  storeViews: number;
  productViews: number;
  totalViews: number;
  referralViews: number;
  products: {
    id: string;
    name: string;
    price: number | null;
    currency: string;
    imageUrl: string | null;
    viewsCount: number;
  }[];
}

export interface UserAnalyticsItem {
  userId: string;
  userName: string;
  phone: string;
  plan: string;
  role: string;
  referralCode?: string | null;
  storesCount: number;
  productsCount: number;
  storeViews: number;
  productViews: number;
  totalViews: number;
  stores: {
    id: string;
    name: string;
    slug: string | null;
    views: number;
  }[];
}

export interface ReferralAnalyticsItem {
  code: string;
  isDirect: boolean;
  affiliateUserId?: string | null;
  affiliateName: string;
  affiliatePhone?: string | null;
  storeViews: number;
  productViews: number;
  totalViews: number;
  catalogsTargeted: {
    id: string;
    name: string;
    views: number;
  }[];
}

export interface ProductAnalyticsItem {
  id: string;
  name: string;
  catalogId: string;
  catalogName: string;
  catalogSlug: string | null;
  ownerName: string;
  ownerPhone: string;
  price: number | null;
  currency: string;
  imageUrl: string | null;
  viewsCount: number;
  referralViews: number;
}

export interface OverallAnalyticsSummary {
  totalStoreViews: number;
  totalProductViews: number;
  totalCombinedViews: number;
  totalReferralViews: number;
  activeStoresCount: number;
  activeUsersCount: number;
  topStore: { name: string; views: number } | null;
  topProduct: { name: string; views: number } | null;
  topReferral: { code: string; views: number } | null;
}

export interface AnalyticsData {
  summary: OverallAnalyticsSummary;
  byStore: StoreAnalyticsItem[];
  byUser: UserAnalyticsItem[];
  byReferral: ReferralAnalyticsItem[];
  byProduct: ProductAnalyticsItem[];
}

/** Obtiene o genera un identificador anónimo único para el visitante */
export const getOrCreateVisitorId = (): string => {
  if (typeof window === 'undefined') return 'server';
  try {
    let vid = localStorage.getItem('matum_visitor_id');
    if (!vid) {
      vid = 'v_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      localStorage.setItem('matum_visitor_id', vid);
    }
    return vid;
  } catch {
    return 'anon_' + Math.random().toString(36).substring(2, 8);
  }
};

/** Clave de debounce para evitar registrar vistas repetidas en pocos minutos */
const checkViewDebounce = (catalogId: string, productId?: string | null): boolean => {
  if (typeof window === 'undefined') return true;
  try {
    const key = `matum_last_view_${catalogId}_${productId || 'store'}`;
    const last = sessionStorage.getItem(key);
    const now = Date.now();
    // 5 minutos de debounce para el mismo navegador y pestaña/sesión
    if (last && now - Number(last) < 5 * 60 * 1000) {
      return false;
    }
    sessionStorage.setItem(key, String(now));
    return true;
  } catch {
    return true;
  }
};

/**
 * Registra una visualización de tienda o de producto de manera segura y no bloqueante.
 */
export const recordStoreView = async ({
  catalogId,
  productId,
  referralCode,
}: {
  catalogId: string;
  productId?: string | null;
  referralCode?: string | null;
}) => {
  if (!catalogId) return;

  // Evitar duplicar en recargas inmediatas
  if (!checkViewDebounce(catalogId, productId)) {
    return;
  }

  const visitorId = getOrCreateVisitorId();
  const referrerUrl = typeof document !== 'undefined' ? document.referrer || window.location.href : null;
  const cleanRef = referralCode?.trim() || null;

  try {
    // 1. Intentar registrar a través del RPC de Supabase si está disponible
    const { error: rpcError } = await supabase.rpc('record_store_view', {
      p_catalog_id: catalogId,
      p_product_id: productId || null,
      p_referral_code: cleanRef,
      p_visitor_id: visitorId,
      p_referrer_url: referrerUrl,
    });

    if (!rpcError) {
      return;
    }

    // 2. Fallback: Si el RPC no existe o da error, intentar INSERT en analytics_views directamente
    const { error: insertError } = await supabase.from('analytics_views').insert({
      catalog_id: catalogId,
      product_id: productId || null,
      referral_code: cleanRef,
      visitor_id: visitorId,
      referrer_url: referrerUrl,
    });

    if (!insertError) {
      // Incrementar contador directo en products si es un producto
      if (productId) {
        try {
          const { data: currentProd } = await supabase
            .from('products')
            .select('views_count')
            .eq('id', productId)
            .maybeSingle();

          const newCount = (currentProd?.views_count || 0) + 1;
          await supabase.from('products').update({ views_count: newCount }).eq('id', productId);
        } catch {
          // Silencioso
        }
      }
      return;
    }

    // 3. Fallback adicional si no existe analytics_views en la DB:
    // Actualizar directamente views_count en products
    if (productId) {
      try {
        const { data: currentProd } = await supabase
          .from('products')
          .select('views_count')
          .eq('id', productId)
          .maybeSingle();

        const newCount = (currentProd?.views_count || 0) + 1;
        await supabase.from('products').update({ views_count: newCount }).eq('id', productId);
      } catch {
        // Silencioso
      }
    }
  } catch (err) {
    console.warn('[Analytics] No se pudo guardar la vista:', err);
  }
};

/**
 * Carga y computa todas las métricas de visitas organizadas por tienda, usuario y referidos.
 */
export const fetchViewsAnalytics = async (dateRange: 'all' | 'today' | '7d' | '30d' = 'all'): Promise<AnalyticsData> => {
  // 1. Cargar catálogos, productos y usuarios en paralelo
  const [catalogsRes, productsRes, usersRes] = await Promise.all([
    supabase
      .from('catalogs')
      .select('id, user_id, name, slug, logo_url, views_count, created_at, is_active')
      .order('created_at', { ascending: false }),
    supabase
      .from('products')
      .select('id, catalog_id, name, price, currency, imagen_url, views_count, is_active')
      .order('views_count', { ascending: false }),
    supabase
      .from('users')
      .select('id, phone, full_name, plan, role, referral_code'),
  ]);

  const catalogs = catalogsRes.data || [];
  const products = productsRes.data || [];
  const users = usersRes.data || [];

  // Mapeos rápidos por ID
  const userMap = new Map<string, any>();
  const userByRefCodeMap = new Map<string, any>();
  users.forEach(u => {
    userMap.set(u.id, u);
    if (u.referral_code) {
      userByRefCodeMap.set(u.referral_code.trim().toLowerCase(), u);
    }
  });

  const catalogMap = new Map<string, any>();
  catalogs.forEach(c => catalogMap.set(c.id, c));

  // 2. Intentar leer eventos detallados de analytics_views
  let viewsQuery = supabase
    .from('analytics_views')
    .select('*')
    .order('created_at', { ascending: false });

  if (dateRange !== 'all') {
    const now = new Date();
    let startDate = new Date();
    if (dateRange === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (dateRange === '7d') {
      startDate.setDate(now.getDate() - 7);
    } else if (dateRange === '30d') {
      startDate.setDate(now.getDate() - 30);
    }
    viewsQuery = viewsQuery.gte('created_at', startDate.toISOString());
  }

  const { data: analyticsEvents } = await viewsQuery;
  const events: ViewEvent[] = analyticsEvents || [];

  // Estructuras de acumulación
  // Tiendas
  const storeMap = new Map<string, {
    storeViews: number;
    productViews: number;
    referralViews: number;
    productViewsMap: Map<string, number>;
  }>();

  catalogs.forEach(cat => {
    storeMap.set(cat.id, {
      storeViews: Number(cat.views_count) || 0,
      productViews: 0,
      referralViews: 0,
      productViewsMap: new Map<string, number>(),
    });
  });

  // Referidos
  const referralMap = new Map<string, {
    code: string;
    isDirect: boolean;
    storeViews: number;
    productViews: number;
    catalogsMap: Map<string, number>;
  }>();

  // Asegurar entrada directa
  referralMap.set('direct', {
    code: 'Directo / Sin Referido',
    isDirect: true,
    storeViews: 0,
    productViews: 0,
    catalogsMap: new Map(),
  });

  // Procesar eventos de la tabla si existen
  if (events.length > 0) {
    events.forEach(ev => {
      const catId = ev.catalog_id;
      if (!catId) return;

      if (!storeMap.has(catId)) {
        storeMap.set(catId, {
          storeViews: 0,
          productViews: 0,
          referralViews: 0,
          productViewsMap: new Map(),
        });
      }
      const st = storeMap.get(catId)!;

      const isProd = !!ev.product_id;
      if (isProd) {
        st.productViews += 1;
        if (ev.product_id) {
          const prev = st.productViewsMap.get(ev.product_id) || 0;
          st.productViewsMap.set(ev.product_id, prev + 1);
        }
      } else {
        st.storeViews += 1;
      }

      const refCode = ev.referral_code?.trim() || 'direct';
      const refKey = refCode.toLowerCase();

      if (refCode !== 'direct') {
        st.referralViews += 1;
      }

      if (!referralMap.has(refKey)) {
        referralMap.set(refKey, {
          code: refCode,
          isDirect: false,
          storeViews: 0,
          productViews: 0,
          catalogsMap: new Map(),
        });
      }

      const refEntry = referralMap.get(refKey)!;
      if (isProd) {
        refEntry.productViews += 1;
      } else {
        refEntry.storeViews += 1;
      }

      const catCount = refEntry.catalogsMap.get(catId) || 0;
      refEntry.catalogsMap.set(catId, catCount + 1);
    });
  } else {
    // Si la tabla analytics_views aún no tiene registros (por ejemplo en ambiente local previo a eventos),
    // usamos los contadores existentes en products.views_count y catalogs.views_count
    products.forEach(p => {
      if (!p.catalog_id) return;
      const st = storeMap.get(p.catalog_id);
      if (st) {
        const v = Number(p.views_count) || 0;
        st.productViews += v;
        st.productViewsMap.set(p.id, v);
      }
    });
  }

  // 3. Construir lista organizada POR TIENDA
  const byStore: StoreAnalyticsItem[] = catalogs.map(cat => {
    const st = storeMap.get(cat.id) || {
      storeViews: 0,
      productViews: 0,
      referralViews: 0,
      productViewsMap: new Map(),
    };

    const owner = userMap.get(cat.user_id);
    const catProds = products.filter(p => p.catalog_id === cat.id);

    const prodsAnalytics = catProds.map(p => ({
      id: p.id,
      name: p.name || 'Sin nombre',
      price: p.price,
      currency: p.currency || 'CUP',
      imageUrl: p.imagen_url,
      viewsCount: Math.max(Number(p.views_count) || 0, st.productViewsMap.get(p.id) || 0),
    })).sort((a, b) => b.viewsCount - a.viewsCount);

    const computedProductViews = Math.max(
      st.productViews,
      prodsAnalytics.reduce((acc, curr) => acc + curr.viewsCount, 0)
    );

    return {
      catalogId: cat.id,
      catalogName: cat.name || 'Sin nombre',
      slug: cat.slug,
      logoUrl: cat.logo_url,
      ownerId: cat.user_id,
      ownerName: owner?.full_name || (owner as any)?.nombre || 'Desconocido',
      ownerPhone: owner?.phone || '',
      storeViews: st.storeViews,
      productViews: computedProductViews,
      totalViews: st.storeViews + computedProductViews,
      referralViews: st.referralViews,
      products: prodsAnalytics,
    };
  }).sort((a, b) => b.totalViews - a.totalViews);

  // 4. Construir lista organizada POR USUARIOS
  const userStoresMap = new Map<string, StoreAnalyticsItem[]>();
  byStore.forEach(s => {
    if (!userStoresMap.has(s.ownerId)) {
      userStoresMap.set(s.ownerId, []);
    }
    userStoresMap.get(s.ownerId)!.push(s);
  });

  const byUser: UserAnalyticsItem[] = users.map(u => {
    const userStores = userStoresMap.get(u.id) || [];
    const storesCount = userStores.length;
    const productsCount = userStores.reduce((acc, st) => acc + st.products.length, 0);
    const storeViews = userStores.reduce((acc, st) => acc + st.storeViews, 0);
    const productViews = userStores.reduce((acc, st) => acc + st.productViews, 0);

    return {
      userId: u.id,
      userName: u.full_name || (u as any).nombre || 'Usuario sin nombre',
      phone: u.phone || '',
      plan: u.plan || 'free',
      role: u.role || 'user',
      referralCode: u.referral_code,
      storesCount,
      productsCount,
      storeViews,
      productViews,
      totalViews: storeViews + productViews,
      stores: userStores.map(st => ({
        id: st.catalogId,
        name: st.catalogName,
        slug: st.slug,
        views: st.totalViews,
      })),
    };
  }).sort((a, b) => b.totalViews - a.totalViews);

  // 5. Construir lista organizada POR REFERIDOS
  // Aseguramos que aparezcan usuarios con código de referido incluso si aún tienen 0 vistas
  users.forEach(u => {
    if (u.referral_code) {
      const codeKey = u.referral_code.trim().toLowerCase();
      if (!referralMap.has(codeKey)) {
        referralMap.set(codeKey, {
          code: u.referral_code,
          isDirect: false,
          storeViews: 0,
          productViews: 0,
          catalogsMap: new Map(),
        });
      }
    }
  });

  const byReferral: ReferralAnalyticsItem[] = Array.from(referralMap.values()).map(ref => {
    const associatedUser = userByRefCodeMap.get(ref.code.toLowerCase());
    const catalogsTargeted = Array.from(ref.catalogsMap.entries()).map(([cId, count]) => {
      const cat = catalogMap.get(cId);
      return {
        id: cId,
        name: cat?.name || 'Tienda no encontrada',
        views: count,
      };
    }).sort((a, b) => b.views - a.views);

    return {
      code: ref.code,
      isDirect: ref.isDirect,
      affiliateUserId: associatedUser?.id || null,
      affiliateName: associatedUser
        ? (associatedUser.full_name || (associatedUser as any).nombre || associatedUser.phone)
        : (ref.isDirect ? 'Acceso Directo' : 'Afiliado Externo / No registrado'),
      affiliatePhone: associatedUser?.phone || null,
      storeViews: ref.storeViews,
      productViews: ref.productViews,
      totalViews: ref.storeViews + ref.productViews,
      catalogsTargeted,
    };
  }).sort((a, b) => {
    // Si uno es directo y el otro no, ordenamos primero por total de vistas
    return b.totalViews - a.totalViews;
  });

  // 6. Construir lista organizada POR PRODUCTO (Ranking global de productos)
  const byProduct: ProductAnalyticsItem[] = [];
  byStore.forEach(store => {
    store.products.forEach(p => {
      byProduct.push({
        id: p.id,
        name: p.name,
        catalogId: store.catalogId,
        catalogName: store.catalogName,
        catalogSlug: store.slug,
        ownerName: store.ownerName,
        ownerPhone: store.ownerPhone,
        price: p.price,
        currency: p.currency,
        imageUrl: p.imageUrl,
        viewsCount: p.viewsCount,
        referralViews: 0,
      });
    });
  });
  byProduct.sort((a, b) => b.viewsCount - a.viewsCount);

  // 7. Calcular resumen global
  const totalStoreViews = byStore.reduce((acc, s) => acc + s.storeViews, 0);
  const totalProductViews = byStore.reduce((acc, s) => acc + s.productViews, 0);
  const totalReferralViews = byReferral
    .filter(r => !r.isDirect)
    .reduce((acc, r) => acc + r.totalViews, 0);

  const topStore = byStore.length > 0 && byStore[0].totalViews > 0
    ? { name: byStore[0].catalogName, views: byStore[0].totalViews }
    : null;

  const topProduct = byProduct.length > 0 && byProduct[0].viewsCount > 0
    ? { name: byProduct[0].name, views: byProduct[0].viewsCount }
    : null;

  const validTopReferrals = byReferral.filter(r => !r.isDirect && r.totalViews > 0);
  const topReferral = validTopReferrals.length > 0
    ? { code: validTopReferrals[0].code, views: validTopReferrals[0].totalViews }
    : null;

  return {
    summary: {
      totalStoreViews,
      totalProductViews,
      totalCombinedViews: totalStoreViews + totalProductViews,
      totalReferralViews,
      activeStoresCount: catalogs.filter(c => c.is_active).length,
      activeUsersCount: users.length,
      topStore,
      topProduct,
      topReferral,
    },
    byStore,
    byUser,
    byReferral,
    byProduct,
  };
};
