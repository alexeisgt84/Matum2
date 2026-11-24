import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { PublicCatalogPage } from '../PublicCatalogPage';
import { supabase } from '../../../lib/supabase';
import * as offlineCache from '../../../lib/offlineCache';
import * as shareLib from '../../../lib/share';
import { clearShortLinkCache } from '../../../lib/shortLinks';

const { mockUseAuthStore } = vi.hoisted(() => ({
  mockUseAuthStore: vi.fn(() => ({ user: null as any })),
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
    applyForAffiliation: vi.fn(),
    myAffiliation: null,
    loading: false,
  }),
}));

vi.mock('../../../hooks/useStoreTheme', () => ({
  useStoreTheme: () => ({
    themeStyles: {},
    titleColor: undefined,
  }),
}));

vi.mock('../../../lib/analytics', () => ({
  trackCatalogEvent: vi.fn(),
  recordStoreView: vi.fn(),
}));

vi.mock('../../../lib/share', () => ({
  shareContent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../lib/offlineCache', () => ({
  getCatalogFromCache: vi.fn(),
  getCatalogProductsFromCache: vi.fn(),
  getCatalogCategoriesFromCache: vi.fn(),
  saveCatalogToCache: vi.fn(),
  saveCatalogProductsToCache: vi.fn(),
  saveCatalogCategoriesToCache: vi.fn(),
  isOffline: vi.fn(),
  isNetworkError: vi.fn(),
}));

describe('PublicCatalogPage - bloqueo e inactividad', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(offlineCache.isOffline).mockReturnValue(false);
    vi.mocked(offlineCache.isNetworkError).mockReturnValue(false);
    vi.mocked(offlineCache.getCatalogProductsFromCache).mockResolvedValue([
      { id: 'p1', name: 'Producto Secreto', price: 100, is_active: true },
    ]);
    vi.mocked(offlineCache.getCatalogCategoriesFromCache).mockResolvedValue([]);
    vi.mocked(offlineCache.saveCatalogToCache).mockResolvedValue(undefined);
  });

  it('no muestra el catálogo cacheado antes de verificar y muestra el estado de suspensión si el servidor indica is_blocked', async () => {
    vi.mocked(offlineCache.getCatalogFromCache).mockResolvedValue({
      id: 'cat-1',
      slug: 'mi-tienda',
      name: 'Mi Tienda Cacheada',
      is_active: true,
      is_public: true,
      is_blocked: false,
    });

    let resolveCatalogQuery!: (value: any) => void;
    const catalogPromise = new Promise(resolve => {
      resolveCatalogQuery = resolve;
    });

    const maybeSingle = vi.fn().mockReturnValue(catalogPromise);
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    vi.mocked(supabase.from).mockReturnValue({ select } as any);

    render(
      <MemoryRouter initialEntries={['/mi-tienda']}>
        <Routes>
          <Route path="/:slug" element={<PublicCatalogPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Mientras consulta al servidor, debe mostrar pantalla de carga y nunca el catálogo cacheado
    expect(screen.getByText(/Cargando tienda/i)).toBeInTheDocument();
    expect(screen.queryByText('Mi Tienda Cacheada')).not.toBeInTheDocument();
    expect(screen.queryByText('Producto Secreto')).not.toBeInTheDocument();

    // El servidor responde que el catálogo está bloqueado
    resolveCatalogQuery({
      data: {
        id: 'cat-1',
        slug: 'mi-tienda',
        name: 'Mi Tienda Cacheada',
        is_active: true,
        is_public: true,
        is_blocked: true,
        blocked_reason: 'Incumplimiento de normas',
      },
      error: null,
    });

    await waitFor(() => {
      expect(screen.getByText('Tienda no disponible')).toBeInTheDocument();
    });

    expect(screen.getByText(/Catálogo suspendido: Incumplimiento de normas/i)).toBeInTheDocument();
    expect(screen.queryByText('Mi Tienda Cacheada')).not.toBeInTheDocument();
    expect(screen.queryByText('Producto Secreto')).not.toBeInTheDocument();
    expect(offlineCache.saveCatalogToCache).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'cat-1', is_blocked: true })
    );
  });

  it('no muestra el catálogo en modo offline si el caché ya está marcado como bloqueado', async () => {
    vi.mocked(offlineCache.isOffline).mockReturnValue(true);
    vi.mocked(offlineCache.getCatalogFromCache).mockResolvedValue({
      id: 'cat-1',
      slug: 'mi-tienda',
      name: 'Mi Tienda Cacheada',
      is_active: true,
      is_public: true,
      is_blocked: true,
      blocked_reason: 'Suspendido por admin',
    });

    render(
      <MemoryRouter initialEntries={['/mi-tienda']}>
        <Routes>
          <Route path="/:slug" element={<PublicCatalogPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Tienda no disponible')).toBeInTheDocument();
    });

    expect(screen.getByText(/Catálogo suspendido: Suspendido por admin/i)).toBeInTheDocument();
    expect(screen.queryByText('Mi Tienda Cacheada')).not.toBeInTheDocument();
  });

  it('muestra la pantalla minimalista de inactividad con causa y cuenta regresiva cuando is_active es false y is_public es true', async () => {
    vi.mocked(offlineCache.getCatalogFromCache).mockResolvedValue(null);

    const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString();
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'cat-2',
        slug: 'tienda-pausada',
        name: 'Boutique Aurora',
        is_active: false,
        is_public: true,
        is_blocked: false,
        inactive_reason: 'Inventario general de temporada.',
        reopen_at: futureDate,
      },
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    vi.mocked(supabase.from).mockReturnValue({ select } as any);

    render(
      <MemoryRouter initialEntries={['/tienda-pausada']}>
        <Routes>
          <Route path="/:slug" element={<PublicCatalogPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Volvemos pronto')).toBeInTheDocument();
    });

    expect(screen.getByText('Boutique Aurora')).toBeInTheDocument();
    expect(screen.getByText('Inventario general de temporada.')).toBeInTheDocument();
    expect(screen.getByText('Días')).toBeInTheDocument();
    expect(screen.getByText('Horas')).toBeInTheDocument();
    expect(screen.getByText('Min')).toBeInTheDocument();
    expect(screen.getByText('Seg')).toBeInTheDocument();
  });

  it('oculta los detalles del catálogo si is_public es false (privado)', async () => {
    vi.mocked(offlineCache.getCatalogFromCache).mockResolvedValue(null);

    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'cat-3',
        slug: 'tienda-privada',
        name: 'Tienda Privada',
        is_active: false,
        is_public: false,
        is_blocked: false,
        inactive_reason: 'No debería verse',
      },
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    vi.mocked(supabase.from).mockReturnValue({ select } as any);

    render(
      <MemoryRouter initialEntries={['/tienda-privada']}>
        <Routes>
          <Route path="/:slug" element={<PublicCatalogPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Tienda no disponible')).toBeInTheDocument();
    });

    expect(screen.queryByText('Tienda Privada')).not.toBeInTheDocument();
    expect(screen.queryByText('No debería verse')).not.toBeInTheDocument();
  });
});

