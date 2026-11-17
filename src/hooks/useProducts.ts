import { useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { Product, ProductForm } from '../types/product';
import { toast } from 'react-hot-toast';
import { optimizeImage, blobToFile } from '../lib/imageOptimizer';
import {
  isOffline,
  isNetworkError,
  getCatalogProductsFromCache,
  upsertCatalogProductsInCache,
  saveCatalogProductsToCache,
  syncCatalogForOffline,
} from '../lib/offlineCache';
import { matchesSearchTerms, buildSupabaseSearchFilter } from '../lib/searchTerms';
import { normalizeProductBadges, syncBadgesWithFeatured } from '../constants/productBadges';

function filterAndSortCachedProducts(
  allProducts: Product[],
  search?: string,
  sortField: string = 'position',
  sortOrder: 'asc' | 'desc' = 'asc',
  categoryId?: number | string | null
): Product[] {
  let result = [...allProducts];

  if (categoryId !== undefined && categoryId !== null) {
    if (categoryId === 'none') {
      result = result.filter((p) => p.category_id === null || p.category_id === undefined);
    } else {
      result = result.filter((p) => Number(p.category_id) === Number(categoryId));
    }
  }

  if (search && search.trim() !== '') {
    result = result.filter((p) => matchesSearchTerms(p, search, { matchPrice: true }));
  }

  result.sort((a: any, b: any) => {
    if (sortField === 'position') {
      const stockDiff = Number(Boolean(a.is_out_of_stock)) - Number(Boolean(b.is_out_of_stock));
      if (stockDiff !== 0) return stockDiff;
      const featuredDiff = Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured));
      if (featuredDiff !== 0) return featuredDiff;
      return (a.position ?? 0) - (b.position ?? 0);
    }

    const valA = a[sortField];
    const valB = b[sortField];
    if (valA === valB) return 0;
    if (valA === null || valA === undefined) return 1;
    if (valB === null || valB === undefined) return -1;

    const comparison =
      typeof valA === 'string' && typeof valB === 'string'
        ? valA.localeCompare(valB)
        : valA < valB
        ? -1
        : 1;

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  return result;
}

export const useProducts = (
  catalogId?: string,
  search?: string,
  sortField: string = 'position',
  sortOrder: 'asc' | 'desc' = 'asc',
  categoryId?: number | string | null
) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const pageRef = useRef(0);
  const isLoadingRef = useRef(false);
  const requestSeqRef = useRef(0);

  const deduplicate = (existing: Product[], incoming: Product[]): Product[] => {
    const existingIds = new Set(existing.map((p) => p.id));
    const uniqueIncoming = incoming.filter((p) => p && p.id && !existingIds.has(p.id));
    return [...existing, ...uniqueIncoming];
  };

  const loadFromOfflineCache = useCallback(
    async (isInitial: boolean, currentPage: number) => {
      if (!catalogId) return false;
      const cached = await getCatalogProductsFromCache(catalogId);
      if (!cached || cached.length === 0) return false;

      const filtered = filterAndSortCachedProducts(cached, search, sortField, sortOrder, categoryId);
      const from = currentPage * PAGE_SIZE;
      const to = from + PAGE_SIZE;
      const pageSlice = filtered.slice(from, to);

      if (isInitial) {
        const unique = Array.from(new Map(pageSlice.map((p) => [p.id, p])).values());
        setProducts(unique);
        pageRef.current = 1;
        setPage(1);
      } else {
        setProducts((prev) => deduplicate(prev, pageSlice));
        pageRef.current = currentPage + 1;
        setPage((prev) => prev + 1);
      }
      setHasMore(to < filtered.length);
      return true;
    },
    [catalogId, search, sortField, sortOrder, categoryId]
  );

  const getProducts = useCallback(
    async (isInitial = true) => {
      if (!catalogId) return;

      // Evitar peticiones concurrentes accidentales en loadMore
      if (isLoadingRef.current && !isInitial) return;

      const seq = ++requestSeqRef.current;
      isLoadingRef.current = true;
      setLoading(true);

      if (isInitial) {
        pageRef.current = 0;
        setPage(0);
      }
      const currentPage = isInitial ? 0 : pageRef.current;

      // Mostrar productos desde la caché local de inmediato (0ms) si existen
      let hadCached = false;
      if (isInitial) {
        hadCached = await loadFromOfflineCache(true, 0);
        if (seq !== requestSeqRef.current) return;
      }

      if (isOffline()) {
        if (!isInitial) {
          await loadFromOfflineCache(false, currentPage);
        }
        if (seq === requestSeqRef.current) {
          isLoadingRef.current = false;
          setLoading(false);
        }
        return;
      }

      if (isInitial) {
        syncCatalogForOffline(catalogId);
      }

      const from = currentPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      try {
        let query = supabase.from('products').select('*').eq('catalog_id', catalogId);

        if (categoryId !== undefined && categoryId !== null) {
          if (categoryId === 'none') {
            query = query.is('category_id', null);
          } else {
            query = query.eq('category_id', Number(categoryId));
          }
        }

        const searchFilter = buildSupabaseSearchFilter(search);
        if (searchFilter) {
          query = query.or(searchFilter);
        }

        if (sortField === 'position') {
          query = query
            .order('is_out_of_stock', { ascending: true })
            .order('is_featured', { ascending: false })
            .order('position', { ascending: true })
            .order('id', { ascending: true });
        } else {
          query = query
            .order(sortField, { ascending: sortOrder === 'asc' })
            .order('id', { ascending: true });
        }

        const { data, error } = await query.range(from, to);

        if (seq !== requestSeqRef.current) return;
        if (error) throw error;

        const newProducts = data || [];

        if (isInitial) {
          const unique = Array.from(new Map(newProducts.map((p) => [p.id, p])).values());
          setProducts(unique);
          pageRef.current = 1;
          setPage(1);
        } else {
          setProducts((prev) => deduplicate(prev, newProducts));
          pageRef.current = currentPage + 1;
          setPage((prev) => prev + 1);
        }

        if (newProducts.length > 0) {
          upsertCatalogProductsInCache(catalogId, newProducts);
        }

        setHasMore(newProducts.length === PAGE_SIZE);
      } catch (err: any) {
        if (seq !== requestSeqRef.current) return;
        if (!hadCached) {
          const loadedOffline = await loadFromOfflineCache(isInitial, currentPage);
          if (!loadedOffline && !isNetworkError(err)) {
            toast.error('Error al cargar productos: ' + err.message);
          }
        }
      } finally {
        if (seq === requestSeqRef.current) {
          isLoadingRef.current = false;
          setLoading(false);
        }
      }
    },
    [catalogId, search, sortField, sortOrder, categoryId, loadFromOfflineCache]
  );

  const loadMore = useCallback(() => {
    if (!isLoadingRef.current && hasMore) {
      getProducts(false);
    }
  }, [getProducts, hasMore]);

  const ensureActiveSession = async (): Promise<void> => {
    if (typeof supabase.auth?.getSession !== 'function') return;
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    let session = sessionData?.session ?? null;

    const expiresSoon =
      typeof session?.expires_at === 'number' &&
      session.expires_at * 1000 - Date.now() < 60_000;

    if ((!session?.access_token || expiresSoon || sessionError) && typeof supabase.auth?.refreshSession === 'function') {
      const refreshed = await supabase.auth.refreshSession();
      session = refreshed?.data?.session ?? null;
    }

    if (!session?.access_token) {
      await useAuthStore.getState().logout();
      throw new Error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
    }
  };

  const saveProduct = async (form: ProductForm, id?: string, file?: File): Promise<Product | null> => {
    if (!catalogId) return null;
    setLoading(true);
    try {
      await ensureActiveSession();

      let imagen_url = form.imagen_url;

      if (file) {
        const optimizedBlob = await optimizeImage(file, {
          maxWidth: 800,
          maxHeight: 800,
          quality: 0.7,
        });

        const fileName = `${catalogId}/${Date.now()}.jpg`;
        const optimizedFile = blobToFile(optimizedBlob, fileName);

        let { error: uploadError } = await supabase.storage
          .from('products')
          .upload(fileName, optimizedFile, {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (
          uploadError &&
          /row-level security|unauthorized|jwt/i.test(uploadError.message || '') &&
          typeof supabase.auth?.refreshSession === 'function'
        ) {
          const refreshed = await supabase.auth.refreshSession();
          if (refreshed?.data?.session?.access_token) {
            const retryRes = await supabase.storage
              .from('products')
              .upload(fileName, optimizedFile, {
                contentType: 'image/jpeg',
                upsert: true,
              });
            uploadError = retryRes.error;
          } else {
            await useAuthStore.getState().logout();
            throw new Error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
          }
        }

        if (uploadError) {
          console.error('Upload Error:', uploadError);
          throw new Error(`Error al subir imagen: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(fileName);
        imagen_url = publicUrl;
      }

      const normalizedBadges = normalizeProductBadges(form.badges, form.is_featured);
      const isFeatured = normalizedBadges.includes('featured');

      const productData = {
        name: form.name.trim(),
        description: form.description?.trim() || null,
        price: form.price === '' || form.price === null ? null : Number(form.price),
        currency: form.currency,
        imagen_url,
        category_id: form.category_id || null,
        is_active: form.is_active !== undefined ? form.is_active : true,
        is_featured: isFeatured,
        badges: normalizedBadges,
        commission_amount:
          form.commission_amount === '' || form.commission_amount === null || form.commission_amount === undefined
            ? 0
            : Number(form.commission_amount),
        commission_currency: form.commission_currency || 'CUP',
        delivery_cost:
          form.delivery_cost === '' || form.delivery_cost === null || form.delivery_cost === undefined
            ? null
            : Number(form.delivery_cost),
        delivery_currency: form.delivery_currency || 'CUP',
        delivery_time_value:
          form.delivery_time_value === '' || form.delivery_time_value === null || form.delivery_time_value === undefined
            ? null
            : Number(form.delivery_time_value),
        delivery_time_unit: form.delivery_time_unit || 'hours',
      };

      let result: Product | null = null;

      if (id) {
        const { data, error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', id)
          .select();

        if (error) throw error;

        if (data && data.length > 0) {
          result = data[0];
        } else {
          // Si PostgREST no retorna filas en el RETURNING (por ejemplo por políticas RLS en SELECT tras UPDATE),
          // recuperamos el registro directamente para mantener el estado sincronizado
          const { data: fetched, error: fetchError } = await supabase
            .from('products')
            .select('*')
            .eq('id', id)
            .maybeSingle();

          if (fetchError) throw fetchError;
          result = fetched || ({ id, catalog_id: catalogId, ...productData } as Product);
        }

        setProducts((prev) => prev.map((p) => (p.id === id ? result! : p)));
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert([
            {
              ...productData,
              catalog_id: catalogId,
              position: 0,
            },
          ])
          .select();

        if (error) throw error;
        result = data && data.length > 0 ? data[0] : null;

        if (result) {
          setProducts((prev) => [result!, ...prev]);
        }
      }

      if (result) {
        await upsertCatalogProductsInCache(catalogId, [result]);
      }

      toast.success(id ? 'Producto actualizado' : 'Producto creado');
      return result;
    } catch (err: any) {
      console.error('Error saving product:', err);
      toast.error('Error al guardar: ' + (err.message || 'Error desconocido'));
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateProductsOrder = async (newProducts: Product[]) => {
    const oldProducts = [...products];
    setProducts(newProducts);

    try {
      const updates = newProducts.map((p, index) => ({
        id: p.id,
        catalog_id: catalogId!,
        name: p.name,
        description: p.description,
        price: p.price,
        currency: p.currency,
        imagen_url: p.imagen_url,
        position: index,
        is_active: p.is_active,
        is_featured: Boolean(p.is_featured),
        badges: Array.isArray(p.badges) ? p.badges : [],
        is_out_of_stock: p.is_out_of_stock,
        category_id: p.category_id || null,
      }));

      const { error } = await supabase.from('products').upsert(updates);
      if (error) throw error;
      if (catalogId) {
        await upsertCatalogProductsInCache(catalogId, newProducts);
      }
    } catch (err: any) {
      setProducts(oldProducts);
      toast.error('Error al guardar el orden');
    }
  };

  const deleteProducts = async (ids: string[]) => {
    if (!ids || ids.length === 0) return true;
    try {
      const { error } = await supabase.from('products').delete().in('id', ids);
      if (error) throw error;
      const idSet = new Set(ids);
      setProducts((prev) => prev.filter((p) => !idSet.has(p.id)));
      if (catalogId) {
        const cached = await getCatalogProductsFromCache(catalogId);
        if (cached) {
          await saveCatalogProductsToCache(
            catalogId,
            cached.filter((p) => !idSet.has(p.id))
          );
        }
        await syncCatalogForOffline(catalogId, true);
      }
      return true;
    } catch (err: any) {
      console.error('Error al eliminar productos:', err);
      throw err;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await deleteProducts([id]);
      toast.success('Producto eliminado');
    } catch (err: any) {
      toast.error('Error al eliminar');
    }
  };

  const toggleProductFeatured = async (product: Product): Promise<boolean> => {
    const nextFeatured = !product.is_featured;
    const nextBadges = syncBadgesWithFeatured(product.badges, nextFeatured);
    try {
      await ensureActiveSession();
      const { error } = await supabase
        .from('products')
        .update({ is_featured: nextFeatured, badges: nextBadges })
        .eq('id', product.id);

      if (error) throw error;

      const updated = { ...product, is_featured: nextFeatured, badges: nextBadges };
      setProducts((prev) => prev.map((p) => (p.id === product.id ? updated : p)));
      if (catalogId) {
        await upsertCatalogProductsInCache(catalogId, [updated]);
      }
      toast.success(nextFeatured ? 'Producto marcado como destacado' : 'Producto quitado de destacados');
      return true;
    } catch (err: any) {
      console.error('Error toggling featured product:', err);
      toast.error('Error al actualizar producto: ' + (err.message || 'Error desconocido'));
      return false;
    }
  };

  const updateProductBadges = async (product: Product, badges: string[]): Promise<boolean> => {
    const normalizedBadges = normalizeProductBadges(badges);
    const nextFeatured = normalizedBadges.includes('featured');
    try {
      await ensureActiveSession();
      const { error } = await supabase
        .from('products')
        .update({ badges: normalizedBadges, is_featured: nextFeatured })
        .eq('id', product.id);

      if (error) throw error;

      const updated = { ...product, badges: normalizedBadges, is_featured: nextFeatured };
      setProducts((prev) => prev.map((p) => (p.id === product.id ? updated : p)));
      if (catalogId) {
        await upsertCatalogProductsInCache(catalogId, [updated]);
      }
      toast.success('Etiquetas del producto actualizadas');
      return true;
    } catch (err: any) {
      console.error('Error updating product badges:', err);
      toast.error('Error al guardar etiquetas: ' + (err.message || 'Error desconocido'));
      return false;
    }
  };

  return {
    products,
    loading,
    hasMore,
    loadMore,
    getProducts,
    saveProduct,
    deleteProduct,
    deleteProducts,
    updateProductsOrder,
    toggleProductFeatured,
    updateProductBadges,
  };
};
