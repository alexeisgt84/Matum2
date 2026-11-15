import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAdminUserStore } from '../adminUserStore';
import { useAuthStore } from '../authStore';
import { evaluateCatalogCreationPermission, useSystemSettings } from '../../hooks/useSystemSettings';
import { supabase } from '../../lib/supabase';

vi.mock('../../lib/supabase', () => {
  return {
    supabase: {
      from: vi.fn(),
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        refreshSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } },
        }),
      },
      functions: {
        invoke: vi.fn(),
      },
    },
  };
});

describe('evaluateCatalogCreationPermission', () => {
  it('permite siempre crear catálogos a administradores aunque esté bloqueado global o individualmente', () => {
    const res = evaluateCatalogCreationPermission({
      settings: {
        allow_user_catalog_creation: 'false',
        disabled_catalog_creation_users: '["admin-1"]',
      },
      userId: 'admin-1',
      userRole: 'admin',
      userCanCreateFlag: false,
    });

    expect(res).toEqual({
      allowed: true,
      reason: null,
      message: null,
    });
  });

  it('bloquea a usuarios regulares cuando el ajuste global está desactivado', () => {
    const res = evaluateCatalogCreationPermission({
      settings: {
        allow_user_catalog_creation: 'false',
        disabled_catalog_creation_users: '[]',
      },
      userId: 'user-1',
      userRole: 'user',
      userCanCreateFlag: true,
    });

    expect(res.allowed).toBe(false);
    expect(res.reason).toBe('global_disabled');
    expect(res.message).toContain('desactivada por el administrador');
  });

  it('bloquea a un usuario específico cuando está en disabled_catalog_creation_users o tiene la bandera en false', () => {
    const byList = evaluateCatalogCreationPermission({
      settings: {
        allow_user_catalog_creation: 'true',
        disabled_catalog_creation_users: '["user-1"]',
      },
      userId: 'user-1',
      userRole: 'user',
      userCanCreateFlag: true,
    });

    expect(byList.allowed).toBe(false);
    expect(byList.reason).toBe('user_disabled');

    const byFlag = evaluateCatalogCreationPermission({
      settings: {
        allow_user_catalog_creation: 'true',
        disabled_catalog_creation_users: '[]',
      },
      userId: 'user-2',
      userRole: 'user',
      userCanCreateFlag: false,
    });

    expect(byFlag.allowed).toBe(false);
    expect(byFlag.reason).toBe('user_disabled');
  });

  it('permite crear catálogos a usuarios regulares cuando no existen bloqueos', () => {
    const res = evaluateCatalogCreationPermission({
      settings: {
        allow_user_catalog_creation: 'true',
        disabled_catalog_creation_users: '["other-user"]',
      },
      userId: 'user-1',
      userRole: 'user',
      userCanCreateFlag: true,
    });

    expect(res).toEqual({
      allowed: true,
      reason: null,
      message: null,
    });
  });
});

