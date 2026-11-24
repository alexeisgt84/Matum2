import { describe, it, expect, beforeEach, vi } from 'vitest';
import { supabase } from '../supabase';
import * as offlineCache from '../offlineCache';
import {
  buildLongProductUrl,
  buildShortUrl,
  clearShortLinkCache,
  getCachedShortUrl,
  getOrCreateShortLink,
} from '../shortLinks';

vi.mock('../supabase', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

vi.mock('../offlineCache', () => ({
  isOffline: vi.fn().mockReturnValue(false),
}));

describe('shortLinks', () => {
  const baseParams = {
    baseUrl: 'https://nazaar.shop',
    catalogId: 'cat-1',
    productId: 'prod-1',
    fallbackUrl: 'https://nazaar.shop/mi-tienda/p/prod-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    clearShortLinkCache();
    vi.mocked(offlineCache.isOffline).mockReturnValue(false);
    (supabase as any).rpc = vi.fn();
  });

  it('devuelve https://nazaar.shop/s/<code> cuando supabase.rpc responde correctamente', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: 'k7X9m2', error: null } as any);

    const url = await getOrCreateShortLink(baseParams);

    expect(url).toBe('https://nazaar.shop/s/k7X9m2');
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
    expect(supabase.rpc).toHaveBeenCalledWith('get_or_create_short_link', {
      p_catalog_id: 'cat-1',
      p_product_id: 'prod-1',
      p_referral_code: null,
    });
  });

  it('reutiliza la caché en memoria y localStorage sin volver a invocar supabase.rpc', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: 'aBc123', error: null } as any);

    const first = await getOrCreateShortLink(baseParams);
    const second = await getOrCreateShortLink(baseParams);
    const cachedSync = getCachedShortUrl(baseParams);

    expect(first).toBe('https://nazaar.shop/s/aBc123');
    expect(second).toBe('https://nazaar.shop/s/aBc123');
    expect(cachedSync).toBe('https://nazaar.shop/s/aBc123');
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('matum_short_links_v1')).toContain('aBc123');
  });

  it('deduplica llamadas concurrentes para el mismo destino', async () => {
    let resolveRpc!: (value: any) => void;
    const rpcPromise = new Promise((resolve) => {
      resolveRpc = resolve;
    });
    vi.mocked(supabase.rpc).mockReturnValue(rpcPromise as any);

    const p1 = getOrCreateShortLink(baseParams);
    const p2 = getOrCreateShortLink(baseParams);
    resolveRpc({ data: 'Z9y8X7', error: null });

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBe('https://nazaar.shop/s/Z9y8X7');
    expect(r2).toBe('https://nazaar.shop/s/Z9y8X7');
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
  });

  it('envía p_referral_code al RPC y distingue en caché con referido vs sin referido', async () => {
    vi.mocked(supabase.rpc)
      .mockResolvedValueOnce({ data: 'noRef1', error: null } as any)
      .mockResolvedValueOnce({ data: 'withR2', error: null } as any);

    const withoutRef = await getOrCreateShortLink(baseParams);
    const withRef = await getOrCreateShortLink({
      ...baseParams,
      referralCode: 'ref_vip99',
      fallbackUrl: 'https://nazaar.shop/mi-tienda/p/prod-1?ref=ref_vip99',
    });

    expect(withoutRef).toBe('https://nazaar.shop/s/noRef1');
    expect(withRef).toBe('https://nazaar.shop/s/withR2');
    expect(supabase.rpc).toHaveBeenNthCalledWith(2, 'get_or_create_short_link', {
      p_catalog_id: 'cat-1',
      p_product_id: 'prod-1',
      p_referral_code: 'ref_vip99',
    });
  });

  it('hace fallback al enlace largo cuando está offline, cuando rpc falla o cuando supabase.rpc no existe', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // 1. Offline
    vi.mocked(offlineCache.isOffline).mockReturnValue(true);
    expect(await getOrCreateShortLink(baseParams)).toBe(baseParams.fallbackUrl);
    expect(supabase.rpc).not.toHaveBeenCalled();

    // 2. Error del RPC
    vi.mocked(offlineCache.isOffline).mockReturnValue(false);
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: null,
      error: { message: 'db error' },
    } as any);
    expect(await getOrCreateShortLink(baseParams)).toBe(baseParams.fallbackUrl);

    // 3. supabase.rpc inexistente
    delete (supabase as any).rpc;
    expect(await getOrCreateShortLink(baseParams)).toBe(baseParams.fallbackUrl);

    warnSpy.mockRestore();
  });

  it('construye correctamente URLs cortas y largas auxiliares', () => {
    expect(buildShortUrl('https://nazaar.shop/', 'k7X9m2')).toBe('https://nazaar.shop/s/k7X9m2');
    expect(
      buildLongProductUrl({
        baseUrl: 'https://nazaar.shop/',
        catalogSlug: 'mi-tienda',
        productId: 'p1',
        referralCode: 'ref_abc',
      })
    ).toBe('https://nazaar.shop/mi-tienda/p/p1?ref=ref_abc');
  });
});
