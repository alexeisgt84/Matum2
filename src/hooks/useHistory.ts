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

  return { logs, loading, getLogs };
};