describe('adminUserStore - toggleUserCatalogCreation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (supabase as any).rpc;
    useAdminUserStore.setState({
      users: [],
      loading: false,
      error: null,
    });
    useAuthStore.setState({
      user: {
        id: 'admin-1',
        phone: '5359991976',
        nombre: 'Admin',
        avatar_url: null,
        plan: 'premium',
        role: 'admin',
      },
    });
  });

  it('desactiva la creación de catálogos para un usuario y actualiza system_settings y el estado local', async () => {
    useAdminUserStore.setState({
      users: [
        {
          id: 'user-1',
          phone: '5351111111',
          nombre: 'Usuario Uno',
          avatar_url: null,
          plan: 'free',
          role: 'user',
          can_create_catalogs: true,
        },
      ],
    });

    const mockUpsert = vi.fn().mockResolvedValue({ error: null });
    const mockUsersUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'system_settings') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { value: '[]' },
                error: null,
              }),
            }),
          }),
          upsert: mockUpsert,
        };
      }
      if (table === 'users') {
        return {
          update: mockUsersUpdate,
        };
      }
      return {};
    });

    await useAdminUserStore.getState().toggleUserCatalogCreation('user-1', false);

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'disabled_catalog_creation_users',
        value: JSON.stringify(['user-1']),
      })
    );
    expect(mockUsersUpdate).toHaveBeenCalledWith({ can_create_catalogs: false });

    const updatedUser = useAdminUserStore.getState().users.find((u) => u.id === 'user-1');
    expect(updatedUser?.can_create_catalogs).toBe(false);
  });

  it('reactiva la creación de catálogos para un usuario removiéndolo de la lista de desactivados', async () => {
    useAdminUserStore.setState({
      users: [
        {
          id: 'user-1',
          phone: '5351111111',
          nombre: 'Usuario Uno',
          avatar_url: null,
          plan: 'free',
          role: 'user',
          can_create_catalogs: false,
        },
        {
          id: 'user-2',
          phone: '5352222222',
          nombre: 'Usuario Dos',
          avatar_url: null,
          plan: 'pro',
          role: 'user',
          can_create_catalogs: false,
        },
      ],
    });

    const mockUpsert = vi.fn().mockResolvedValue({ error: null });
    const mockUsersUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'system_settings') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { value: JSON.stringify(['user-1', 'user-2']) },
                error: null,
              }),
            }),
          }),
          upsert: mockUpsert,
        };
      }
      if (table === 'users') {
        return {
          update: mockUsersUpdate,
        };
      }
      return {};
    });

    await useAdminUserStore.getState().toggleUserCatalogCreation('user-1', true);

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'disabled_catalog_creation_users',
        value: JSON.stringify(['user-2']),
      })
    );

    const updatedUser1 = useAdminUserStore.getState().users.find((u) => u.id === 'user-1');
    const updatedUser2 = useAdminUserStore.getState().users.find((u) => u.id === 'user-2');
    expect(updatedUser1?.can_create_catalogs).toBe(true);
    expect(updatedUser2?.can_create_catalogs).toBe(false);
  });

  it('usa la RPC admin_toggle_user_catalog_creation cuando está disponible en Supabase', async () => {
    useAdminUserStore.setState({
      users: [
        {
          id: 'user-1',
          phone: '5351111111',
          nombre: 'Usuario Uno',
          avatar_url: null,
          plan: 'free',
          role: 'user',
          can_create_catalogs: true,
        },
      ],
    });

    (supabase as any).rpc = vi.fn().mockResolvedValue({
      data: { success: true, user_id: 'user-1', can_create_catalogs: false },
      error: null,
    });

    await useAdminUserStore.getState().toggleUserCatalogCreation('user-1', false);

    expect((supabase as any).rpc).toHaveBeenCalledWith('admin_toggle_user_catalog_creation', {
      p_user_id: 'user-1',
      p_can_create: false,
      p_admin_id: 'admin-1',
    });
    const updatedUser = useAdminUserStore.getState().users.find((u) => u.id === 'user-1');
    expect(updatedUser?.can_create_catalogs).toBe(false);
  });

  it('no falla si system_settings da error RLS en el fallback pero users.can_create_catalogs se actualizó', async () => {
    useAdminUserStore.setState({
      users: [
        {
          id: 'user-1',
          phone: '5351111111',
          nombre: 'Usuario Uno',
          avatar_url: null,
          plan: 'free',
          role: 'user',
          can_create_catalogs: true,
        },
      ],
    });

    (supabase as any).rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'function not found' },
    });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      if (table === 'system_settings') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { value: '[]' },
                error: null,
              }),
            }),
          }),
          upsert: vi.fn().mockResolvedValue({
            error: { message: 'new row violates row-level security policy for table "system_settings"' },
          }),
        };
      }
      return {};
    });

    await expect(
      useAdminUserStore.getState().toggleUserCatalogCreation('user-1', false)
    ).resolves.toBeUndefined();

    const updatedUser = useAdminUserStore.getState().users.find((u) => u.id === 'user-1');
    expect(updatedUser?.can_create_catalogs).toBe(false);
  });
});

