import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Product, ProductForm } from '../types/product';
import { toast } from 'react-hot-toast';

import { optimizeImage, blobToFile } from '../lib/imageOptimizer';

export const useProducts = (catalogId?: string) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const getProducts = useCallback(async (isInitial = true) => {
    if (!catalogId) return;
    
    setLoading(true);
    if (isInitial) {
      setPage(0);
      setHasMore(true);
    }

    const currentPage = isInitial ? 0 : page;
    const from = currentPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('catalog_id', catalogId)
        .order('is_out_of_stock', { ascending: true })
        .order('position', { ascending: true })
        .range(from, to);

      if (error) throw error;
      
      const newProducts = data || [];
      
      if (isInitial) {
        setProducts(newProducts);
      } else {
        setProducts(prev => [...prev, ...newProducts]);
      }

      setHasMore(newProducts.length === PAGE_SIZE);
      if (!isInitial) {
        setPage(prev => prev + 1);
      } else {
        setPage(1);
      }
    } catch (err: any) {
      toast.error('Error al cargar productos: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [catalogId, page]);

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
        // Optimizar imagen antes de subir (Max 800px, 70% calidad)
        const optimizedBlob = await optimizeImage(file, {
          maxWidth: 800,
          maxHeight: 800,
          quality: 0.7
        });
        
        const fileName = `${catalogId}/${Date.now()}.jpg`;
        const optimizedFile = blobToFile(optimizedBlob, fileName);

        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(fileName, optimizedFile, {
            contentType: 'image/jpeg',
            upsert: true
          });

        if (uploadError) {
          console.error('Upload Error:', uploadError);
          throw new Error(`Error al subir imagen: ${uploadError.message}`);
        }


        const { data: { publicUrl } } = supabase.storage
          .from('products')
          .getPublicUrl(fileName);
        
        imagen_url = publicUrl;
      }

      // Preparar data limpia
      const productData = {
        name: form.name.trim(),
        description: form.description?.trim() || null,
        price: form.price === '' || form.price === null ? null : Number(form.price),
        currency: form.currency,
        imagen_url
      };

      let result: Product | null = null;

      if (id) {
        // Update
        const { data, error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        result = data;
        
        // Actualizar estado local para evitar duplicados y mejorar UX
        setProducts(prev => prev.map(p => p.id === id ? result! : p));
      } else {
        // Create
        const { data, error } = await supabase
          .from('products')
          .insert([{ 
            ...productData, 
            catalog_id: catalogId, 
            position: 0,
            is_active: true
          }])
          .select()
          .single();
        if (error) throw error;
        result = data;

        // Agregar al inicio localmente
        setProducts(prev => [result!, ...prev]);
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
    // Actualizar estado local inmediatamente para UX suave
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
        is_out_of_stock: p.is_out_of_stock
      }));

      const { error } = await supabase.from('products').upsert(updates);
      if (error) throw error;
      
    } catch (err: any) {
      setProducts(oldProducts);
      toast.error('Error al guardar el orden');
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      setProducts(products.filter(p => p.id !== id));
      toast.success('Producto eliminado');
    } catch (err: any) {
      toast.error('Error al eliminar');
    }
  };

  return { products, loading, hasMore, loadMore, getProducts, saveProduct, deleteProduct, updateProductsOrder };
};

