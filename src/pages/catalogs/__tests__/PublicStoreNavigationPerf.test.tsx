import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PublicCatalogPage } from '../PublicCatalogPage';
import { PublicProductPage } from '../PublicProductPage';
import { supabase } from '../../../lib/supabase';
import * as offlineCache from '../../../lib/offlineCache';
import { clearPublicStoreSessionCache } from '../../../lib/publicStoreSessionCache';
import { resetSystemSettingsCache } from '../../../hooks/useSystemSettings';
import { clearAffiliateStatusCache } from '../../../hooks/useCommissions';

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('../../../store/authStore', () => ({
  useAuthStore: () => ({ user: null }),
}));

vi.mock('../../../hooks/useCommissions', async () => {
  const actual = await vi.importActual<typeof import('../../../hooks/useCommissions')>(
    '../../../hooks/useCommissions'
  );
  return {
    ...actual,
    useCommissions: () => ({
      registerPendingCommission: vi.fn(),
      checkAffiliateStatus: vi.fn(),
      applyForAffiliation: vi.fn(),
      myAffiliation: null,
      loading: false,
    }),
  };
});

vi.mock('../../../hooks/useStoreTheme', () => ({
  useStoreTheme: () => ({
    themeStyles: {},
    titleColor: undefined,
  }),
}));

vi.mock('../../../lib/analytics', () => ({
  recordStoreView: vi.fn(),
}));

vi.mock('../../../lib/offlineCache', () => ({
  getCatalogFromCache: vi.fn(),
  getCatalogProductsFromCache: vi.fn(),
  getCatalogCategoriesFromCache: vi.fn(),
  saveCatalogToCache: vi.fn(),
  saveCatalogProductsToCache: vi.fn(),
  saveCatalogCategoriesToCache: vi.fn(),
  upsertCatalogProductsInCache: vi.fn(),
  isOffline: vi.fn(),
  isNetworkError: vi.fn(),
}));

