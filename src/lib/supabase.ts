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
      ? 45000
      : isAuthRequest || isWriteRequest
        ? 30000
        : 25000;

  const controller = new AbortController();
  let abortedByCaller = false;
  let abortedByTimeout = false;

  const handleCallerAbort = () => {
    abortedByCaller = true;
    const reason = init?.signal?.reason || new DOMException('The user aborted a request.', 'AbortError');
    try {
      controller.abort(reason);
    } catch {
      controller.abort();
    }
  };

  if (init?.signal) {
    if (init.signal.aborted) {
      handleCallerAbort();
    } else {
      init.signal.addEventListener('abort', handleCallerAbort, { once: true });
    }
  }

  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      abortedByTimeout = true;
      const timeoutErr = new DOMException('Failed to fetch: network timeout', 'TimeoutError');
      try {
        controller.abort(timeoutErr);
      } catch {
        controller.abort();
      }
      reject(timeoutErr);
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
  } catch (err: any) {
    if (abortedByCaller || (!abortedByTimeout && err?.name === 'AbortError')) {
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
    if (init?.signal) {
      init.signal.removeEventListener('abort', handleCallerAbort);
    }
  }
};

const authLocks = new Map<string, Promise<unknown>>();

/**
 * Lock en memoria por nombre para serializar operaciones concurrentes de Auth
 * dentro de la misma pestaña o WebView.
 */
const inMemoryAuthLock = async <R>(
  name: string,
  fn: () => Promise<R>
): Promise<R> => {
  const prev = authLocks.get(name) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const chained = prev.then(() => current, () => current);
  authLocks.set(name, chained);
  await prev.catch(() => {});
  try {
    return await fn();
  } finally {
    release();
    if (authLocks.get(name) === chained) {
      authLocks.delete(name);
    }
  }
};

/**
 * Lock híbrido multi-pestaña: usa navigator.locks con timeout seguro para coordinar
 * refresh_token entre pestañas del mismo navegador y evitar revocaciones por doble uso,
 * con fallback a inMemoryAuthLock en entornos sin LockManager o si el navegador lo bloquea.
 */
const crossTabAuthLock = async <R>(
  name: string,
  acquireTimeout: number,
  fn: () => Promise<R>
): Promise<R> => {
  return inMemoryAuthLock(name, async () => {
    if (typeof navigator === 'undefined' || !navigator.locks?.request) {
      return fn();
    }

    const timeoutMs =
      typeof acquireTimeout === 'number' && acquireTimeout > 0
        ? Math.min(acquireTimeout, 5000)
        : 5000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await navigator.locks.request(
        `matum-auth:${name}`,
        { signal: controller.signal },
        async () => {
          clearTimeout(timer);
          return fn();
        }
      );
    } catch (err: any) {
      clearTimeout(timer);
      if (err?.name === 'AbortError' || err?.name === 'NotSupportedError' || err?.name === 'SecurityError') {
        return fn();
      }
      throw err;
    }
  });
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    lock: crossTabAuthLock,
  },
  global: {
    fetch: customFetch,
  },
});
