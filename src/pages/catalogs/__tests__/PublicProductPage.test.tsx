import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { PublicProductPage } from '../PublicProductPage';
import { supabase } from '../../../lib/supabase';
import * as offlineCache from '../../../lib/offlineCache';
import * as shareLib from '../../../lib/share';
import { clearShortLinkCache } from '../../../lib/shortLinks';

const { mockUseAuthStore } = vi.hoisted(() => ({
  mockUseAuthStore: vi.fn(() => ({
    user: { id: 'owner-1', phone: '5355555555' } as any,
  })),
}));

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('../../../store/authStore', () => ({
  useAuthStore: () => mockUseAuthStore(),
}));

vi.mock('../../../hooks/useCommissions', () => ({
  useCommissions: () => ({
    registerPendingCommission: vi.fn(),
    checkAffiliateStatus: vi.fn(),
    myAffiliation: null,
  }),
}));

vi.mock('../../../hooks/useStoreTheme', () => ({
  useStoreTheme: () => ({
    themeStyles: {},
    titleColor: undefined,
  }),
}));

vi.mock('../../../lib/analytics', () => ({
  recordStoreView: vi.fn(),
}));

vi.mock('../../../lib/share', () => ({
  shareContent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../lib/offlineCache', () => ({
  getCatalogFromCache: vi.fn(),
  saveCatalogToCache: vi.fn(),
  getCatalogProductsFromCache: vi.fn(),
  upsertCatalogProductsInCache: vi.fn(),
  isOffline: vi.fn(),
  isNetworkError: vi.fn(),
}));

