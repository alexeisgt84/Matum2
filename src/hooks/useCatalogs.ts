import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { Catalog, CatalogForm } from '../types/catalog';
import { toast } from 'react-hot-toast';

export const useCatalogs = () => {
  const { user } = useAuthStore();
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [loading, setLoading] = useState(false);

  const getCatalogs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('catalogs')
        .select(`
          *,
          products:products(count)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform data to include a simple productCount property
      const formattedCatalogs = (data || []).map((cat: any) => ({
        ...cat,
        productCount: cat.products?.[0]?.count || 0
      }));

      setCatalogs(formattedCatalogs);
    } catch (err: any) {
      toast.error('Error al cargar catálogos: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createCatalog = async (form: CatalogForm) => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('catalogs')
        .insert([{ 
          user_id: user.id, 
          name: form.nombre, 
          description: form.descripcion,
          template: form.plantilla || '¡Hola! Te comparto nuestro catálogo de *{catalog_name}*.\n\n*Productos destacados:*\n{products_list}\n\nPara más info, escríbenos.',
          share_template: form.share_template || '*{product_name}*\n\n{product_description}\n\nPrecio: {product_price}',
          out_of_stock_template: form.out_of_stock_template || '*AGOTADO*\n{product_name}',
          new_product_template: form.new_product_template || '*NUEVO PRODUCTO*\n{product_name}\n{product_description}\nPrecio: {product_price}\n\nCatálogo: {catalog_name}',
          available_template: form.available_template || '*ESTÁ DE VUELTA*\n{product_name}\n{product_description}\nPrecio: {product_price}\n\n¡Pide el tuyo ahora!',
          is_active: form.is_active,
          is_sequence_scheduled: form.is_sequence_scheduled,
          is_individual_scheduled: form.is_individual_scheduled,
          sequence_start_time: form.sequence_start_time,
          price_update_template: form.price_update_template,
          product_edit_template: form.product_edit_template,
          nemu_store_id: form.nemu_store_id
        }])
        .select()
        .single();

      if (error) throw error;
      toast.success('Catálogo creado');
      return data;
    } catch (err: any) {
      toast.error('Error al crear: ' + err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateCatalog = async (id: string, form: Partial<CatalogForm>) => {
    setLoading(true);
    try {
      const updateData: any = {};
      
      if (form.nombre !== undefined) updateData.name = form.nombre;
      if (form.descripcion !== undefined) updateData.description = form.descripcion;
      if (form.plantilla !== undefined) updateData.template = form.plantilla;
      if (form.share_template !== undefined) updateData.share_template = form.share_template;
      if (form.out_of_stock_template !== undefined) updateData.out_of_stock_template = form.out_of_stock_template;
      if (form.new_product_template !== undefined) updateData.new_product_template = form.new_product_template;
      if (form.available_template !== undefined) updateData.available_template = form.available_template;
      if (form.is_active !== undefined) updateData.is_active = form.is_active;
      if (form.is_sequence_scheduled !== undefined) updateData.is_sequence_scheduled = form.is_sequence_scheduled;
      if (form.is_individual_scheduled !== undefined) updateData.is_individual_scheduled = form.is_individual_scheduled;
      if (form.sequence_start_time !== undefined) updateData.sequence_start_time = form.sequence_start_time;
      if (form.price_update_template !== undefined) updateData.price_update_template = form.price_update_template;
      if (form.product_edit_template !== undefined) updateData.product_edit_template = form.product_edit_template;
      if (form.nemu_store_id !== undefined) updateData.nemu_store_id = form.nemu_store_id;

      const { error } = await supabase
        .from('catalogs')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      toast.success('Catálogo actualizado');
      return true;
    } catch (err: any) {
      toast.error('Error al actualizar: ' + err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteCatalog = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('catalogs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setCatalogs(catalogs.filter(c => c.id !== id));
      toast.success('Catálogo eliminado');
      return true;
    } catch (err: any) {
      toast.error('Error al eliminar: ' + err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { catalogs, loading, getCatalogs, createCatalog, updateCatalog, deleteCatalog };
};
