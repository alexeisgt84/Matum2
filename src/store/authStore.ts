import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { AuthUser, LoginForm, RegisterForm } from '../types/auth';
import { phoneToEmail, generateCode, sendVerificationCode } from '../lib/authHelpers';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (data: LoginForm) => Promise<void>;
  sendRegisterCode: (data: RegisterForm) => Promise<void>;
  verifyAndRegister: (code: string, userData: RegisterForm) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  setError: (error: string | null) => void;
  isInitialized: boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  isInitialized: false,
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

      set({ 
        user: { 
          id: data.user.id, 
          phone, 
          nombre: profile?.full_name || '', 
          avatar_url: profile?.avatar_url || null, 
          plan: profile?.plan || 'free' 
        }, 
        loading: false 
      });
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  sendRegisterCode: async ({ phone }) => {
    set({ loading: true, error: null });
    try {
      const code = generateCode();
      const expiresAt = new Date(Date.now() + 10 * 60000).toISOString();

      // Guardar código en Supabase
      const { error: dbError } = await supabase
        .from('verification_codes')
        .insert([{ phone, code, expires_at: expiresAt }]);

      if (dbError) throw dbError;

      // Enviar por WhatsApp
      await sendVerificationCode(
        phone,
        code,
        import.meta.env.VITE_EVOLUTION_DEFAULT_URL || '',
        import.meta.env.VITE_EVOLUTION_API_KEY || '',
        import.meta.env.VITE_EVOLUTION_INSTANCE || ''
      );

      set({ loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  verifyAndRegister: async (code, userData) => {
    set({ loading: true, error: null });
    try {
      // 1. Verificar código
      const { data: vData, error: vError } = await supabase
        .from('verification_codes')
        .select('*')
        .eq('phone', userData.phone)
        .eq('code', code)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (vError || !vData) throw new Error('Código inválido o expirado');

      // 2. Registrar en Auth
      const email = phoneToEmail(userData.phone);
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password: userData.password,
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('Error al crear usuario');

      // 3. Crear perfil en tabla users
      const { error: profileError } = await supabase.from('users').insert([
        {
          id: authData.user.id,
          email,
          phone: userData.phone,
          full_name: userData.nombre,
          plan: 'free',
        },
      ]);

      if (profileError) throw profileError;

      set({ 
        user: { 
          id: authData.user.id, 
          phone: userData.phone, 
          nombre: userData.nombre, 
          avatar_url: null, 
          plan: 'free' 
        }, 
        loading: false 
      });
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  },

  loadUser: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        set({
          user: {
            id: session.user.id,
            phone: profile?.phone || session.user.email?.split('@')[0] || '',
            nombre: profile?.full_name || '',
            avatar_url: profile?.avatar_url || null,
            plan: profile?.plan || 'free',
          },
        });
      }
    } catch (err) {
      console.error('Error loading user:', err);
    } finally {
      set({ loading: false, isInitialized: true });
    }
  },
}));
