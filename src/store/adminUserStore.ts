import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { AuthUser } from '../types/auth';

interface AdminUserState {
  users: AuthUser[];
  loading: boolean;
  error: string | null;
  getUsers: () => Promise<void>;
  updateUserRole: (userId: string, role: 'user' | 'admin') => Promise<void>;
  updateUserPlan: (userId: string, planId: string) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  changePassword: (userId: string, password: string) => Promise<void>;
}

export const useAdminUserStore = create<AdminUserState>((set, get) => ({
  users: [],
  loading: false,
  error: null,

  getUsers: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedUsers: AuthUser[] = data.map((u: any) => ({
        id: u.id,
        phone: u.phone || '',
        nombre: u.full_name || '',
        avatar_url: u.avatar_url,
        plan: u.plan || 'free',
        role: u.role || 'user'
      }));

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
