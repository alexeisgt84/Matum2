import { supabase } from './supabase';

const DB_NAME = 'matum_offline_db';
const DB_VERSION = 1;
export const IMAGE_CACHE_NAME = 'matum-images-v1';

// Estado reactivo de conectividad real (por si Android reporta navigator.onLine = true sin acceso real a internet)
let networkUnreachableUntil = 0;
let recoveryTimer: ReturnType<typeof setTimeout> | null = null;

export async function checkNetworkConnectivity(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false;
  }
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl) {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/health`, {
      method: 'GET',
      headers: supabaseAnonKey ? { apikey: supabaseAnonKey } : undefined,
      signal: controller.signal,
      cache: 'no-store',
    });
    const reachable = res.status > 0;
    if (reachable) {
      networkUnreachableUntil = 0;
      notifyNetworkStatus(true);
    }
    return reachable;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('matum:network-status', (e: Event) => {
    const custom = e as CustomEvent<{ online: boolean }>;
    if (custom.detail?.online) {
      networkUnreachableUntil = 0;
      if (recoveryTimer) {
        clearTimeout(recoveryTimer);
        recoveryTimer = null;
      }
    } else {
      networkUnreachableUntil = Date.now() + 6000;
      if (recoveryTimer) clearTimeout(recoveryTimer);
      recoveryTimer = setTimeout(() => {
        networkUnreachableUntil = 0;
        if (typeof navigator === 'undefined' || navigator.onLine !== false) {
          checkNetworkConnectivity();
        }
      }, 6000);
    }
  });
  window.addEventListener('online', () => {
    networkUnreachableUntil = 0;
    if (recoveryTimer) {
      clearTimeout(recoveryTimer);
      recoveryTimer = null;
    }
    notifyNetworkStatus(true);
  });
}

export function notifyNetworkStatus(reachable: boolean): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('matum:network-status', { detail: { online: reachable } }));
}

export function isOffline(): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return true;
  }
  if (networkUnreachableUntil > Date.now()) {
    return true;
  }
  return false;
}

export function isNetworkError(err: any): boolean {
  if (isOffline()) return true;
  const msg = String(err?.message || err || '').toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('load failed') ||
    msg.includes('fetch error') ||
    msg.includes('offline') ||
    msg.includes('aborted') ||
    msg.includes('timeout') ||
    err?.name === 'AbortError'
  );
}

// Fallback en memoria para entornos de test (JSDOM sin IndexedDB)
const memoryFallback = {
  catalogs: new Map<string, any>(),
  products: new Map<string, any[]>(),
  categories: new Map<string, any[]>(),
  kv: new Map<string, any>(),
};

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('catalogs')) {
          const catalogStore = db.createObjectStore('catalogs', { keyPath: 'id' });
          catalogStore.createIndex('slug', 'slug', { unique: false });
        }
        if (!db.objectStoreNames.contains('products')) {
          db.createObjectStore('products', { keyPath: 'catalogId' });
        }
        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'catalogId' });
        }
        if (!db.objectStoreNames.contains('kv')) {
          db.createObjectStore('kv', { keyPath: 'key' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.warn('[OfflineCache] No se pudo abrir IndexedDB, usando fallback en memoria');
        resolve(null);
      };
    } catch (e) {
      resolve(null);
    }
  });

  return dbPromise;
}

// ==========================================
// Caché de Imágenes (Cache Storage API)
// ==========================================
const cachedUrlsSession = new Set<string>();

export async function cacheImageUrls(urls: (string | null | undefined)[]): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window) || isOffline()) return;

  const validUrls = Array.from(
    new Set(
      urls.filter(
        (u): u is string =>
          typeof u === 'string' && u.startsWith('http') && !cachedUrlsSession.has(u)
      )
    )
  );

  if (validUrls.length === 0) return;

  try {
    const cache = await window.caches.open(IMAGE_CACHE_NAME);
    const BATCH_SIZE = 4;

    for (let i = 0; i < validUrls.length; i += BATCH_SIZE) {
      if (isOffline()) break;
      const batch = validUrls.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (url) => {
          try {
            cachedUrlsSession.add(url);
            const existing = await cache.match(url, { ignoreVary: true });
            if (existing) return;

            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 6000);
            try {
              const response = await fetch(url, {
                mode: 'cors',
                credentials: 'omit',
                signal: controller.signal,
              });
              if (response.ok) {
                await cache.put(url, response);
              }
            } finally {
              clearTimeout(timer);
            }
          } catch {
            // Ignorar fallos individuales de red o CORS en precarga
          }
        })
      );
    }
  } catch (e) {
    console.warn('[OfflineCache] Error guardando imágenes en caché:', e);
  }
}

export async function getCachedImageBlob(url: string): Promise<Blob | null> {
  if (typeof window === 'undefined' || !('caches' in window) || !url) return null;
  try {
    const cache = await window.caches.open(IMAGE_CACHE_NAME);
    let match = await cache.match(url, { ignoreVary: true });
    if (!match) {
      match = await cache.match(url.split('?')[0], { ignoreSearch: true });
    }
    if (match && match.ok) {
      return await match.blob();
    }
  } catch {
    // ignore
  }
  return null;
}

let imageFallbackInitialized = false;

export function setupOfflineImageFallback(): void {
  if (typeof window === 'undefined' || imageFallbackInitialized) return;
  imageFallbackInitialized = true;

  // Si el navegador reporta evento online, limpiar el bloqueo temporal de red
  window.addEventListener('online', () => {
    networkUnreachableUntil = 0;
  });

  // Registrar Service Worker si está disponible
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  // Listener global de respaldo por si una etiqueta <img> falla al cargar estando offline
  window.addEventListener(
    'error',
    async (event) => {
      const target = event.target as HTMLElement | null;
      if (!target || target.tagName !== 'IMG') return;
      const img = target as HTMLImageElement;
      const originalSrc = img.currentSrc || img.src;
      if (!originalSrc || originalSrc.startsWith('blob:') || originalSrc.startsWith('data:')) return;
      if (img.dataset.offlineFallbackTried === 'true') return;

      img.dataset.offlineFallbackTried = 'true';
      const blob = await getCachedImageBlob(originalSrc);
      if (blob) {
        img.src = URL.createObjectURL(blob);
      }
    },
    true
  );
}

// ==========================================
// Operaciones de Catálogos en IndexedDB
// ==========================================
export async function saveCatalogToCache(
  catalog: any,
  vendorInfo?: { vendorPhone?: string; vendorName?: string; vendorPlan?: string }
): Promise<void> {
  if (!catalog || !catalog.id) return;
  const record = {
    ...catalog,
    ...(vendorInfo ? { _vendorInfo: vendorInfo } : {}),
    _cachedAt: Date.now(),
  };

  memoryFallback.catalogs.set(catalog.id, record);

  const db = await openDB();
  if (!db) return;

  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction('catalogs', 'readwrite');
      const store = tx.objectStore('catalogs');
      const getReq = store.get(catalog.id);
      getReq.onsuccess = () => {
        const existing = getReq.result;
        const merged = {
          ...(existing || {}),
          ...record,
          _vendorInfo: vendorInfo || existing?._vendorInfo,
        };
        store.put(merged);
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });

  cacheImageUrls([catalog.logo_url, catalog.cover_url]);
}

export async function getCatalogFromCache(idOrSlug: string): Promise<any | null> {
  if (!idOrSlug) return null;

  const db = await openDB();
  if (!db) {
    if (memoryFallback.catalogs.has(idOrSlug)) return memoryFallback.catalogs.get(idOrSlug);
    for (const cat of memoryFallback.catalogs.values()) {
      if (cat.slug === idOrSlug) return cat;
    }
    return null;
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction('catalogs', 'readonly');
      const store = tx.objectStore('catalogs');
      const byIdReq = store.get(idOrSlug);

      byIdReq.onsuccess = () => {
        if (byIdReq.result) {
          resolve(byIdReq.result);
          return;
        }
        try {
          const slugIndex = store.index('slug');
          const bySlugReq = slugIndex.get(idOrSlug);
          bySlugReq.onsuccess = () => {
            if (bySlugReq.result) {
              resolve(bySlugReq.result);
              return;
            }
            // Fallback: escanear todos los catálogos en caché por id o slug
            const allReq = store.getAll();
            allReq.onsuccess = () => {
              const list = allReq.result || [];
              const target = idOrSlug.toLowerCase();
              const matched = list.find(
                (c: any) =>
                  c?.id === idOrSlug ||
                  (typeof c?.slug === 'string' && c.slug.toLowerCase() === target)
              );
              resolve(matched || null);
            };
            allReq.onerror = () => resolve(null);
          };
          bySlugReq.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      };
      byIdReq.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

// ==========================================
// Operaciones de Productos por Catálogo
// ==========================================
export async function saveCatalogProductsToCache(
  catalogId: string,
  products: any[]
): Promise<void> {
  if (!catalogId || !Array.isArray(products)) return;
  memoryFallback.products.set(catalogId, products);

  const db = await openDB();
  if (db) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction('products', 'readwrite');
        tx.objectStore('products').put({
          catalogId,
          products,
          updatedAt: Date.now(),
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  cacheImageUrls(products.map((p) => p?.imagen_url));
}

export async function upsertCatalogProductsInCache(
  catalogId: string,
  partialProducts: any[]
): Promise<void> {
  if (!catalogId || !Array.isArray(partialProducts) || partialProducts.length === 0) return;
  const existing = await getCatalogProductsFromCache(catalogId);
  if (!existing || existing.length === 0) {
    await saveCatalogProductsToCache(catalogId, partialProducts);
    return;
  }

  const map = new Map<string, any>();
  existing.forEach((p) => map.set(p.id, p));
  partialProducts.forEach((p) => map.set(p.id, { ...(map.get(p.id) || {}), ...p }));
  await saveCatalogProductsToCache(catalogId, Array.from(map.values()));
}

export async function getCatalogProductsFromCache(catalogId: string): Promise<any[] | null> {
  if (!catalogId) return null;

  const db = await openDB();
  if (!db) {
    return memoryFallback.products.get(catalogId) || null;
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction('products', 'readonly');
      const req = tx.objectStore('products').get(catalogId);
      req.onsuccess = () => resolve(req.result?.products || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

// ==========================================
// Operaciones de Categorías por Catálogo
// ==========================================
export async function saveCatalogCategoriesToCache(
  catalogId: string,
  categories: any[]
): Promise<void> {
  if (!catalogId || !Array.isArray(categories)) return;
  memoryFallback.categories.set(catalogId, categories);

  const db = await openDB();
  if (!db) return;

  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction('categories', 'readwrite');
      tx.objectStore('categories').put({
        catalogId,
        categories,
        updatedAt: Date.now(),
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function getCatalogCategoriesFromCache(catalogId: string): Promise<any[] | null> {
  if (!catalogId) return null;

  const db = await openDB();
  if (!db) {
    return memoryFallback.categories.get(catalogId) || null;
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction('categories', 'readonly');
      const req = tx.objectStore('categories').get(catalogId);
      req.onsuccess = () => resolve(req.result?.categories || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

// ==========================================
// Almacenamiento Clave-Valor para Listas
// ==========================================
export async function saveCachedList<T>(key: string, value: T): Promise<void> {
  if (!key) return;
  memoryFallback.kv.set(key, value);

  const db = await openDB();
  if (!db) return;

  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction('kv', 'readwrite');
      tx.objectStore('kv').put({ key, value, updatedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function getCachedList<T>(key: string): Promise<T | null> {
  if (!key) return null;

  const db = await openDB();
  if (!db) {
    return (memoryFallback.kv.get(key) as T) ?? null;
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction('kv', 'readonly');
      const req = tx.objectStore('kv').get(key);
      req.onsuccess = () => resolve((req.result?.value as T) ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

// ==========================================
// Sincronización Automática Completa de un Catálogo
// ==========================================
const syncingCatalogs = new Set<string>();
const syncedCatalogsSession = new Set<string>();
const syncQueue: string[] = [];
let isProcessingSyncQueue = false;

async function processSyncQueue(): Promise<void> {
  if (isProcessingSyncQueue) return;
  isProcessingSyncQueue = true;

  // Dar prioridad a las consultas principales de la interfaz antes de sincronizar en segundo plano
  await new Promise((r) => setTimeout(r, 800));

  while (syncQueue.length > 0) {
    if (isOffline()) {
      syncQueue.length = 0;
      break;
    }

    const catalogId = syncQueue.shift();
    if (!catalogId || syncedCatalogsSession.has(catalogId)) continue;

    syncingCatalogs.add(catalogId);
    try {
      const [prodRes, catRes] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .eq('catalog_id', catalogId)
          .order('is_out_of_stock', { ascending: true })
          .order('position', { ascending: true }),
        supabase
          .from('categories')
          .select('*')
          .eq('catalog_id', catalogId)
          .order('display_order', { ascending: true }),
      ]);

      if (!prodRes.error && prodRes.data) {
        await saveCatalogProductsToCache(catalogId, prodRes.data);
      }
      if (!catRes.error && catRes.data) {
        await saveCatalogCategoriesToCache(catalogId, catRes.data);
      }
      if (!prodRes.error && !catRes.error) {
        syncedCatalogsSession.add(catalogId);
      }
    } catch {
      // Silencioso en segundo plano
    } finally {
      syncingCatalogs.delete(catalogId);
    }
  }

  isProcessingSyncQueue = false;
}

export async function syncCatalogForOffline(catalogId: string, force: boolean = false): Promise<void> {
  if (
    !catalogId ||
    isOffline() ||
    syncingCatalogs.has(catalogId) ||
    (!force && syncedCatalogsSession.has(catalogId)) ||
    syncQueue.includes(catalogId)
  ) {
    return;
  }
  syncQueue.push(catalogId);
  void processSyncQueue();
}
