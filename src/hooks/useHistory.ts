import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { SendingLog } from '../types/history';
import { toast } from 'react-hot-toast';

export const useHistory = () => {
  const [logs, setLogs] = useState<SendingLog[]>([]);
  const [loading, setLoading] = useState(false);

  const getLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sending_logs')
        .select('*, catalogs(name)')
        .order('created_at', { ascending: false });

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
  }, []);

  const clearLogs = useCallback(async () => {
    const confirmed = window.confirm('¿Estás seguro de que deseas eliminar todo el historial de la base de datos?');
    if (!confirmed) return;

    setLoading(true);
    try {
      // Usamos un filtro que atrape todos los registros de la base de datos
      // Esto es más seguro que depender del estado local de 'logs'
      const { error } = await supabase
        .from('sending_logs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); 

      if (error) {
        console.error('Error de Supabase al eliminar:', error);
        throw error;
      }
      
      setLogs([]);
      toast.success('Historial eliminado de la base de datos');
    } catch (err: any) {
      console.error('Error detallado:', err);
      toast.error(`Error al eliminar historial: ${err.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  }, [logs]);

  return { logs, loading, getLogs, clearLogs };
};
