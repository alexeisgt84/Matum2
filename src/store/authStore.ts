import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { AuthUser, LoginForm, RegisterForm } from '../types/auth';
import { phoneToEmail, generateCode } from '../lib/authHelpers';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (data: LoginForm) => Promise<void>;
  sendRegisterCode: (data: RegisterForm) => Promise<void>;
  verifyAndRegister: (code: string, userData: RegisterForm) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  setError: (error: string | null) => void;
  isInitialized: boolean;
}

export const useAuthStore = create<AuthState>((set) => ({
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
          plan: profile?.plan || 'free',
          role: profile?.role || 'user'
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

      // Enviar por WhatsApp llamando a la Edge Function pública
      const { data: edgeData, error: edgeError } = await supabase.functions.invoke('send-verification-otp', {
        body: { phone }
      });

      if (edgeError || (edgeData && edgeData.error)) {
        throw new Error(edgeError?.message || edgeData?.error || 'Error al enviar el código de verificación por WhatsApp');
      }

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

      const cleanPhone = userData.phone.replace(/\D/g, '');
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

      set({ 
        user: { 
          id: authData.user.id, 
          phone: userData.phone, 
          nombre: userData.nombre, 
          avatar_url: null, 
          plan: 'free',
          role: 'user'
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
    console.log('[AuthStore] loadUser iniciado');
    try {
      console.log('[AuthStore] Obteniendo sesión de Supabase...');
      const { data: { session }, error } = await supabase.auth.getSession();
      console.log('[AuthStore] Sesión obtenida:', { hasSession: !!session, error });
      
      if (error) {
        console.warn('Supabase session load error (possibly invalid refresh token), signing out:', error);
        await supabase.auth.signOut();
        set({ user: null });
        return;
      }

      if (session?.user) {
        console.log('[AuthStore] Usuario con sesión activa:', session.user.id, 'Obteniendo perfil...');
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        console.log('[AuthStore] Perfil obtenido de la base de datos:', profile);

        set({
          user: {
            id: session.user.id,
            phone: profile?.phone || session.user.email?.split('@')[0] || '',
            nombre: profile?.full_name || '',
            avatar_url: profile?.avatar_url || null,
            plan: profile?.plan || 'free',
            role: profile?.role || 'user',
          },
        });
        console.log('[AuthStore] Estado del usuario actualizado en el store');
      } else {
        console.log('[AuthStore] No hay sesión activa de usuario');
        set({ user: null });
      }
    } catch (err) {
      console.error('[AuthStore] Error loading user:', err);
      try {
        await supabase.auth.signOut();
      } catch (_) {}
      set({ user: null });
    } finally {
      console.log('[AuthStore] loadUser finalizado (finally). Estableciendo isInitialized a true');
      set({ loading: false, isInitialized: true });
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
supabase.auth.onAuthStateChange(async (event, session) => {
  console.log('[AuthStore] onAuthStateChange disparado. Evento:', event, 'Sesión activa:', !!session);
  if (event === 'SIGNED_OUT') {
    console.log('[AuthStore] Evento SIGNED_OUT recibido. Limpiando usuario.');
    useAuthStore.setState({ user: null, loading: false, isInitialized: true });
  } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    if (session?.user) {
      const currentUser = useAuthStore.getState().user;
      if (currentUser && currentUser.id === session.user.id) {
        console.log('[AuthStore] El usuario ya está cargado en el store. Omitiendo fetch en onAuthStateChange.');
        return;
      }

      console.log('[AuthStore] Evento SIGNED_IN/TOKEN_REFRESHED. Programando obtención de perfil para:', session.user.id);
      
      // Ejecutamos de forma asíncrona fuera del ciclo de onAuthStateChange para evitar deadlocks de Supabase
      setTimeout(async () => {
        const freshUser = useAuthStore.getState().user;
        if (freshUser && freshUser.id === session.user.id) {
          console.log('[AuthStore] El usuario ya fue cargado por loadUser. Omitiendo query redundante en onAuthStateChange.');
          // Nos aseguramos de que esté inicializado
          useAuthStore.setState({ isInitialized: true });
          return;
        }
        
        try {
          console.log('[AuthStore] Ejecutando query de perfil en onAuthStateChange...');
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          console.log('[AuthStore] Perfil obtenido en onAuthStateChange:', profile);

          useAuthStore.setState({
            user: {
              id: session.user.id,
              phone: profile?.phone || session.user.email?.split('@')[0] || '',
              nombre: profile?.full_name || '',
              avatar_url: profile?.avatar_url || null,
              plan: profile?.plan || 'free',
              role: profile?.role || 'user',
            },
            loading: false,
            isInitialized: true
          });
          console.log('[AuthStore] Estado inicializado en onAuthStateChange (isInitialized = true)');
        } catch (err) {
          console.error('[AuthStore] Error fetching user profile on auth change:', err);
        }
      }, 0);
    } else {
      console.log('[AuthStore] Evento SIGNED_IN/TOKEN_REFRESHED sin usuario en sesión.');
    }
  } else {
    console.log('[AuthStore] Evento no manejado en onAuthStateChange:', event);
  }
});
