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
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCatalogs(data || []);
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
          template: form.plantilla,
          sequence_start_time: form.sequence_start_time,
          is_active: form.is_active
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

  const updateCatalog = async (id: string, form: CatalogForm) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('catalogs')
        .update({ 
          name: form.nombre, 
          description: form.descripcion,
          template: form.plantilla,
          sequence_start_time: form.sequence_start_time,
          is_active: form.is_active
        })
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
