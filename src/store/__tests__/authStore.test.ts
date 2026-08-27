import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '../authStore';
import { supabase } from '../../lib/supabase';

vi.mock('../../lib/supabase', () => {
  const queryBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    upsert: vi.fn().mockResolvedValue({ error: null }),
  };

  return {
    supabase: {
      from: vi.fn().mockReturnValue(queryBuilder),
      auth: {
        signInWithPassword: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
        getSession: vi.fn(),
        updateUser: vi.fn(),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } },
        }),
      },
      _queryBuilder: queryBuilder,
    },
  };
});

describe('authStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: null,
      loading: false,
      isInitialized: false,
      error: null,
    });
  });

  it('debe inicializarse con el estado por defecto', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('debe iniciar sesión correctamente y guardar los datos del usuario en el store', async () => {
    const mockUser = { id: 'user-123', email: '5351234567@matum.app' };
    const mockProfile = {
      full_name: 'Juan Pérez',
      avatar_url: 'https://example.com/avatar.jpg',
      plan: 'pro',
      role: 'user',
    };

    (supabase.auth.signInWithPassword as any).mockResolvedValueOnce({
      data: { user: mockUser, session: {} },
      error: null,
    });

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
      }),
    });
    (supabase.from as any).mockReturnValueOnce({ select: mockSelect });

    await useAuthStore.getState().login({ phone: '5351234567', password: 'secretpassword' });

    const state = useAuthStore.getState();
    expect(state.user).toEqual({
      id: 'user-123',
      phone: '5351234567',
      nombre: 'Juan Pérez',
      avatar_url: 'https://example.com/avatar.jpg',
      plan: 'pro',
      role: 'user',
    });
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('debe manejar errores de inicio de sesión y setear el error', async () => {
    (supabase.auth.signInWithPassword as any).mockResolvedValueOnce({
      data: { user: null, session: null },
      error: new Error('Credenciales inválidas'),
    });

    await expect(
      useAuthStore.getState().login({ phone: '5351234567', password: 'wrong' })
    ).rejects.toThrow('Credenciales inválidas');

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.error).toBe('Credenciales inválidas');
    expect(state.loading).toBe(false);
  });

  it('debe cerrar sesión y limpiar el usuario', async () => {
    useAuthStore.setState({
      user: {
        id: 'user-123',
        phone: '5351234567',
        nombre: 'Juan Pérez',
        avatar_url: null,
        plan: 'free',
        role: 'user',
      },
    });

    (supabase.auth.signOut as any).mockResolvedValueOnce({ error: null });

    await useAuthStore.getState().logout();

    expect(useAuthStore.getState().user).toBeNull();
  });
});
