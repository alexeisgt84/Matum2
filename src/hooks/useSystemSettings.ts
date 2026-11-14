import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { getAppBaseUrl } from '../lib/urlHelper';
import { useAuthStore } from '../store/authStore';

export interface SystemSetting {
  key: string;
  value: string;
  description?: string;
  updated_at?: string;
}

export interface CatalogCreationPermissionResult {
  allowed: boolean;
  reason: 'global_disabled' | 'user_disabled' | null;
  message: string | null;
}

const DEFAULT_SETTINGS: Record<string, string> = {
  app_url: 'nazzar.shop',
  allow_user_catalog_creation: 'true',
  disabled_catalog_creation_users: '[]',
};

const SETTINGS_UPDATED_EVENT = 'matum:system-settings-updated';
let memorySettingsCache: Record<string, string> = { ...DEFAULT_SETTINGS };

export function parseDisabledCatalogUsers(raw?: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

export function evaluateCatalogCreationPermission(params: {
  settings: Record<string, string>;
  userId?: string | null;
  userRole?: string | null;
  userCanCreateFlag?: boolean;
}): CatalogCreationPermissionResult {
  const { settings, userId, userRole, userCanCreateFlag } = params;

  if (userRole === 'admin') {
    return { allowed: true, reason: null, message: null };
  }

  if (settings.allow_user_catalog_creation === 'false') {
    return {
      allowed: false,
      reason: 'global_disabled',
      message: 'La creación de nuevos catálogos está desactivada por el administrador.',
    };
  }

  const disabledIds = parseDisabledCatalogUsers(settings.disabled_catalog_creation_users);
  if (userCanCreateFlag === false || (userId && disabledIds.includes(userId))) {
    return {
      allowed: false,
      reason: 'user_disabled',
      message: 'La creación de nuevos catálogos ha sido desactivada para tu cuenta por el administrador.',
    };
  }

  return { allowed: true, reason: null, message: null };
}

function broadcastSettingsUpdate(nextSettings: Record<string, string>) {
  memorySettingsCache = nextSettings;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SETTINGS_UPDATED_EVENT, { detail: nextSettings }));
  }
}

export function useSystemSettings() {
  const [settings, setSettings] = useState<Record<string, string>>(() => ({
    ...memorySettingsCache,
  }));
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
        const fallback = { ...DEFAULT_SETTINGS };
        setSettings(fallback);
        broadcastSettingsUpdate(fallback);
      } else if (data) {
        const settingsMap: Record<string, string> = {
          ...DEFAULT_SETTINGS,
        };
        data.forEach((item) => {
          settingsMap[item.key] = item.value;
        });
        setSettings(settingsMap);
        broadcastSettingsUpdate(settingsMap);
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleSync = (event: Event) => {
      const customEvent = event as CustomEvent<Record<string, string>>;
      if (customEvent.detail) {
        setSettings(customEvent.detail);
      }
    };
    window.addEventListener(SETTINGS_UPDATED_EVENT, handleSync);
    return () => window.removeEventListener(SETTINGS_UPDATED_EVENT, handleSync);
  }, []);

  const getAppUrl = useCallback(() => {
    return getAppBaseUrl(settings.app_url);
  }, [settings.app_url]);

  const updateSetting = useCallback(async (key: string, value: string, description?: string) => {
    const applyLocalUpdate = () => {
      const nextSettings = {
        ...memorySettingsCache,
        [key]: value,
      };
      setSettings(nextSettings);
      broadcastSettingsUpdate(nextSettings);
    };

    try {
      const adminId = useAuthStore.getState().user?.id || null;

      // 1. Intentar primero mediante RPC SECURITY DEFINER (evita bloqueos RLS si JWT expiró o falta política WITH CHECK)
      if (typeof (supabase as any).rpc === 'function') {
        const { error: rpcError } = await supabase.rpc('admin_update_system_setting', {
          p_key: key,
          p_value: value,
          p_description: description || null,
          p_admin_id: adminId,
        });

        if (!rpcError) {
          applyLocalUpdate();
          return { success: true };
        }
      }

      // 2. Fallback: intentar UPDATE si la fila ya existe, luego UPSERT
      const now = new Date().toISOString();
      const settingsTable = supabase.from('system_settings') as any;

      if (typeof settingsTable.update === 'function') {
        const updatePayload: Record<string, string> = { value, updated_at: now };
        if (description !== undefined) {
          updatePayload.description = description;
        }
        const updateChain = settingsTable.update(updatePayload).eq('key', key);
        const updateResult =
          typeof updateChain?.select === 'function'
            ? await updateChain.select('key')
            : await updateChain;

        const updatedRows = updateResult?.data;
        if (
          !updateResult?.error &&
          (!Array.isArray(updatedRows) || updatedRows.length > 0)
        ) {
          applyLocalUpdate();
          return { success: true };
        }
      }

      const { error: upsertError } = await settingsTable.upsert({
        key,
        value,
        description,
        updated_at: now,
      });

      if (upsertError) throw upsertError;

      applyLocalUpdate();
      return { success: true };
    } catch (err: any) {
      console.error(`Error al actualizar la configuración ${key}:`, err);
      return { success: false, error: err.message };
    }
  }, []);

  const isGlobalCatalogCreationEnabled = settings.allow_user_catalog_creation !== 'false';

  const disabledCatalogUserIds = useMemo(
    () => parseDisabledCatalogUsers(settings.disabled_catalog_creation_users),
    [settings.disabled_catalog_creation_users]
  );

  const setGlobalCatalogCreation = useCallback(
    async (enabled: boolean) => {
      return updateSetting(
        'allow_user_catalog_creation',
        enabled ? 'true' : 'false',
        'Permitir a los usuarios crear nuevos catálogos globalmente'
      );
    },
    [updateSetting]
  );

  const checkUserCatalogCreation = useCallback(
    (
      user?: { id?: string | null; role?: string | null; can_create_catalogs?: boolean } | null,
      profileCanCreate?: boolean
    ): CatalogCreationPermissionResult => {
      const userCanCreateFlag =
        profileCanCreate === false || user?.can_create_catalogs === false
          ? false
          : true;

      return evaluateCatalogCreationPermission({
        settings,
        userId: user?.id,
        userRole: user?.role,
        userCanCreateFlag,
      });
    },
    [settings]
  );

  return {
    settings,
    loading,
    getAppUrl,
    updateSetting,
    refresh: fetchSettings,
    isGlobalCatalogCreationEnabled,
    disabledCatalogUserIds,
    setGlobalCatalogCreation,
    checkUserCatalogCreation,
  };
}
