import { useState, useCallback } from 'react';
import { nemuSupabase } from '../lib/nemuSupabase';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

export const useNemuImport = (catalogId?: string) => {
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);

  const getStores = async () => {
    setLoading(true);
    try {
      const { data, error } = await nemuSupabase
        .from('stores')
        .select('id, name, logo_url, description')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data || [];
    } catch (err: any) {
      toast.error('Error al obtener tiendas de Nemu: ' + err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getStoreProducts = async (storeId: string) => {
    setLoading(true);
    try {
      const { data, error } = await nemuSupabase
        .from('products')
        .select(`
          *,
          product_images ( url, display_order )
        `)
        .eq('store_id', storeId)
        .eq('is_active', true)
        .eq('is_deleted', false);
      
      if (error) throw error;
      return data || [];
    } catch (err: any) {
      toast.error('Error al obtener productos de Nemu: ' + err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const importProducts = async (nemuProducts: any[]) => {
    if (!catalogId) return;
    setImporting(true);
    setProgress(0);
    setTotal(nemuProducts.length);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < nemuProducts.length; i++) {
        const nemuProd = nemuProducts[i];
        try {
            let localImageUrl = null;

            // 1. Manejar imagen (sin optimizar, solo transferencia)
            const images = nemuProd.product_images || [];
            const sourceImageUrl = images.sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))[0]?.url;

            if (sourceImageUrl) {
                try {
                    const response = await fetch(sourceImageUrl);
                    const blob = await response.blob();
                    
                    const fileName = `${catalogId}/imported_${Date.now()}_${i}.jpg`;
                    const { error: uploadError } = await supabase.storage
                        .from('products')
                        .upload(fileName, blob, {
                            contentType: 'image/jpeg',
                            upsert: true
                        });

                    if (uploadError) throw uploadError;

                    const { data: { publicUrl } } = supabase.storage
                        .from('products')
                        .getPublicUrl(fileName);
                    
                    localImageUrl = publicUrl;
                } catch (imgErr) {
                    console.error('Error migrating image:', imgErr);
                    // Continuamos sin imagen si falla
                }
            }

            // 2. Insertar en Matum2
            const { error: insertError } = await supabase
                .from('products')
                .insert([{
                    catalog_id: catalogId,
                    nemu_product_id: nemuProd.id,
                    name: nemuProd.name,
                    description: nemuProd.description,
                    price: nemuProd.price,
                    currency: nemuProd.currency || 'CUP',
                    imagen_url: localImageUrl,
                    position: i,
                    is_active: true,
                    is_out_of_stock: nemuProd.stock_status === 'out_of_stock'
                }]);

            if (insertError) throw insertError;
            successCount++;

        } catch (err) {
            console.error('Error importing product:', nemuProd.name, err);
            errorCount++;
        }
        setProgress(i + 1);
    }

    setImporting(false);
    if (successCount > 0) {
        toast.success(`Vinculación completada: ${successCount} productos.`);
        if (errorCount > 0) {
            toast.error(`${errorCount} productos fallaron.`);
        }
        return true;
    } else {
        toast.error('No se pudo vincular ningún producto.');
        return false;
    }
  };

  return { getStores, getStoreProducts, importProducts, loading, importing, progress, total };
};
