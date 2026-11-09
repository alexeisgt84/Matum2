import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : undefined);
const supabaseAnonKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY : undefined);

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan las variables de entorno de Supabase. ' +
      'Asegúrate de configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tu panel de Vercel.'
  );
}

let lastNetworkSuccessAt = 0;
let consecutiveNetworkFailures = 0;

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
      ? 30000
      : isAuthRequest || isWriteRequest
        ? 20000
        : 12000;

  const controller = new AbortController();
  let abortedByCaller = false;
  if (init?.signal) {
    if (init.signal.aborted) {
      abortedByCaller = true;
      controller.abort();
    } else {
      init.signal.addEventListener(
        'abort',
        () => {
          abortedByCaller = true;
          controller.abort();
        },
        { once: true }
      );
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
    consecutiveNetworkFailures = 0;
    lastNetworkSuccessAt = Date.now();
    dispatchNetworkStatus(true);
    return response;
  } catch (err) {
    if (abortedByCaller) {
      throw err;
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      consecutiveNetworkFailures++;
      dispatchNetworkStatus(false);
    } else {
      consecutiveNetworkFailures++;
      const recentlySucceeded = Date.now() - lastNetworkSuccessAt < 10000;
      if (!recentlySucceeded && consecutiveNetworkFailures >= 3) {
        dispatchNetworkStatus(false);
      }
    }
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
