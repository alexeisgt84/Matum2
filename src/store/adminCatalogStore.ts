import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { AdminCatalog } from '../types/catalog';

interface AdminCatalogState {
  catalogs: AdminCatalog[];
  loading: boolean;
  error: string | null;
  getAdminCatalogs: () => Promise<void>;
  toggleBlockCatalog: (catalogId: string, isBlocked: boolean, reason?: string) => Promise<boolean>;
  toggleActiveCatalog: (catalogId: string, isActive: boolean) => Promise<boolean>;
  deleteCatalogWithAllData: (catalogId: string) => Promise<{ success: boolean; message?: string }>;
}

export const useAdminCatalogStore = create<AdminCatalogState>((set, get) => ({
  catalogs: [],
  loading: false,
  error: null,

  getAdminCatalogs: async () => {
    set({ loading: true, error: null });
    try {
      // 1. Obtener todos los catálogos con conteo de productos
      const { data: catalogsData, error: catalogsError } = await supabase
        .from('catalogs')
        .select(`
          *,
          products:products(count)
        `)
        .order('created_at', { ascending: false });

      if (catalogsError) throw catalogsError;

      // 2. Obtener usuarios para asociar propietarios
      const userIds = Array.from(new Set((catalogsData || []).map((c: any) => c.user_id).filter(Boolean)));
      const userMap: Record<string, any> = {};

      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, full_name, phone, avatar_url, plan, role')
          .in('id', userIds);

        (usersData || []).forEach((u: any) => {
          userMap[u.id] = u;
        });
      }

      // 3. Formatear
      const formatted: AdminCatalog[] = (catalogsData || []).map((c: any) => ({
        ...c,
        product_count: c.products?.[0]?.count ?? 0,
        owner: userMap[c.user_id] || null,
        is_blocked: Boolean(c.is_blocked),
      }));

      set({ catalogs: formatted, loading: false });
    } catch (err: any) {
      console.error('Error fetching admin catalogs:', err);
      set({ error: err.message || 'Error al cargar catálogos', loading: false });
    }
  },

  toggleBlockCatalog: async (catalogId: string, isBlocked: boolean, reason?: string) => {
    try {
      // Intentar vía RPC primero (seguro con SECURITY DEFINER)
      const { data: rpcData, error: rpcError } = await supabase.rpc('admin_toggle_block_catalog', {
        p_catalog_id: catalogId,
        p_is_blocked: isBlocked,
        p_reason: reason || (isBlocked ? 'Bloqueado por administración' : null),
      });

      if (rpcError) {
        console.warn('RPC admin_toggle_block_catalog error, trying direct update fallback:', rpcError);
        // Fallback actualización directa
        const { error: updateError } = await supabase
          .from('catalogs')
          .update({
            is_blocked: isBlocked,
            blocked_reason: isBlocked ? (reason || 'Bloqueado por administración') : null,
            blocked_at: isBlocked ? new Date().toISOString() : null,
            is_active: !isBlocked,
          })
          .eq('id', catalogId);

        if (updateError) throw updateError;
      }

      // Actualizar estado local
      set((state) => ({
        catalogs: state.catalogs.map((c) =>
          c.id === catalogId
            ? {
                ...c,
                is_blocked: isBlocked,
                blocked_reason: isBlocked ? (reason || 'Bloqueado por administración') : null,
                blocked_at: isBlocked ? new Date().toISOString() : null,
                is_active: !isBlocked,
              }
            : c
        ),
      }));

      return true;
    } catch (err: any) {
      console.error('Error in toggleBlockCatalog:', err);
      throw err;
    }
  },

  toggleActiveCatalog: async (catalogId: string, isActive: boolean) => {
    const { error } = await supabase
      .from('catalogs')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', catalogId);

    if (error) throw error;

    set((state) => ({
      catalogs: state.catalogs.map((c) =>
        c.id === catalogId ? { ...c, is_active: isActive } : c
      ),
    }));

    return true;
  },

  deleteCatalogWithAllData: async (catalogId: string) => {
    try {
      // 1. Invocar RPC para borrado atómico en cascada
      const { data, error } = await supabase.rpc('admin_delete_catalog', {
        p_catalog_id: catalogId,
      });

      if (error) {
        console.error('RPC admin_delete_catalog error:', error);
        throw new Error(error.message || 'Error al ejecutar la eliminación en el servidor');
      }

      if (data && data.success === false) {
        throw new Error(data.message || 'No se pudo completar la eliminación');
      }

      // 2. Actualizar estado local inmediatamente
      set((state) => ({
        catalogs: state.catalogs.filter((c) => c.id !== catalogId),
      }));

      return {
        success: true,
        message: data?.message || 'Catálogo y toda su información eliminados correctamente.',
      };
    } catch (err: any) {
      console.error('Error in deleteCatalogWithAllData:', err);
      throw err;
    }
  },
}));
