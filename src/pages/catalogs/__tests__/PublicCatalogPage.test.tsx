import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PublicCatalogPage } from '../PublicCatalogPage';
import { supabase } from '../../../lib/supabase';
import * as offlineCache from '../../../lib/offlineCache';

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('../../../store/authStore', () => ({
  useAuthStore: () => ({ user: null }),
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