describe('useSystemSettings - admin_update_system_setting y fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (supabase as any).rpc;
    useAuthStore.setState({
      user: {
        id: 'admin-1',
        phone: '5359991976',
        nombre: 'Admin',
        avatar_url: null,
        plan: 'premium',
        role: 'admin',
      },
    });
  });

  it('usa la RPC admin_update_system_setting al cambiar setGlobalCatalogCreation', async () => {
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'system_settings') {
        return {
          select: vi.fn().mockResolvedValue({
            data: [
              { key: 'app_url', value: 'nazaar.shop' },
              { key: 'allow_user_catalog_creation', value: 'true' },
            ],
            error: null,
          }),
        };
      }
      return {};
    });

    (supabase as any).rpc = vi.fn().mockResolvedValue({
      data: { key: 'allow_user_catalog_creation', value: 'false' },
      error: null,
    });

    const { result } = renderHook(() => useSystemSettings());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let res: { success: boolean; error?: string } | undefined;
    await act(async () => {
      res = await result.current.setGlobalCatalogCreation(false);
    });

    expect(res?.success).toBe(true);
    expect((supabase as any).rpc).toHaveBeenCalledWith('admin_update_system_setting', {
      p_key: 'allow_user_catalog_creation',
      p_value: 'false',
      p_description: 'Permitir a los usuarios crear nuevos catálogos globalmente',
      p_admin_id: 'admin-1',
    });
    expect(result.current.isGlobalCatalogCreationEnabled).toBe(false);
  });
});

describe('adminUserStore - changePassword y validación de sesión', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAdminUserStore.setState({ users: [], loading: false, error: null });
    useAuthStore.setState({
      user: {
        id: 'admin-1',
        phone: '5359991976',
        nombre: 'Admin',
        avatar_url: null,
        plan: 'premium',
        role: 'admin',
      },
      loading: false,
      isInitialized: true,
      error: null,
    });
  });

  it('envía el JWT válido en Authorization al invocar admin-user-management para cambiar contraseña', async () => {
    const validJwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbi0xIn0.signature';
    (supabase.auth.getSession as any).mockResolvedValueOnce({
      data: {
        session: {
          access_token: validJwt,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        },
      },
      error: null,
    });
    (supabase.functions.invoke as any).mockResolvedValueOnce({
      data: { message: 'Contraseña actualizada correctamente' },
      error: null,
    });

    await useAdminUserStore.getState().changePassword('user-1', 'nueva123');

    expect(supabase.functions.invoke).toHaveBeenCalledWith('admin-user-management', {
      body: { action: 'change_password', userId: 'user-1', password: 'nueva123' },
      headers: { Authorization: `Bearer ${validJwt}` },
    });
  });

  it('rechaza con mensaje claro y limpia la sesión zombie si no existe un JWT válido (evita enviar sb_publishable)', async () => {
    localStorage.setItem('matum_cached_user', JSON.stringify({ id: 'admin-1', role: 'admin' }));
    (supabase.auth.getSession as any).mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });
    (supabase.auth.refreshSession as any).mockResolvedValueOnce({
      data: { session: null },
      error: new Error('Invalid Refresh Token'),
    });

    await expect(
      useAdminUserStore.getState().changePassword('user-1', 'nueva123')
    ).rejects.toThrow('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');

    expect(supabase.functions.invoke).not.toHaveBeenCalled();
    expect(useAuthStore.getState().user).toBeNull();
    expect(localStorage.getItem('matum_cached_user')).toBeNull();
  });

  it('extrae el mensaje real devuelto por la Edge Function en error.context', async () => {
    const validJwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbi0xIn0.signature';
    (supabase.auth.getSession as any).mockResolvedValueOnce({
      data: {
        session: {
          access_token: validJwt,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        },
      },
      error: null,
    });
    (supabase.functions.invoke as any).mockResolvedValueOnce({
      data: null,
      error: {
        message: 'Edge Function returned a non-2xx status code',
        context: new Response(JSON.stringify({ error: 'La contraseña debe tener al menos 6 caracteres.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }),
      },
    });

    await expect(
      useAdminUserStore.getState().changePassword('user-1', '123')
    ).rejects.toThrow('La contraseña debe tener al menos 6 caracteres.');
  });
});
