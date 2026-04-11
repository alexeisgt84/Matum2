import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Product, ProductForm } from '../types/product';
import { toast } from 'react-hot-toast';

import { optimizeImage, blobToFile } from '../lib/imageOptimizer';

export const useProducts = (catalogId?: string) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const getProducts = useCallback(async () => {
    if (!catalogId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('catalog_id', catalogId)
        .order('position', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (err: any) {
      toast.error('Error al cargar productos: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [catalogId]);

  const saveProduct = async (form: ProductForm, id?: string, file?: File) => {
    if (!catalogId) return;
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

        if (uploadError) throw uploadError;


        const { data: { publicUrl } } = supabase.storage
          .from('products')
          .getPublicUrl(fileName);
        
        imagen_url = publicUrl;
      }

      if (id) {
        // Update
        const { error } = await supabase
          .from('products')
          .update({ ...form, imagen_url })
          .eq('id', id);
        if (error) throw error;
      } else {
        // Create
        const { error } = await supabase
          .from('products')
          .insert([{ 
            ...form, 
            catalog_id: catalogId, 
            imagen_url,
            position: products.length 
          }]);
        if (error) throw error;
      }

      toast.success(id ? 'Producto actualizado' : 'Producto creado');
      getProducts();
      return true;
    } catch (err: any) {
      toast.error('Error al guardar: ' + err.message);
      return false;
    } finally {
      setLoading(false);
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

  return { products, loading, getProducts, saveProduct, deleteProduct };
};
