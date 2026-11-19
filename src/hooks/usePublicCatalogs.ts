import { useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import {
  isOffline,
  isNetworkError,
  saveCachedList,
  getCachedList,
  saveCatalogToCache,
  syncCatalogForOffline,
} from '../lib/offlineCache';

export interface PublicCatalogItem {
  id: string;
  user_id?: string;
  name: string;
  slogan: string | null;
  description: string | null;
  slug: string | null;
  logo_url: string | null;
  cover_url: string | null;
  primary_color: string | null;
  background_color: string | null;
  surface_color: string | null;
  text_color?: string | null;
  title_color?: string | null;
  is_active: boolean;
  is_public: boolean;
  enable_affiliates?: boolean;
  is_blocked?: boolean;
  catalog_type?: 'store' | 'marketplace' | string;
  views_count?: number;
  owner_plan?: string | null;
  created_at: string;
  productCount: number;
}

const PLAN_PRIORITY: Record<string, number> = {
  premium: 4,
  pro: 3,
  basic: 2,
  free: 1,
};

export const getPlanPriority = (plan?: string | null): number => {
  const normalized = (plan || 'free').toLowerCase().trim();
  return PLAN_PRIORITY[normalized] ?? 1;
};

export const comparePublicCatalogs = (
  a: Pick<PublicCatalogItem, 'owner_plan' | 'views_count' | 'created_at'>,
  b: Pick<PublicCatalogItem, 'owner_plan' | 'views_count' | 'created_at'>
): number => {
  const planDiff = getPlanPriority(b.owner_plan) - getPlanPriority(a.owner_plan);
  if (planDiff !== 0) return planDiff;

  const viewsDiff = (Number(b.views_count) || 0) - (Number(a.views_count) || 0);
  if (viewsDiff !== 0) return viewsDiff;

  return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
};

export const sortPublicCatalogs = <T extends Pick<PublicCatalogItem, 'owner_plan' | 'views_count' | 'created_at'>>(
  items: T[]
): T[] => [...items].sort(comparePublicCatalogs);

const PUBLIC_CATALOGS_CACHE_KEY = 'public_catalogs';

export const usePublicCatalogs = () => {
  const [publicCatalogs, setPublicCatalogs] = useState<PublicCatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const getPublicCatalogs = useCallback(async () => {
    const cached = await getCachedList<PublicCatalogItem[]>(PUBLIC_CATALOGS_CACHE_KEY);

    if (cached && cached.length > 0) {
      setPublicCatalogs(sortPublicCatalogs(cached));
    }

    if (isOffline()) {
      setLoading(false);
      return;
    }

    setLoading(!cached || cached.length === 0);
    try {
      let formatted: PublicCatalogItem[] = [];

      const { data: rpcData, error: rpcError } =
        typeof (supabase as any).rpc === 'function'
          ? await supabase.rpc('get_public_catalogs')
          : { data: null, error: new Error('RPC no disponible') };

      if (!rpcError && Array.isArray(rpcData)) {
        formatted = rpcData.map((cat: any) => ({
          ...cat,
          views_count: Number(cat.views_count) || 0,
          owner_plan: cat.owner_plan || 'free',
          productCount: Number(cat.product_count ?? cat.productCount) || 0,
        }));
      } else {
        const { data, error } = await supabase
          .from('catalogs')
          .select(`
            id,
            user_id,
            name,
            slogan,
            description,
            slug,
            logo_url,
            cover_url,
            primary_color,
            background_color,
            surface_color,
            text_color,
            title_color,
            is_active,
            is_public,
            enable_affiliates,
            is_blocked,
            catalog_type,
            views_count,
            created_at,
            products:products(count)
          `)
          .eq('is_public', true)
          .eq('is_active', true)
          .order('views_count', { ascending: false })
          .order('created_at', { ascending: false });

        if (error) throw error;

        formatted = (data || []).map((cat: any) => ({
          ...cat,
          views_count: Number(cat.views_count) || 0,
          owner_plan: cat.owner_plan || 'free',
          productCount: cat.products?.[0]?.count || 0,
        }));
      }

      const sorted = sortPublicCatalogs(formatted);

      setPublicCatalogs(sorted);
      await saveCachedList(PUBLIC_CATALOGS_CACHE_KEY, sorted);
      // Guardar metadatos en caché local; limitar precarga profunda a los 2 primeros catálogos para no saturar conexiones lentas
      sorted.forEach((cat, idx) => {
        saveCatalogToCache(cat);
        if (idx < 2) {
          syncCatalogForOffline(cat.id);
        }
      });
    } catch (err: any) {
      if (cached) {
        setPublicCatalogs(cached);
      }
      const isAbort = err?.name === 'AbortError' || String(err?.message || '').toLowerCase().includes('aborted');
      if (isAbort) return;

      if (!isNetworkError(err)) {
        console.error('Error cargando catálogos públicos:', err);
        toast.error('Error al cargar catálogos públicos');
      } else {
        console.warn('Red lenta o inestable cargando catálogos públicos (usando caché si está disponible):', err?.message || err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const filteredCatalogs = useMemo(() => {
    if (!searchQuery.trim()) return publicCatalogs;
    const query = searchQuery.toLowerCase().trim();
    return publicCatalogs.filter(
      (cat) =>
        cat.name?.toLowerCase().includes(query) ||
        cat.slogan?.toLowerCase().includes(query) ||
        cat.description?.toLowerCase().includes(query)
    );
  }, [publicCatalogs, searchQuery]);

  return {
    publicCatalogs,
    filteredCatalogs,
    loading,
    searchQuery,
    setSearchQuery,
    getPublicCatalogs,
  };
};
