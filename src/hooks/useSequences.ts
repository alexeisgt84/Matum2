import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { AutomationSequence, SequenceForm } from '../types/sequence';
import { toast } from 'react-hot-toast';

export const useSequences = (catalogId?: string) => {
  const [sequences, setSequences] = useState<AutomationSequence[]>([]);
  const [loading, setLoading] = useState(false);

  const getSequences = useCallback(async () => {
    if (!catalogId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('automation_sequences')
        .select('*')
        .eq('catalog_id', catalogId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setSequences(data || []);
    } catch (err: any) {
      toast.error('Error al cargar secuencias: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [catalogId]);

  const saveSequence = async (form: SequenceForm, id?: string) => {
    if (!catalogId) return;
    setLoading(true);
    try {
      if (id) {
        const { error } = await supabase
          .from('automation_sequences')
          .update(form)
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('automation_sequences')
          .insert([{ ...form, catalog_id: catalogId }]);
        if (error) throw error;
      }

      toast.success(id ? 'Secuencia actualizada' : 'Secuencia creada');
      getSequences();
      return true;
    } catch (err: any) {
      toast.error('Error al guardar: ' + err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const toggleSequence = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('automation_sequences')
        .update({ is_active: isActive })
        .eq('id', id);
      if (error) throw error;
      setSequences(sequences.map(s => s.id === id ? { ...s, is_active: isActive } : s));
    } catch (err) {
      toast.error('Error al cambiar estado');
    }
  };

  const deleteSequence = async (id: string) => {
    try {
      const { error } = await supabase.from('automation_sequences').delete().eq('id', id);
      if (error) throw error;
      setSequences(sequences.filter(s => s.id !== id));
      toast.success('Secuencia eliminada');
    } catch (err: any) {
      toast.error('Error al eliminar');
    }
  };

  return { sequences, loading, getSequences, saveSequence, deleteSequence, toggleSequence };
};
