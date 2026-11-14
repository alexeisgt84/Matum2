import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAdminCatalogStore } from '../adminCatalogStore';
import { supabase } from '../../lib/supabase';

vi.mock('../../lib/supabase', () => {
  const queryBuilder = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({ data: [], error: null }),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ error: null }),
  };

  return {
    supabase: {
      from: vi.fn().mockReturnValue(queryBuilder),
      rpc: vi.fn(),
      _queryBuilder: queryBuilder,
    },
  };
});

describe('adminCatalogStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAdminCatalogStore.setState({
      catalogs: [],
      loading: false,
      error: null,
    });
  });

  it('debe inicializarse con lista vacía de catálogos y loading false', () => {
    const state = useAdminCatalogStore.getState();
    expect(state.catalogs).toEqual([]);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('debe bloquear un catálogo y reflejarlo en el estado local', async () => {
    const mockCatalog = {
      id: 'cat-123',
      name: 'Tienda Test',
      user_id: 'user-1',
      is_active: true,
      is_public: true,
      is_blocked: false,
      slug: 'tienda-test',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any;

    useAdminCatalogStore.setState({ catalogs: [mockCatalog] });

    (supabase.rpc as any).mockResolvedValue({
      data: { success: true },
      error: null,
    });

    const success = await useAdminCatalogStore.getState().toggleBlockCatalog('cat-123', true, 'Motivo de prueba');

    expect(success).toBe(true);
    const updated = useAdminCatalogStore.getState().catalogs.find((c) => c.id === 'cat-123');
    expect(updated?.is_blocked).toBe(true);
    expect(updated?.blocked_reason).toBe('Motivo de prueba');
    expect(updated?.is_active).toBe(false);
  });

  it('debe eliminar un catálogo y removerlo del estado local', async () => {
    const mockCatalog = {
      id: 'cat-delete-me',
      name: 'Catálogo a Borrar',
      user_id: 'user-2',
      is_active: true,
      is_public: true,
      is_blocked: false,
      slug: 'borrar',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any;

    useAdminCatalogStore.setState({ catalogs: [mockCatalog] });

    (supabase.rpc as any).mockResolvedValue({
      data: { success: true, message: 'Eliminado con éxito' },
      error: null,
    });

    const res = await useAdminCatalogStore.getState().deleteCatalogWithAllData('cat-delete-me');

    expect(res.success).toBe(true);
    expect(useAdminCatalogStore.getState().catalogs).toHaveLength(0);
  });
});
