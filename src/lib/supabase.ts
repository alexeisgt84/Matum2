import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan las variables de entorno de Supabase. ' +
      'Asegúrate de configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tu panel de Vercel.'
  );
}

const dispatchNetworkStatus = (online: boolean) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('matum:network-status', { detail: { online } }));
  }
};

const customFetch: typeof fetch = async (input, init) => {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    dispatchNetworkStatus(false);
    throw new TypeError('Failed to fetch: device is offline');
  }

  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const method = (init?.method || 'GET').toUpperCase();
  const isStorageUpload = url.includes('/storage/v1/object/') && method !== 'GET';
  const isEdgeFunction = url.includes('/functions/v1/');
  const isAuthRequest = url.includes('/auth/v1/');
  const isWriteRequest = method !== 'GET' && method !== 'HEAD';

  const timeoutMs =
    isStorageUpload || isEdgeFunction
      ? 25000
      : isAuthRequest || isWriteRequest
        ? 15000
        : 4500;

  const controller = new AbortController();
  if (init?.signal) {
    if (init.signal.aborted) {
      controller.abort();
    } else {
      init.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(new TypeError('Failed to fetch: network timeout'));
    }, timeoutMs);
  });

  try {
    const response = await Promise.race([
      fetch(input, { ...init, signal: controller.signal }),
      timeoutPromise,
    ]);
    dispatchNetworkStatus(true);
    return response;
  } catch (err) {
    dispatchNetworkStatus(false);
    throw err;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    lock: async (_name, _acquireTimeout, fn) => fn(),
  },
  global: {
    fetch: customFetch,
  },
});
