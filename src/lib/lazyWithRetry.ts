import React from 'react';

export const CHUNK_RELOAD_STORAGE_KEY = 'nazaar:chunk-reload-at';
export const CHUNK_RELOAD_COOLDOWN_MS = 15_000;

const STATIC_CACHE_PREFIXES = ['matum-static-', 'nazaar-static-'];

const CHUNK_ERROR_PATTERNS = [
  'failed to fetch dynamically imported module',
  'importing a module script failed',
  'error loading dynamically imported module',
  'unable to preload css',
  'failed to load module script',
  'loading chunk',
  'loading css chunk',
];

let isChunkReloadScheduled = false;

/**
 * Determina si un error corresponde a un fallo al cargar un chunk JS/CSS dinámico
 * (por ejemplo, tras un despliegue con nuevos hashes o fallo de red al navegar).
 */
export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;

  if (typeof error === 'object' && error !== null && 'name' in error) {
    if ((error as { name?: unknown }).name === 'ChunkLoadError') {
      return true;
    }
  }

  let message = '';
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  } else if (typeof error === 'object' && error !== null && 'message' in error) {
    const rawMessage = (error as { message?: unknown }).message;
    if (typeof rawMessage === 'string') {
      message = rawMessage;
    }
  }

  const normalized = message.toLowerCase();
  return CHUNK_ERROR_PATTERNS.some((pattern) => normalized.includes(pattern));
}

/**
 * Elimina únicamente los cachés de assets estáticos obsoletos y solicita
 * actualización del Service Worker sin tocar imágenes ni datos offline en IndexedDB.
 */
export async function clearStaleStaticCaches(): Promise<void> {
  try {
    if (typeof window !== 'undefined' && 'caches' in window && window.caches) {
      const cacheKeys = await window.caches.keys();
      const staticKeys = cacheKeys.filter((key) =>
        STATIC_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix))
      );
      await Promise.all(staticKeys.map((key) => window.caches.delete(key).catch(() => false)));
    }

    if (
      typeof navigator !== 'undefined' &&
      'serviceWorker' in navigator &&
      navigator.serviceWorker?.getRegistrations
    ) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.update().catch(() => undefined)));
    }
  } catch {
    // Nunca propagar errores durante la limpieza de caché de recuperación
  }
}

/**
 * Intenta una recarga completa de la página con protección anti-bucle por cooldown.
 * Retorna true si se programó o ya estaba programada una recarga; false si se omitió.
 */
export function attemptChunkReload(reloadFn?: () => void): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
  if (isChunkReloadScheduled) return true;

  try {
    const now = Date.now();
    const lastReloadRaw = window.sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY);
    if (lastReloadRaw) {
      const lastReloadAt = Number(lastReloadRaw);
      const elapsed = now - lastReloadAt;
      if (Number.isFinite(lastReloadAt) && elapsed >= 0 && elapsed < CHUNK_RELOAD_COOLDOWN_MS) {
        return false;
      }
    }
    window.sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, String(now));
  } catch {
    return false;
  }

  isChunkReloadScheduled = true;
  const triggerReload = reloadFn ?? (() => window.location.reload());

  const hasCacheOrSw =
    'caches' in window ||
    (typeof navigator !== 'undefined' && 'serviceWorker' in navigator);

  if (hasCacheOrSw) {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const delayPromise = new Promise<void>((resolve) => {
      timeoutId = setTimeout(resolve, 400);
    });
    void Promise.race([
      clearStaleStaticCaches().finally(() => {
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId);
        }
      }),
      delayPromise,
    ]).finally(() => {
      triggerReload();
    });
  } else {
    triggerReload();
  }

  return true;
}

/**
 * Escucha el evento `vite:preloadError` sin llamar a `event.preventDefault()` para que
 * Vite siga rechazando la promesa y `lazyWithRetry` mantenga el Suspense visible durante la recarga.
 */
export function registerChunkPreloadErrorHandler(reloadFn?: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handler = (event: Event) => {
    const payload = (event as Event & { payload?: unknown }).payload;
    if (!payload || isChunkLoadError(payload)) {
      attemptChunkReload(reloadFn);
    }
  };

  window.addEventListener('vite:preloadError', handler);
  return () => window.removeEventListener('vite:preloadError', handler);
}

/**
 * Envuelve `React.lazy` para recargar automáticamente una sola vez ante fallos de chunk
 * manteniendo el fallback de Suspense mientras se completa la recarga.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithRetry<T extends React.ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
  reloadFn?: () => void
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    try {
      return await importer();
    } catch (error) {
      if (isChunkReloadScheduled) {
        return new Promise<never>(() => {});
      }
      if (isChunkLoadError(error) && attemptChunkReload(reloadFn)) {
        return new Promise<never>(() => {});
      }
      throw error;
    }
  });
}

/**
 * Reinicia el estado interno de recarga en memoria (uso exclusivo en pruebas unitarias).
 */
export function resetChunkReloadStateForTests(): void {
  isChunkReloadScheduled = false;
}
