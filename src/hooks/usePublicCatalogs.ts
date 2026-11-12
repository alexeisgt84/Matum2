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
  catalog_type?: 'store' | 'marketplace' | string;
  created_at: string;
  productCount: number;
}

const PUBLIC_CATALOGS_CACHE_KEY = 'public_catalogs';

export const usePublicCatalogs = () => {
  const [publicCatalogs, setPublicCatalogs] = useState<PublicCatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const getPublicCatalogs = useCallback(async () => {
    const cached = await getCachedList<PublicCatalogItem[]>(PUBLIC_CATALOGS_CACHE_KEY);

    if (cached && cached.length > 0) {
      setPublicCatalogs(cached);
    }

    if (isOffline()) {
      setLoading(false);
      return;
    }

    setLoading(!cached || cached.length === 0);
    try {
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
          catalog_type,
          created_at,
          products:products(count)
        `)
        .eq('is_public', true)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted: PublicCatalogItem[] = (data || []).map((cat: any) => ({
        ...cat,
        productCount: cat.products?.[0]?.count || 0,
      }));

      setPublicCatalogs(formatted);
      await saveCachedList(PUBLIC_CATALOGS_CACHE_KEY, formatted);
      // Guardar metadatos en caché local; limitar precarga profunda a los 4 primeros catálogos para no saturar conexiones lentas
      formatted.forEach((cat, idx) => {
        saveCatalogToCache(cat);
        if (idx < 4) {
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
