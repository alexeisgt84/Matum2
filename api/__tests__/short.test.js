import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import handler from '../short.js';

function createMockRes() {
  const headers = {};
  const res = {
    statusCode: 200,
    body: undefined,
    ended: false,
    headers,
    setHeader(name, value) {
      headers[String(name).toLowerCase()] = value;
    },
    status(code) {
      res.statusCode = code;
      return res;
    },
    send(payload) {
      res.body = payload;
      res.ended = true;
      return res;
    },
    end() {
      res.ended = true;
      return res;
    },
  };
  return res;
}

describe('api/short.js handler', () => {
  const originalFetch = globalThis.fetch;
  const originalEnvUrl = process.env.VITE_SUPABASE_URL;
  const originalEnvAnon = process.env.VITE_SUPABASE_ANON_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
    process.env.VITE_SUPABASE_ANON_KEY = 'anon-key';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.VITE_SUPABASE_URL = originalEnvUrl;
    process.env.VITE_SUPABASE_ANON_KEY = originalEnvAnon;
  });

  it('redirige (302) a humanos conservando ?ref= e incrementando clics sin cachear', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue([
        {
          code: 'k7X9m2',
          catalog_id: 'cat-1',
          catalog_slug: 'mi-tienda',
          catalog_is_active: true,
          catalog_is_public: true,
          catalog_is_blocked: false,
          product_id: 'p1',
          product_is_active: true,
          referral_code: 'ref_123',
        },
      ]),
    });

    const req = {
      query: { code: 'k7X9m2' },
      headers: {
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        host: 'nazaar.shop',
        'x-forwarded-proto': 'https',
      },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://example.supabase.co/rest/v1/rpc/resolve_short_link',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ p_code: 'k7X9m2', p_increment_click: true }),
      })
    );
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/mi-tienda/p/p1?ref=ref_123');
    expect(res.headers['cache-control']).toBe('no-store, no-cache, must-revalidate');
  });

  it('devuelve HTML Open Graph a bots sin incrementar clics y con og:url apuntando a /s/<code>', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue([
        {
          code: 'k7X9m2',
          catalog_id: 'cat-1',
          catalog_slug: 'mi-tienda',
          catalog_name: 'Mi Tienda',
          catalog_logo_url: 'https://cdn.example.com/logo.png',
          catalog_is_active: true,
          catalog_is_public: true,
          catalog_is_blocked: false,
          product_id: 'p1',
          product_name: 'Zapatilla Pro',
          product_description: 'Muy cómoda',
          product_price: 2500,
          product_currency: 'CUP',
          product_imagen_url: 'https://cdn.example.com/shoe.jpg',
          product_is_active: true,
          referral_code: 'ref_123',
        },
      ]),
    });

    const req = {
      query: { code: 'k7X9m2', og: '1' },
      headers: {
        'user-agent': 'WhatsApp/2.23.20.0 A',
        host: 'nazaar.shop',
        'x-forwarded-proto': 'https',
      },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://example.supabase.co/rest/v1/rpc/resolve_short_link',
      expect.objectContaining({
        body: JSON.stringify({ p_code: 'k7X9m2', p_increment_click: false }),
      })
    );
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('text/html; charset=utf-8');
    expect(res.headers['cache-control']).toBe('public, s-maxage=300, stale-while-revalidate=600');
    expect(res.body).toContain('Zapatilla Pro');
    expect(res.body).toContain('https://cdn.example.com/shoe.jpg');
    expect(res.body).toContain('https://nazaar.shop/s/k7X9m2');
  });

  it('no filtra datos de un catálogo bloqueado o inactivo a bots (devuelve OG genérico de Nazaar)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue([
        {
          code: 'k7X9m2',
          catalog_id: 'cat-1',
          catalog_slug: 'mi-tienda',
          catalog_name: 'Tienda Bloqueada',
          catalog_is_active: true,
          catalog_is_public: true,
          catalog_is_blocked: true,
          product_id: 'p1',
          product_name: 'Producto Oculto',
          product_imagen_url: 'https://cdn.example.com/secret.jpg',
          product_is_active: true,
          referral_code: null,
        },
      ]),
    });

    const req = {
      query: { code: 'k7X9m2' },
      headers: {
        'user-agent': 'TelegramBot (like TwitterBot)',
        host: 'nazaar.shop',
        'x-forwarded-proto': 'https',
      },
    };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.headers['cache-control']).toBe('private, no-store');
    expect(res.body).toContain('Tienda en Nazaar');
    expect(res.body).not.toContain('Tienda Bloqueada');
    expect(res.body).not.toContain('Producto Oculto');
    expect(res.body).not.toContain('secret.jpg');
  });

  it('redirige a / si el código es inválido o no existe en la base de datos', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue([]),
    });

    const invalidReq = {
      query: { code: 'bad!' },
      headers: { 'user-agent': 'Mozilla/5.0', host: 'nazaar.shop' },
    };
    const invalidRes = createMockRes();
    await handler(invalidReq, invalidRes);
    expect(invalidRes.statusCode).toBe(302);
    expect(invalidRes.headers.location).toBe('/');
    expect(globalThis.fetch).not.toHaveBeenCalled();

    const missingReq = {
      query: { code: 'AbCd12' },
      headers: { 'user-agent': 'Mozilla/5.0', host: 'nazaar.shop' },
    };
    const missingRes = createMockRes();
    await handler(missingReq, missingRes);
    expect(missingRes.statusCode).toBe(302);
    expect(missingRes.headers.location).toBe('/');
  });
});
