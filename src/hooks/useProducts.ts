import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
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
    const q = search.trim().toLowerCase();
    const numSearch = Number(search.trim());
    result = result.filter((p) => {
      const matchName = p.name?.toLowerCase().includes(q);
      const matchDesc = p.description?.toLowerCase().includes(q);
      const matchPrice = !isNaN(numSearch) && p.price !== null && Number(p.price) === numSearch;
      return Boolean(matchName || matchDesc || matchPrice);
    });
  }

  result.sort((a: any, b: any) => {
    if (sortField === 'position') {
      const stockDiff = Number(Boolean(a.is_out_of_stock)) - Number(Boolean(b.is_out_of_stock));
      if (stockDiff !== 0) return stockDiff;
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
        setProducts(pageSlice);
        setPage(1);
      } else {
        setProducts((prev) => [...prev, ...pageSlice]);
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

      const currentPage = isInitial ? 0 : page;

      // Mostrar productos desde la caché local de inmediato (0ms) si existen
      let hadCached = false;
      if (isInitial) {
        hadCached = await loadFromOfflineCache(true, 0);
      }

      if (isOffline()) {
        if (!isInitial) {
          await loadFromOfflineCache(false, currentPage);
        }
        setLoading(false);
        return;
      }

      if (!hadCached) {
        setLoading(true);
      }
      if (isInitial) {
        setPage(0);
        setHasMore(true);
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

        if (search && search.trim() !== '') {
          const s = `%${search.trim()}%`;
          const numSearch = Number(search.trim());
          if (!isNaN(numSearch)) {
            query = query.or(`name.ilike.${s},description.ilike.${s},price.eq.${numSearch}`);
          } else {
            query = query.or(`name.ilike.${s},description.ilike.${s}`);
          }
        }

        if (sortField === 'position') {
          query = query
            .order('is_out_of_stock', { ascending: true })
            .order('position', { ascending: true });
        } else {
          query = query.order(sortField, { ascending: sortOrder === 'asc' });
        }

        const { data, error } = await query.range(from, to);

        if (error) throw error;

        const newProducts = data || [];

        if (isInitial) {
          setProducts(newProducts);
        } else {
          setProducts((prev) => [...prev, ...newProducts]);
        }

        if (newProducts.length > 0) {
          upsertCatalogProductsInCache(catalogId, newProducts);
        }

        setHasMore(newProducts.length === PAGE_SIZE);
        if (!isInitial) {
          setPage((prev) => prev + 1);
        } else {
          setPage(1);
        }
      } catch (err: any) {
        if (!hadCached) {
          const loadedOffline = await loadFromOfflineCache(isInitial, currentPage);
          if (!loadedOffline && !isNetworkError(err)) {
            toast.error('Error al cargar productos: ' + err.message);
          }
        }
      } finally {
        setLoading(false);
      }
    },
    [catalogId, page, search, sortField, sortOrder, categoryId, loadFromOfflineCache]
  );

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      getProducts(false);
    }
  }, [getProducts, loading, hasMore]);

  const saveProduct = async (form: ProductForm, id?: string, file?: File): Promise<Product | null> => {
    if (!catalogId) return null;
    setLoading(true);
    try {
      let imagen_url = form.imagen_url;

      if (file) {
        const optimizedBlob = await optimizeImage(file, {
          maxWidth: 800,
          maxHeight: 800,
          quality: 0.7,
        });

        const fileName = `${catalogId}/${Date.now()}.jpg`;
        const optimizedFile = blobToFile(optimizedBlob, fileName);

        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(fileName, optimizedFile, {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (uploadError) {
          console.error('Upload Error:', uploadError);
          throw new Error(`Error al subir imagen: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(fileName);
        imagen_url = publicUrl;
      }

      const productData = {
        name: form.name.trim(),
        description: form.description?.trim() || null,
        price: form.price === '' || form.price === null ? null : Number(form.price),
        currency: form.currency,
        imagen_url,
        category_id: form.category_id || null,
        is_active: form.is_active !== undefined ? form.is_active : true,
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
  };
};