describe('PublicCatalogPage - enlaces al compartir en APK nativa', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    clearShortLinkCache();
    mockUseAuthStore.mockReturnValue({ user: null });
    delete (supabase as any).rpc;
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    delete (window as any).location;
    (window as any).location = {
      protocol: 'https:',
      hostname: 'localhost',
      host: 'localhost',
      origin: 'https://localhost',
      pathname: '/mi-tienda',
      search: '',
      hash: '',
      href: 'https://localhost/mi-tienda',
    };
    vi.mocked(offlineCache.isOffline).mockReturnValue(false);
    vi.mocked(offlineCache.isNetworkError).mockReturnValue(false);
    vi.mocked(offlineCache.getCatalogFromCache).mockResolvedValue(null);
    vi.mocked(offlineCache.getCatalogProductsFromCache).mockResolvedValue([]);
    vi.mocked(offlineCache.getCatalogCategoriesFromCache).mockResolvedValue([]);
    vi.mocked(offlineCache.saveCatalogToCache).mockResolvedValue(undefined);
    vi.mocked(offlineCache.saveCatalogProductsToCache).mockResolvedValue(undefined);
    vi.mocked(offlineCache.saveCatalogCategoriesToCache).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
  });

  it('respeta la plantilla al compartir producto en APK (solo incluye enlace con etiqueta) y comparte tienda con https://nazaar.shop', async () => {
    let shareTemplateValue: string | null = '*{product_name}*\n{product_price}\nVer: {product_url}';

    const setupSupabaseMock = (template: string | null) => {
      shareTemplateValue = template;
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
                    slogan: 'Lo mejor',
                    user_id: 'owner-1',
                    is_active: true,
                    is_public: true,
                    is_blocked: false,
                    share_template: shareTemplateValue,
                  },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        if (table === 'products') {
          const order2 = vi.fn().mockResolvedValue({
            data: [
              {
                id: 'p1',
                name: 'Zapatilla Pro',
                description: 'Cómoda',
                price: 2500,
                currency: 'CUP',
                is_active: true,
                is_out_of_stock: false,
                stock_status: 'available',
              },
            ],
            error: null,
          });
          const order1 = vi.fn().mockReturnValue({ order: order2 });
          const eqActive = vi.fn().mockReturnValue({ order: order1 });
          const eqCatalog = vi.fn().mockReturnValue({ eq: eqActive });
          return {
            select: vi.fn().mockReturnValue({ eq: eqCatalog }),
          } as any;
        }
        if (table === 'categories') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          } as any;
        }
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { phone: '5355555555', full_name: 'Vendedor', plan: 'free' },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      });
    };

    setupSupabaseMock('*{product_name}*\n{product_price}\nVer: {product_url}');

    const { unmount } = render(
      <MemoryRouter initialEntries={['/mi-tienda']}>
        <Routes>
          <Route path="/:slug" element={<PublicCatalogPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Zapatilla Pro')).toBeInTheDocument();
    });

    // Compartir tienda (sí pasa url pública)
    fireEvent.click(screen.getByRole('button', { name: /Compartir$/i }));
    await waitFor(() => {
      expect(shareLib.shareContent).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://nazaar.shop/mi-tienda',
        })
      );
    });
    expect(vi.mocked(shareLib.shareContent).mock.calls[0][0].text).not.toContain('localhost');

    // Compartir producto con etiqueta {product_url}: incluye URL en text pero no pasa url separada
    fireEvent.click(screen.getByRole('button', { name: 'Compartir Zapatilla Pro' }));
    await waitFor(() => {
      expect(shareLib.shareContent).toHaveBeenCalledTimes(2);
    });
    const prodPayloadWithTag = vi.mocked(shareLib.shareContent).mock.calls[1][0];
    expect(prodPayloadWithTag.url).toBeUndefined();
    expect(prodPayloadWithTag.text).toContain('https://nazaar.shop/mi-tienda/p/p1');
    expect(prodPayloadWithTag.text).not.toContain('localhost');

    unmount();
    vi.clearAllMocks();

    // Segundo render: plantilla SIN etiquetas de enlace
    setupSupabaseMock('*{product_name}* · {product_price}');
    render(
      <MemoryRouter initialEntries={['/mi-tienda']}>
        <Routes>
          <Route path="/:slug" element={<PublicCatalogPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Zapatilla Pro')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Compartir Zapatilla Pro' }));
    await waitFor(() => {
      expect(shareLib.shareContent).toHaveBeenCalledTimes(1);
    });
    const prodPayloadWithoutTag = vi.mocked(shareLib.shareContent).mock.calls[0][0];
    expect(prodPayloadWithoutTag.url).toBeUndefined();
    expect(prodPayloadWithoutTag.text).toMatch(/^\*Zapatilla Pro\* · 2[.,]?500 CUP$/);
    expect(prodPayloadWithoutTag.text).not.toContain('nazaar.shop');
    expect(prodPayloadWithoutTag.text).not.toContain('localhost');
  });

  it('usa enlace corto /s/<code> con referido oculto cuando supabase.rpc responde y no invoca RPC si la plantilla no usa {product_url}', async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data: 'k7X9m2', error: null });
    (supabase as any).rpc = mockRpc;
    mockUseAuthStore.mockReturnValue({
      user: { id: 'aff-1', referral_code: 'ref_abc123' },
    });

    const setupMock = (shareTemplate: string) => {
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
                    share_template: shareTemplate,
                  },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        if (table === 'products') {
          const order2 = vi.fn().mockResolvedValue({
            data: [
              {
                id: 'p1',
                name: 'Zapatilla Pro',
                description: 'Cómoda',
                price: 2500,
                currency: 'CUP',
                is_active: true,
                is_out_of_stock: false,
                stock_status: 'available',
              },
            ],
            error: null,
          });
          const order1 = vi.fn().mockReturnValue({ order: order2 });
          const eqActive = vi.fn().mockReturnValue({ order: order1 });
          const eqCatalog = vi.fn().mockReturnValue({ eq: eqActive });
          return {
            select: vi.fn().mockReturnValue({ eq: eqCatalog }),
          } as any;
        }
        if (table === 'categories') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          } as any;
        }
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { phone: '5355555555', full_name: 'Vendedor', plan: 'free' },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        return {} as any;
      });
    };

    setupMock('*{product_name}*\n{product_price}\nVer: {product_url}');

    const { unmount } = render(
      <MemoryRouter initialEntries={['/mi-tienda']}>
        <Routes>
          <Route path="/:slug" element={<PublicCatalogPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Zapatilla Pro')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Compartir Zapatilla Pro' }));
    await waitFor(() => {
      expect(shareLib.shareContent).toHaveBeenCalledTimes(1);
    });

    expect(mockRpc).toHaveBeenCalledWith('get_or_create_short_link', {
      p_catalog_id: 'cat-1',
      p_product_id: 'p1',
      p_referral_code: 'ref_abc123',
    });
    const sharedText = vi.mocked(shareLib.shareContent).mock.calls[0][0].text;
    expect(sharedText).toContain('https://nazaar.shop/s/k7X9m2');
    expect(sharedText).not.toContain('?ref=');

    unmount();
    vi.clearAllMocks();
    clearShortLinkCache();
    setupMock('*{product_name}* · {product_price}');

    render(
      <MemoryRouter initialEntries={['/mi-tienda']}>
        <Routes>
          <Route path="/:slug" element={<PublicCatalogPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Zapatilla Pro')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Compartir Zapatilla Pro' }));
    await waitFor(() => {
      expect(shareLib.shareContent).toHaveBeenCalledTimes(1);
    });
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