describe('PublicProductPage - enlaces y etiquetas al compartir en APK nativa', () => {
  const originalLocation = window.location;
  const originalClipboard = navigator.clipboard;

  const mockSupabaseForTemplate = (shareTemplate: string | null) => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'system_settings') {
        return {
          select: vi.fn().mockResolvedValue({
            data: [{ key: 'app_url', value: 'nazaar.shop' }],
            error: null,
          }),
        } as any;
      }
      if (table === 'catalogs') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: 'cat-1',
                  slug: 'mi-tienda',
                  name: 'Mi Tienda',
                  user_id: 'owner-1',
                  is_active: true,
                  is_public: true,
                  is_blocked: false,
                  enable_affiliates: true,
                  share_template: shareTemplate,
                },
                error: null,
              }),
            }),
          }),
        } as any;
      }
      if (table === 'products') {
        return {
          select: vi.fn().mockImplementation((cols: string) => {
            if (cols.includes('position')) {
              return {
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    neq: vi.fn().mockReturnValue({
                      order: vi.fn().mockReturnValue({
                        order: vi.fn().mockReturnValue({
                          limit: vi.fn().mockResolvedValue({
                            data: [
                              {
                                id: 'p2',
                                catalog_id: 'cat-1',
                                name: 'Gorra Negra',
                                price: 900,
                                currency: 'CUP',
                                is_active: true,
                                is_out_of_stock: false,
                                stock_status: 'available',
                              },
                            ],
                            error: null,
                          }),
                        }),
                      }),
                    }),
                  }),
                }),
              };
            }
            return {
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: 'p1',
                      catalog_id: 'cat-1',
                      name: 'Zapatilla Pro',
                      description: 'Cómoda',
                      price: 2500,
                      currency: 'CUP',
                      commission_amount: 200,
                      commission_currency: 'CUP',
                      is_active: true,
                      is_out_of_stock: false,
                      stock_status: 'available',
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }),
        } as any;
      }
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { phone: '5355555555', plan: 'free' },
                error: null,
              }),
            }),
          }),
        } as any;
      }
      return {} as any;
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    clearShortLinkCache();
    mockUseAuthStore.mockReturnValue({
      user: { id: 'owner-1', phone: '5355555555' },
    });
    delete (supabase as any).rpc;
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    delete (window as any).location;
    (window as any).location = {
      protocol: 'https:',
      hostname: 'localhost',
      host: 'localhost',
      origin: 'https://localhost',
      pathname: '/mi-tienda/p/p1',
      search: '',
      hash: '',
      href: 'https://localhost/mi-tienda/p/p1',
    };

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    vi.mocked(offlineCache.isOffline).mockReturnValue(false);
    vi.mocked(offlineCache.isNetworkError).mockReturnValue(false);
    vi.mocked(offlineCache.getCatalogFromCache).mockResolvedValue(null);
    vi.mocked(offlineCache.getCatalogProductsFromCache).mockResolvedValue([]);
    vi.mocked(offlineCache.saveCatalogToCache).mockResolvedValue(undefined);
    vi.mocked(offlineCache.upsertCatalogProductsInCache).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: originalClipboard,
    });
  });

  it('con {product_url} inserta el enlace en text sin pasarlo separado en url, y Copiar mi enlace copia el link público', async () => {
    mockSupabaseForTemplate('*{product_name}* · {product_price}\n🔗 {product_url}');

    render(
      <MemoryRouter initialEntries={['/mi-tienda/p/p1']}>
        <Routes>
          <Route path="/:slug/p/:productId" element={<PublicProductPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Zapatilla Pro' })).toBeInTheDocument();
    });

    // 1. Compartir producto principal
    fireEvent.click(screen.getByRole('button', { name: 'Compartir producto' }));
    await waitFor(() => {
      expect(shareLib.shareContent).toHaveBeenCalledTimes(1);
    });
    const mainShareCall = vi.mocked(shareLib.shareContent).mock.calls[0][0];
    expect(mainShareCall.url).toBeUndefined();
    expect(mainShareCall.text).toContain('https://nazaar.shop/mi-tienda/p/p1');
    expect(mainShareCall.text).not.toContain('localhost');

    // 2. Copiar mi enlace explícito
    fireEvent.click(screen.getByRole('button', { name: /Copiar mi enlace/i }));
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'https://nazaar.shop/mi-tienda/p/p1'
      );
    });

    // 3. Compartir producto relacionado (usa la plantilla del catálogo)
    fireEvent.click(screen.getByRole('button', { name: 'Compartir Gorra Negra' }));
    await waitFor(() => {
      expect(shareLib.shareContent).toHaveBeenCalledTimes(2);
    });
    const relShareCall = vi.mocked(shareLib.shareContent).mock.calls[1][0];
    expect(relShareCall.url).toBeUndefined();
    expect(relShareCall.text).toContain('https://nazaar.shop/mi-tienda/p/p2');
    expect(relShareCall.text).not.toContain('localhost');
  });

  it('sin etiquetas de enlace en share_template no incluye ninguna URL al compartir producto ni relacionado', async () => {
    mockSupabaseForTemplate('*{product_name}* · {product_price}');

    render(
      <MemoryRouter initialEntries={['/mi-tienda/p/p1']}>
        <Routes>
          <Route path="/:slug/p/:productId" element={<PublicProductPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Zapatilla Pro' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Compartir producto' }));
    await waitFor(() => {
      expect(shareLib.shareContent).toHaveBeenCalledTimes(1);
    });
    const mainCall = vi.mocked(shareLib.shareContent).mock.calls[0][0];
    expect(mainCall.url).toBeUndefined();
    expect(mainCall.text).toMatch(/^\*Zapatilla Pro\* · 2[.,]?500 CUP$/);
    expect(mainCall.text).not.toContain('nazaar.shop');

    fireEvent.click(screen.getByRole('button', { name: 'Compartir Gorra Negra' }));
    await waitFor(() => {
      expect(shareLib.shareContent).toHaveBeenCalledTimes(2);
    });
    const relCall = vi.mocked(shareLib.shareContent).mock.calls[1][0];
    expect(relCall.url).toBeUndefined();
    expect(relCall.text).toBe('*Gorra Negra* · 900 CUP');
    expect(relCall.text).not.toContain('nazaar.shop');
  });

  it('usa enlace corto /s/k7X9m2 con referido oculto en Compartir producto y Copiar mi enlace', async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data: 'k7X9m2', error: null });
    (supabase as any).rpc = mockRpc;
    mockUseAuthStore.mockReturnValue({
      user: { id: 'owner-1', phone: '5355555555', referral_code: 'ref_prod99' },
    });

    mockSupabaseForTemplate('*{product_name}* · {product_price}\n🔗 {product_url}');

    const { unmount } = render(
      <MemoryRouter initialEntries={['/mi-tienda/p/p1']}>
        <Routes>
          <Route path="/:slug/p/:productId" element={<PublicProductPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Zapatilla Pro' })).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('get_or_create_short_link', {
        p_catalog_id: 'cat-1',
        p_product_id: 'p1',
        p_referral_code: 'ref_prod99',
      });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Compartir producto' }));
    await waitFor(() => {
      expect(shareLib.shareContent).toHaveBeenCalledTimes(1);
    });
    const sharedText = vi.mocked(shareLib.shareContent).mock.calls[0][0].text;
    expect(sharedText).toContain('https://nazaar.shop/s/k7X9m2');
    expect(sharedText).not.toContain('?ref=');

    fireEvent.click(screen.getByRole('button', { name: /Copiar mi enlace/i }));
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://nazaar.shop/s/k7X9m2');
    });

    // Al compartir un producto relacionado cuando la plantilla NO usa {product_url}, no debe invocar RPC para ese producto
    unmount();
    vi.clearAllMocks();
    clearShortLinkCache();
    mockSupabaseForTemplate('*{product_name}* · {product_price}');

    render(
      <MemoryRouter initialEntries={['/mi-tienda/p/p1']}>
        <Routes>
          <Route path="/:slug/p/:productId" element={<PublicProductPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Zapatilla Pro' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Compartir Gorra Negra' }));
    await waitFor(() => {
      expect(shareLib.shareContent).toHaveBeenCalledTimes(1);
    });
    expect(mockRpc).not.toHaveBeenCalledWith('get_or_create_short_link', expect.objectContaining({
      p_product_id: 'p2',
    }));
  });
});