describe('Navegación instantánea Tienda <-> Detalle de Producto', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    clearPublicStoreSessionCache();
    resetSystemSettingsCache();
    clearAffiliateStatusCache();

    vi.mocked(offlineCache.isOffline).mockReturnValue(false);
    vi.mocked(offlineCache.isNetworkError).mockReturnValue(false);
    vi.mocked(offlineCache.getCatalogFromCache).mockResolvedValue(null);
    vi.mocked(offlineCache.getCatalogProductsFromCache).mockResolvedValue([]);
    vi.mocked(offlineCache.getCatalogCategoriesFromCache).mockResolvedValue([]);
    vi.mocked(offlineCache.saveCatalogToCache).mockResolvedValue(undefined);
    vi.mocked(offlineCache.saveCatalogProductsToCache).mockResolvedValue(undefined);
    vi.mocked(offlineCache.saveCatalogCategoriesToCache).mockResolvedValue(undefined);
    vi.mocked(offlineCache.upsertCatalogProductsInCache).mockResolvedValue(undefined);
  });

  afterEach(() => {
    clearPublicStoreSessionCache();
  });

  it('entra al detalle del producto en 0 ms sin LoadingScreen ni nuevas consultas y regresa a la tienda instantáneamente con el carrito sincronizado', async () => {
    const tableQueries: Record<string, number> = {
      catalogs: 0,
      products: 0,
      categories: 0,
      users: 0,
      system_settings: 0,
    };

    const mockProducts = [
      {
        id: 'p1',
        catalog_id: 'cat-1',
        name: 'Zapatilla Pro',
        description: 'Muy cómoda para correr',
        price: 2500,
        currency: 'CUP',
        category_id: 1,
        is_active: true,
        is_out_of_stock: false,
        stock_status: 'available',
        is_featured: true,
        position: 0,
      },
      {
        id: 'p2',
        catalog_id: 'cat-1',
        name: 'Gorra Negra',
        description: 'Algodón premium',
        price: 900,
        currency: 'CUP',
        category_id: 1,
        is_active: true,
        is_out_of_stock: false,
        stock_status: 'available',
        is_featured: false,
        position: 1,
      },
    ];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      tableQueries[table] = (tableQueries[table] || 0) + 1;

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
                  name: 'Mi Tienda Rápida',
                  slogan: 'Todo al momento',
                  user_id: 'owner-1',
                  is_active: true,
                  is_public: true,
                  is_blocked: false,
                },
                error: null,
              }),
            }),
          }),
        } as any;
      }

      if (table === 'products') {
        const order2 = vi.fn().mockResolvedValue({
          data: mockProducts,
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
                order: vi.fn().mockResolvedValue({
                  data: [{ id: 1, name: 'Ropa', icon: 'shirt', display_order: 0, is_active: true }],
                  error: null,
                }),
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

    render(
      <MemoryRouter initialEntries={['/mi-tienda']}>
        <Routes>
          <Route path="/:slug" element={<PublicCatalogPage />} />
          <Route path="/:slug/p/:productId" element={<PublicProductPage />} />
        </Routes>
      </MemoryRouter>
    );

    // 1. Carga inicial de la tienda
    await waitFor(() => {
      expect(screen.getByText('Zapatilla Pro')).toBeInTheDocument();
    });
    expect(screen.getByText('Gorra Negra')).toBeInTheDocument();
    expect(offlineCache.saveCatalogProductsToCache).toHaveBeenCalledWith(
      'cat-1',
      mockProducts,
      { prefetchImages: false }
    );

    const catalogsAfterInitial = tableQueries.catalogs;
    const productsAfterInitial = tableQueries.products;
    const categoriesAfterInitial = tableQueries.categories;
    const usersAfterInitial = tableQueries.users;
    const settingsAfterInitial = tableQueries.system_settings;

    // 2. Entrar al detalle del producto -> renderizado síncrono en el mismo tick (0 ms, sin LoadingScreen)
    fireEvent.click(screen.getByRole('link', { name: 'Zapatilla Pro' }));

    expect(screen.queryByText(/Cargando producto/i)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Zapatilla Pro' })).toBeInTheDocument();
    expect(screen.getByText('Muy cómoda para correr')).toBeInTheDocument();
    // Relacionado calculado localmente desde los productos en memoria
    expect(screen.getByText('Gorra Negra')).toBeInTheDocument();

    // Cero consultas extra a Supabase al abrir el producto
    expect(tableQueries.catalogs).toBe(catalogsAfterInitial);
    expect(tableQueries.products).toBe(productsAfterInitial);
    expect(tableQueries.categories).toBe(categoriesAfterInitial);
    expect(tableQueries.users).toBe(usersAfterInitial);
    expect(tableQueries.system_settings).toBe(settingsAfterInitial);

    // 3. Agregar al pedido desde la ficha del producto y volver a la tienda
    fireEvent.click(screen.getByRole('button', { name: /Agregar al pedido/i }));
    fireEvent.click(screen.getByRole('link', { name: 'Volver a la tienda' }));

    // Regreso síncrono sin LoadingScreen
    expect(screen.queryByText(/Cargando tienda/i)).not.toBeInTheDocument();
    expect(screen.getByText('Zapatilla Pro')).toBeInTheDocument();
    expect(screen.getByText('Gorra Negra')).toBeInTheDocument();
    // Carrito sincronizado inmediatamente en la tarjeta de Zapatilla Pro y en el FAB/toolbar
    expect(
      screen.getByRole('button', { name: 'Quitar una unidad de Zapatilla Pro' })
    ).toBeInTheDocument();

    // Cero consultas redundantes al regresar a la tienda
    expect(tableQueries.catalogs).toBe(catalogsAfterInitial);
    expect(tableQueries.products).toBe(productsAfterInitial);
    expect(tableQueries.categories).toBe(categoriesAfterInitial);
    expect(tableQueries.users).toBe(usersAfterInitial);
    expect(tableQueries.system_settings).toBe(settingsAfterInitial);
  });
});
