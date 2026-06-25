import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getAppBaseUrl } from '../lib/urlHelper';

export interface SystemSetting {
  key: string;
  value: string;
  description?: string;
  updated_at?: string;
}

export function useSystemSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({
    app_url: 'matum.vercel.app',
  });
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value');

      if (error) {
        // En caso de que la tabla no exista o haya algún error de RLS, usamos fallback por defecto
        console.warn('Advertencia al cargar system_settings (usando fallback):', error.message);
        setSettings({
          app_url: 'matum.vercel.app',
        });
      } else if (data) {
        const settingsMap: Record<string, string> = {
          app_url: 'matum.vercel.app', // Fallback inicial
        };
        data.forEach((item) => {
          settingsMap[item.key] = item.value;
        });
        setSettings(settingsMap);
      }
    } catch (err) {
      console.error('Error al consultar system_settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const getAppUrl = useCallback(() => {
    return getAppBaseUrl(settings.app_url);
  }, [settings.app_url]);

  const updateSetting = useCallback(async (key: string, value: string, description?: string) => {
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({ key, value, description, updated_at: new Date().toISOString() });

      if (error) throw error;

      setSettings((prev) => ({
        ...prev,
        [key]: value,
      }));
      return { success: true };
    } catch (err: any) {
      console.error(`Error al actualizar la configuración ${key}:`, err);
      return { success: false, error: err.message };
    }
  }, []);

  return { settings, loading, getAppUrl, updateSetting, refresh: fetchSettings };
}
