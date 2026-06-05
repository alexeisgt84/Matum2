import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Category, CategoryForm } from '../types/category';
import { toast } from 'react-hot-toast';

export const useCategories = (catalogId?: string) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  const getCategories = useCallback(async () => {
    if (!catalogId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('catalog_id', catalogId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (err: any) {
      console.error('Error al cargar categorías:', err);
      toast.error('Error al cargar categorías: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [catalogId]);

  const saveCategory = async (form: CategoryForm, id?: number): Promise<Category | null> => {
    if (!catalogId) return null;
    setLoading(true);
    try {
      const categoryData = {
        name: form.name.trim(),
        icon: form.icon?.trim() || null,
        catalog_id: catalogId,
        is_active: form.is_active !== undefined ? form.is_active : true,
      };

      let result: Category | null = null;

      if (id) {
        // Update
        const { data, error } = await supabase
          .from('categories')
          .update(categoryData)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        result = data;

        setCategories(prev => prev.map(c => c.id === id ? result! : c));
        toast.success('Categoría actualizada');
      } else {
        // Create - Obtener el último display_order para ponerlo al final
        const lastOrder = categories.length > 0 
          ? Math.max(...categories.map(c => c.display_order)) 
          : 0;

        const { data, error } = await supabase
          .from('categories')
          .insert([{ 
            ...categoryData, 
            display_order: lastOrder + 1 
          }])
          .select()
          .single();
        if (error) throw error;
        result = data;

        setCategories(prev => [...prev, result!]);
        toast.success('Categoría creada');
      }

      return result;
    } catch (err: any) {
      console.error('Error al guardar categoría:', err);
      toast.error('Error al guardar: ' + (err.message || 'Error desconocido'));
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateCategoriesOrder = async (newCategories: Category[]) => {
    const oldCategories = [...categories];
    setCategories(newCategories);

    try {
      const updates = newCategories.map((c, index) => ({
        id: c.id,
        catalog_id: catalogId!,
        name: c.name,
        icon: c.icon,
        display_order: index,
        is_active: c.is_active
      }));

      const { error } = await supabase.from('categories').upsert(updates);
      if (error) throw error;
    } catch (err: any) {
      console.error('Error al ordenar categorías:', err);
      setCategories(oldCategories);
      toast.error('Error al guardar el orden de categorías');
    }
  };

  const deleteCategory = async (id: number) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCategories(prev => prev.filter(c => c.id !== id));
      toast.success('Categoría eliminada');
      return true;
    } catch (err: any) {
      console.error('Error al eliminar categoría:', err);
      toast.error('Error al eliminar: ' + err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { 
    categories, 
    loading, 
    getCategories, 
    saveCategory, 
    deleteCategory, 
    updateCategoriesOrder 
  };
};
