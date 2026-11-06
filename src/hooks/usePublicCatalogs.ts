import { useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

export interface PublicCatalogItem {
  id: string;
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
  created_at: string;
  productCount: number;
}

export const usePublicCatalogs = () => {
  const [publicCatalogs, setPublicCatalogs] = useState<PublicCatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const getPublicCatalogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('catalogs')
        .select(`
          id,
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
    } catch (err: any) {
      console.error('Error cargando catálogos públicos:', err);
      toast.error('Error al cargar catálogos públicos');
    } finally {
      setLoading(false);
    }
  }, []);

  const filteredCatalogs = useMemo(() => {
    if (!searchQuery.trim()) return publicCatalogs;
    const query = searchQuery.toLowerCase().trim();
    return publicCatalogs.filter(cat => 
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
