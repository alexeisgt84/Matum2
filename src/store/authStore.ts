import { create } from 'zustand';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import type { AuthUser, LoginForm, RegisterForm } from '../types/auth';
import { phoneToEmail } from '../lib/authHelpers';
import { isOffline, isNetworkError, cacheImageUrls } from '../lib/offlineCache';

const CACHED_USER_KEY = 'matum_cached_user';
let isExplicitLogout = false;
let lastProactiveRefreshAt = 0;

const notifySessionExpired = () => {
  if (typeof window !== 'undefined') {
    toast.error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.', {
      id: 'session-expired',
      duration: 5000,
    });
  }
};

const saveCachedUser = (user: AuthUser | null) => {
  try {
    if (user) {
      localStorage.setItem(CACHED_USER_KEY, JSON.stringify(user));
      if (user.avatar_url) {
        cacheImageUrls([user.avatar_url]);
      }
    } else {
      localStorage.removeItem(CACHED_USER_KEY);
    }
  } catch {
    // ignore storage errors
  }
};

/**
 * Obtiene el usuario en caché local o lo reconstruye instantáneamente desde
 * el token de sesión de Supabase guardado en localStorage (`sb-*-auth-token`).
 */
const getCachedUser = (): AuthUser | null => {
  try {
    const raw = localStorage.getItem(CACHED_USER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AuthUser;
      if (parsed && parsed.id) {
        return parsed;
      }
    }

    // Fallback: buscar sesión guardada por Supabase en localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const tokenRaw = localStorage.getItem(key);
        if (!tokenRaw) continue;
        const parsed = JSON.parse(tokenRaw);
        const sbUser = parsed?.user || parsed?.currentSession?.user;
        if (sbUser?.id) {
          const recovered: AuthUser = {
            id: sbUser.id,
            phone: sbUser.email?.split('@')[0] || sbUser.phone || '',
            nombre: sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || '',
            avatar_url: sbUser.user_metadata?.avatar_url || null,
            plan: 'free',
            role: 'user',
            referral_code: null,
            payout_info: null,
          };
          localStorage.setItem(CACHED_USER_KEY, JSON.stringify(recovered));
          return recovered;
        }
      }
    }
  } catch {
    // ignore
  }
  return null;
};

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (data: LoginForm) => Promise<void>;
  register: (data: RegisterForm) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  refreshSessionIfNeeded: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  setError: (error: string | null) => void;
  isInitialized: boolean;
}

const initialCachedUser = getCachedUser();

