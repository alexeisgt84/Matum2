import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';
import type { AuthRole, AuthUser } from '../types/auth';

interface AdminUserState {
  users: AuthUser[];
  loading: boolean;
  error: string | null;
  getUsers: () => Promise<void>;
  updateUserRole: (userId: string, role: AuthRole) => Promise<void>;
  updateUserPlan: (userId: string, planId: string) => Promise<void>;
  toggleUserCatalogCreation: (userId: string, canCreate: boolean) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  changePassword: (userId: string, password: string) => Promise<void>;
}

const parseDisabledUserIds = (raw?: string | null): string[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
};

export const useAdminUserStore = create<AdminUserState>((set, get) => ({
  users: [],
  loading: false,
  error: null,

  getUsers: async () => {
    set({ loading: true, error: null });
    try {
      const [{ data, error }, { data: settingData }] = await Promise.all([
        supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'disabled_catalog_creation_users')
          .maybeSingle(),
      ]);

      if (error) throw error;

      const disabledIds = parseDisabledUserIds(settingData?.value);

      const formattedUsers: AuthUser[] = (data || []).map((u: any) => {
        const role = u.role || 'user';
        const canCreate =
          role === 'admin'
            ? true
            : typeof u.can_create_catalogs === 'boolean'
            ? u.can_create_catalogs
            : !disabledIds.includes(u.id);

        return {
          id: u.id,
          phone: u.phone || '',
          nombre: u.full_name || '',
          avatar_url: u.avatar_url,
          plan: u.plan || 'free',
          role,
          can_create_catalogs: canCreate,
        };
      });

      set({ users: formattedUsers, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  updateUserRole: async (userId, role) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ role })
        .eq('id', userId);

      if (error) throw error;

      const users = get().users.map(u => 
        u.id === userId ? { ...u, role } : u
      );
      set({ users });
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  updateUserPlan: async (userId, plan) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ plan })
        .eq('id', userId);

      if (error) throw error;

      const users = get().users.map(u => 
        u.id === userId ? { ...u, plan } : u
      );
      set({ users });
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  toggleUserCatalogCreation: async (userId, canCreate) => {
    try {
      const adminId = useAuthStore.getState().user?.id || null;

      // 1. Intentar primero mediante RPC SECURITY DEFINER
      if (typeof (supabase as any).rpc === 'function') {
        const { error: rpcError } = await supabase.rpc('admin_toggle_user_catalog_creation', {
          p_user_id: userId,
          p_can_create: canCreate,
          p_admin_id: adminId,
        });

        if (!rpcError) {
          const users = get().users.map((u) =>
            u.id === userId ? { ...u, can_create_catalogs: canCreate } : u
          );
          set({ users });
          return;
        }
      }

      // 2. Fallback: actualizar columna en users y lista en system_settings
      let usersColumnUpdated = false;
      try {
        const usersTable = supabase.from('users') as any;
        if (typeof usersTable.update === 'function') {
          const { error: userUpdateError } = await usersTable
            .update({ can_create_catalogs: canCreate })
            .eq('id', userId);
          if (!userUpdateError) {
            usersColumnUpdated = true;
          }
        }
      } catch {
        // Ignorar si falla actualización directa de users
      }

      let currentDisabledIds: string[] = get()
        .users.filter((u) => u.can_create_catalogs === false)
        .map((u) => u.id);

      const { data: settingData, error: fetchError } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'disabled_catalog_creation_users')
        .maybeSingle();

      if (!fetchError && settingData?.value !== undefined) {
        currentDisabledIds = parseDisabledUserIds(settingData.value);
      }

      const updatedIds = canCreate
        ? currentDisabledIds.filter((id) => id !== userId)
        : Array.from(new Set([...currentDisabledIds, userId]));

      const now = new Date().toISOString();
      const settingsTable = supabase.from('system_settings') as any;
      let settingsError: any = null;
      let settingsUpdated = false;

      if (typeof settingsTable.update === 'function') {
        const updateChain = settingsTable
          .update({
            value: JSON.stringify(updatedIds),
            updated_at: now,
          })
          .eq('key', 'disabled_catalog_creation_users');
        const updateRes =
          typeof updateChain?.select === 'function'
            ? await updateChain.select('key')
            : await updateChain;

        const updatedRows = updateRes?.data;
        if (!updateRes?.error && (!Array.isArray(updatedRows) || updatedRows.length > 0)) {
          settingsUpdated = true;
        }
      }

      if (!settingsUpdated) {
        const { error: upsertError } = await settingsTable.upsert({
          key: 'disabled_catalog_creation_users',
          value: JSON.stringify(updatedIds),
          description: 'Lista JSON de IDs de usuarios con la creación de catálogos desactivada',
          updated_at: now,
        });
        settingsError = upsertError;
      }

      if (settingsError && !usersColumnUpdated) {
        throw settingsError;
      }

      const users = get().users.map((u) =>
        u.id === userId ? { ...u, can_create_catalogs: canCreate } : u
      );
      set({ users });
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  deleteUser: async (userId) => {
    try {
      const { error } = await supabase.functions.invoke('admin-user-management', {
        body: { action: 'delete_user', userId }
      });

      if (error) throw error;

      set((state) => ({
        users: state.users.filter(u => u.id !== userId)
      }));
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  changePassword: async (userId, password) => {
    try {
      const { error } = await supabase.functions.invoke('admin-user-management', {
        body: { action: 'change_password', userId, password }
      });

      if (error) throw error;
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  }
}));
