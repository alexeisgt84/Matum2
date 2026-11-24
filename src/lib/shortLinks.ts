import { supabase } from './supabase';
import { isOffline } from './offlineCache';

export const SHORT_CODE_RE = /^[A-Za-z0-9]{4,16}$/;
const STORAGE_KEY = 'matum_short_links_v1';
const MAX_CACHE_ENTRIES = 200;
const RPC_TIMEOUT_MS = 2500;

const memoryCache = new Map<string, string>();
const inFlightRequests = new Map<string, Promise<string | null>>();

export interface ShortLinkTarget {
  catalogId?: string | null;
  productId?: string | null;
  referralCode?: string | null;
}

export interface ShortLinkLookupParams extends ShortLinkTarget {
  baseUrl: string;
}

export interface GetOrCreateShortLinkParams extends ShortLinkLookupParams {
  fallbackUrl: string;
}

export interface LongProductUrlParams {
  baseUrl: string;
  catalogSlug?: string | null;
  productId?: string | null;
  referralCode?: string | null;
}

function normalizeReferralCode(referralCode?: string | null): string {
  return (referralCode || '').trim();
}

function buildCacheKey(catalogId: string, productId?: string | null, referralCode?: string | null): string {
  return `${catalogId}::${productId || ''}::${normalizeReferralCode(referralCode)}`;
}

function readPersistedCache(): Record<string, string> {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
  } catch {
    // Ignorar errores de almacenamiento (modo privado / JSON corrupto)
  }
  return {};
}

function writePersistedCache(entries: Map<string, string>): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const obj: Record<string, string> = {};
    for (const [k, v] of entries.entries()) {
      obj[k] = v;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch {
    // Ignorar errores de cuota o modo privado
  }
}

function hydrateMemoryFromStorage(): void {
  const persisted = readPersistedCache();
  for (const [key, code] of Object.entries(persisted)) {
    if (typeof code === 'string' && SHORT_CODE_RE.test(code) && !memoryCache.has(key)) {
      memoryCache.set(key, code);
    }
  }
}

function setCachedShortCode(key: string, code: string): void {
  if (memoryCache.has(key)) {
    memoryCache.delete(key);
  }
  memoryCache.set(key, code);

  while (memoryCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = memoryCache.keys().next().value;
    if (!oldestKey) break;
    memoryCache.delete(oldestKey);
  }

  writePersistedCache(memoryCache);
}

export function buildShortUrl(baseUrl: string, code: string): string {
  const cleanBase = (baseUrl || '').replace(/\/+$/, '');
  return `${cleanBase}/s/${code}`;
}

export function buildLongProductUrl({
  baseUrl,
  catalogSlug,
  productId,
  referralCode,
}: LongProductUrlParams): string {
  if (!catalogSlug || !productId) return '';
  const cleanBase = (baseUrl || '').replace(/\/+$/, '');
  const cleanRef = normalizeReferralCode(referralCode);
  const affiliateParam = cleanRef ? `?ref=${encodeURIComponent(cleanRef)}` : '';
  return `${cleanBase}/${catalogSlug}/p/${productId}${affiliateParam}`;
}

export function getCachedShortCode({
  catalogId,
  productId,
  referralCode,
}: ShortLinkTarget): string | null {
  if (!catalogId) return null;
  const key = buildCacheKey(catalogId, productId, referralCode);

  const inMem = memoryCache.get(key);
  if (inMem && SHORT_CODE_RE.test(inMem)) {
    return inMem;
  }

  hydrateMemoryFromStorage();
  const afterHydrate = memoryCache.get(key);
  if (afterHydrate && SHORT_CODE_RE.test(afterHydrate)) {
    return afterHydrate;
  }

  return null;
}

export function getCachedShortUrl({
  baseUrl,
  catalogId,
  productId,
  referralCode,
}: ShortLinkLookupParams): string | null {
  if (!baseUrl) return null;
  const code = getCachedShortCode({ catalogId, productId, referralCode });
  return code ? buildShortUrl(baseUrl, code) : null;
}

export async function getOrCreateShortLink({
  baseUrl,
  catalogId,
  productId,
  referralCode,
  fallbackUrl,
}: GetOrCreateShortLinkParams): Promise<string> {
  if (!catalogId) {
    return fallbackUrl;
  }

  const cachedCode = getCachedShortCode({ catalogId, productId, referralCode });
  if (cachedCode) {
    return buildShortUrl(baseUrl, cachedCode);
  }

  if (isOffline() || typeof (supabase as { rpc?: unknown })?.rpc !== 'function') {
    return fallbackUrl;
  }

  const cleanRef = normalizeReferralCode(referralCode);
  const cacheKey = buildCacheKey(catalogId, productId, cleanRef);

  let pending = inFlightRequests.get(cacheKey);
  if (!pending) {
    pending = (async () => {
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      try {
        const rpcPromise = Promise.resolve(
          supabase.rpc('get_or_create_short_link', {
            p_catalog_id: catalogId,
            p_product_id: productId || null,
            p_referral_code: cleanRef || null,
          })
        );

        const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) => {
          timeoutId = setTimeout(() => {
            resolve({ data: null, error: new Error('Timeout generating short link') });
          }, RPC_TIMEOUT_MS);
        });

        const { data, error } = await Promise.race([rpcPromise, timeoutPromise]);
        if (error) {
          console.warn('Error creating short link:', error);
          return null;
        }

        const code = typeof data === 'string' ? data.trim() : '';
        if (!SHORT_CODE_RE.test(code)) {
          return null;
        }

        setCachedShortCode(cacheKey, code);
        return code;
      } catch (err) {
        console.warn('Unexpected error creating short link:', err);
        return null;
      } finally {
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId);
        }
        inFlightRequests.delete(cacheKey);
      }
    })();

    inFlightRequests.set(cacheKey, pending);
  }

  const resolvedCode = await pending;
  return resolvedCode ? buildShortUrl(baseUrl, resolvedCode) : fallbackUrl;
}

export function clearShortLinkCache(): void {
  memoryCache.clear();
  inFlightRequests.clear();
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignorar errores de almacenamiento
    }
  }
}