export const useAuthStore = create<AuthState>((set, get) => ({
  user: initialCachedUser,
  loading: false,
  isInitialized: !!initialCachedUser,
  error: null,

  setError: (error) => set({ error }),

  login: async ({ phone, password }) => {
    set({ loading: true, error: null });
    try {
      const email = phoneToEmail(phone);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      const authUser: AuthUser = {
        id: data.user.id,
        phone,
        nombre: profile?.full_name || '',
        avatar_url: profile?.avatar_url || null,
        plan: profile?.plan || 'free',
        role: profile?.role || 'user',
        ...(profile?.can_create_catalogs !== undefined
          ? { can_create_catalogs: Boolean(profile.can_create_catalogs) }
          : {}),
        referral_code: profile?.referral_code || null,
        payout_info: profile?.payout_info || null,
      };

      saveCachedUser(authUser);
      set({ user: authUser, loading: false, isInitialized: true });
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  register: async (userData) => {
    set({ loading: true, error: null });
    try {
      const cleanPhone = userData.phone.replace(/\D/g, '');

      // 1. Verificar si el teléfono ya está registrado
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (checkError) throw checkError;
      if (existingUser) {
        throw new Error('El número de teléfono ya está registrado');
      }

      // 2. Registrar en Auth
      const email = phoneToEmail(userData.phone);
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password: userData.password,
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('Error al crear usuario');

      // 3. Crear perfil de usuario
      const { error: profileError } = await supabase.from('users').upsert([
        {
          id: authData.user.id,
          email,
          phone: cleanPhone,
          full_name: userData.nombre,
          plan: 'free',
        },
      ]);

      if (profileError) throw profileError;

      const authUser: AuthUser = {
        id: authData.user.id,
        phone: userData.phone,
        nombre: userData.nombre,
        avatar_url: null,
        plan: 'free',
        role: 'user',
      };

      saveCachedUser(authUser);
      set({ user: authUser, loading: false, isInitialized: true });
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  logout: async () => {
    isExplicitLogout = true;
    saveCachedUser(null);
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore signOut network errors
    } finally {
      isExplicitLogout = false;
    }
    set({ user: null, loading: false, isInitialized: true });
  },

  loadUser: async () => {
    const cachedUser = getCachedUser() || get().user;

    // Si hay usuario en caché local, mantener la sesión activa de inmediato (0ms, sin pedir login)
    if (cachedUser) {
      saveCachedUser(cachedUser);
      set({ user: cachedUser, loading: false, isInitialized: true });
    }

    if (isOffline()) {
      set({ user: cachedUser, loading: false, isInitialized: true });
      return;
    }

    try {
      const sessionResult = await Promise.race([
        supabase.auth.getSession(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Failed to fetch: session timeout')), 12000)
        ),
      ]);

      const {
        data: { session },
        error,
      } = sessionResult;

      if (error) {
        if (cachedUser && (isOffline() || isNetworkError(error))) {
          // Mantener la sesión local solo si el fallo se debe a falta de red o modo offline
          set({ user: cachedUser, loading: false, isInitialized: true });
          return;
        }
        if (cachedUser) {
          notifySessionExpired();
        }
        saveCachedUser(null);
        set({ user: null, loading: false, isInitialized: true });
        return;
      }

      if (session?.user) {
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError && cachedUser && cachedUser.id === session.user.id) {
          set({ user: cachedUser, loading: false, isInitialized: true });
          return;
        }

        const authUser: AuthUser = {
          id: session.user.id,
          phone: profile?.phone || cachedUser?.phone || session.user.email?.split('@')[0] || '',
          nombre: profile?.full_name || cachedUser?.nombre || '',
          avatar_url: profile?.avatar_url ?? cachedUser?.avatar_url ?? null,
          plan: profile?.plan || cachedUser?.plan || 'free',
          role: profile?.role || cachedUser?.role || 'user',
          ...(profile?.can_create_catalogs !== undefined
            ? { can_create_catalogs: Boolean(profile.can_create_catalogs) }
            : cachedUser?.can_create_catalogs !== undefined
            ? { can_create_catalogs: Boolean(cachedUser.can_create_catalogs) }
            : {}),
          referral_code: profile?.referral_code ?? cachedUser?.referral_code ?? null,
          payout_info: profile?.payout_info ?? cachedUser?.payout_info ?? null,
        };

        saveCachedUser(authUser);
        set({ user: authUser, loading: false, isInitialized: true });
      } else if (cachedUser && isOffline()) {
        // Mantener la sesión guardada en el dispositivo únicamente si está sin conexión
        set({ user: cachedUser, loading: false, isInitialized: true });
      } else {
        if (cachedUser) {
          notifySessionExpired();
        }
        saveCachedUser(null);
        set({ user: null, loading: false, isInitialized: true });
      }
    } catch (err) {
      console.warn('[AuthStore] Error o timeout verificando sesión, manteniendo sesión local:', err);
      if (cachedUser) {
        set({ user: cachedUser, loading: false, isInitialized: true });
        return;
      }
      set({ user: null, loading: false, isInitialized: true });
    } finally {
      set({ loading: false, isInitialized: true });
    }
  },

  refreshSessionIfNeeded: async () => {
    const currentUser = get().user;
    if (!currentUser || isOffline()) return;

    const now = Date.now();
    if (now - lastProactiveRefreshAt < 30_000) return;
    lastProactiveRefreshAt = now;

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        if (isNetworkError(error)) return;
        notifySessionExpired();
        saveCachedUser(null);
        set({ user: null, loading: false, isInitialized: true });
        return;
      }

      if (!session) {
        if (typeof supabase.auth.refreshSession === 'function') {
          const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
          if (refreshed?.session) return;
          if (refreshErr && isNetworkError(refreshErr)) return;
        }
        notifySessionExpired();
        saveCachedUser(null);
        set({ user: null, loading: false, isInitialized: true });
        return;
      }

      const expiresAtMs = typeof session.expires_at === 'number' ? session.expires_at * 1000 : 0;
      const shouldRefresh = expiresAtMs > 0 && expiresAtMs - now < 10 * 60_000;
      if (shouldRefresh && typeof supabase.auth.refreshSession === 'function') {
        await supabase.auth.refreshSession();
      }
    } catch (err) {
      if (!isNetworkError(err)) {
        console.warn('[AuthStore] Error al verificar sesión activa:', err);
      }
    }
  },

  updatePassword: async (newPassword: string) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
      set({ loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },
}));

// Suscribirse a cambios de estado de autenticación de Supabase de forma global
if (typeof supabase.auth?.onAuthStateChange === 'function') {
  supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_OUT') {
    const hadUser = Boolean(getCachedUser() || useAuthStore.getState().user);
    // En modo offline se conserva la caché de lectura, pero con conexión un SIGNED_OUT indica sesión revocada o expirada
    if (!isExplicitLogout && isOffline()) {
      const preservedUser = getCachedUser() || useAuthStore.getState().user;
      if (preservedUser) {
        useAuthStore.setState({ user: preservedUser, loading: false, isInitialized: true });
        return;
      }
    }
    if (!isExplicitLogout && hadUser) {
      notifySessionExpired();
    }
    saveCachedUser(null);
    useAuthStore.setState({ user: null, loading: false, isInitialized: true });
  } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    if (session?.user) {
      const currentUser = useAuthStore.getState().user;
      if (currentUser && currentUser.id === session.user.id) {
        return;
      }

      setTimeout(async () => {
        const freshUser = useAuthStore.getState().user;
        if (freshUser && freshUser.id === session.user.id) {
          useAuthStore.setState({ isInitialized: true });
          return;
        }

        try {
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          const cachedUser = getCachedUser();
          const authUser: AuthUser = {
            id: session.user.id,
            phone: profile?.phone || cachedUser?.phone || session.user.email?.split('@')[0] || '',
            nombre: profile?.full_name || cachedUser?.nombre || '',
            avatar_url: profile?.avatar_url ?? cachedUser?.avatar_url ?? null,
            plan: profile?.plan || cachedUser?.plan || 'free',
            role: profile?.role || cachedUser?.role || 'user',
            ...(profile?.can_create_catalogs !== undefined
              ? { can_create_catalogs: Boolean(profile.can_create_catalogs) }
              : cachedUser?.can_create_catalogs !== undefined
              ? { can_create_catalogs: Boolean(cachedUser.can_create_catalogs) }
              : {}),
            referral_code: profile?.referral_code ?? cachedUser?.referral_code ?? null,
            payout_info: profile?.payout_info ?? cachedUser?.payout_info ?? null,
          };

          saveCachedUser(authUser);
          useAuthStore.setState({
            user: authUser,
            loading: false,
            isInitialized: true,
          });
        } catch (err) {
          console.error('[AuthStore] Error fetching user profile on auth change:', err);
        }
      }, 0);
    }
  }
  });
}
