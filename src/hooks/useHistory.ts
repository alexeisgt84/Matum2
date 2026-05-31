import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { SendingLog } from '../types/history';
import { toast } from 'react-hot-toast';

export const useHistory = (catalogId?: string) => {
  const [logs, setLogs] = useState<SendingLog[]>([]);
  const [loading, setLoading] = useState(false);

  const getLogs = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('sending_logs')
        .select('*, catalogs(name)')
        .order('created_at', { ascending: false });

      if (catalogId) {
        query = query.eq('catalog_id', catalogId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      const formattedLogs = data.map((log: any) => ({
        ...log,
        catalog_name: log.catalogs?.name || 'Catálogo eliminado'
      }));

      setLogs(formattedLogs);
    } catch (err: any) {
      toast.error('Error al cargar historial');
    } finally {
      setLoading(false);
    }
  }, [catalogId]);

  const clearLogs = useCallback(async () => {
    const confirmed = window.confirm(
      catalogId 
        ? '¿Estás seguro de que deseas eliminar el historial de este catálogo?' 
        : '¿Estás seguro de que deseas eliminar todo el historial de la base de datos?'
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      let query = supabase.from('sending_logs').delete();
      
      if (catalogId) {
        query = query.eq('catalog_id', catalogId);
      } else {
        query = query.neq('id', '00000000-0000-0000-0000-000000000000');
      }

      const { error } = await query; 

      if (error) {
        console.error('Error de Supabase al eliminar:', error);
        throw error;
      }
      
      setLogs([]);
      toast.success('Historial eliminado');
    } catch (err: any) {
      console.error('Error detallado:', err);
      toast.error(`Error al eliminar historial: ${err.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  }, [catalogId]);

  return { logs, loading, getLogs, clearLogs };
};
