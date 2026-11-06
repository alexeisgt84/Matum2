import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePublicCatalogs } from '../usePublicCatalogs';
import { supabase } from '../../lib/supabase';

vi.mock('../../lib/supabase', () => {
  const queryBuilder: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
  };

  return {
    supabase: {
      from: vi.fn().mockReturnValue(queryBuilder),
      _queryBuilder: queryBuilder,
    },
  };
});

describe('usePublicCatalogs hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inicia con estado inicial vacío y no cargando', () => {
    const { result } = renderHook(() => usePublicCatalogs());

    expect(result.current.publicCatalogs).toEqual([]);
    expect(result.current.filteredCatalogs).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.searchQuery).toBe('');
  });

  it('obtiene catálogos públicos y formatea productCount', async () => {
    const mockData = [
      {
        id: 'cat-1',
        name: 'Tienda Electrónica',
        slogan: 'Los mejores gadgets',
        description: 'Venta de tecnología',
        slug: 'tienda-electronica',
        logo_url: 'https://example.com/logo.jpg',
        cover_url: null,
        primary_color: '#ff782e',
        background_color: '#000000',
        surface_color: '#1a1a1a',
        text_color: '#ffffff',
        title_color: '#ffffff',
        is_active: true,
        is_public: true,
        created_at: '2026-01-01',
        products: [{ count: 5 }],
      },
      {
        id: 'cat-2',
        name: 'Ropa & Moda',
        slogan: 'Estilo único',
        description: 'Moda urbana',
        slug: 'ropa-moda',
        logo_url: null,
        cover_url: null,
        primary_color: '#3b82f6',
        background_color: null,
        surface_color: null,
        is_active: true,
        is_public: true,
        created_at: '2026-01-02',
        products: [],
      },
    ];

    const qb = (supabase as any)._queryBuilder;
    qb.order.mockResolvedValueOnce({ data: mockData, error: null });

    const { result } = renderHook(() => usePublicCatalogs());

    await act(async () => {
      await result.current.getPublicCatalogs();
    });

    expect(result.current.publicCatalogs).toHaveLength(2);
    expect(result.current.publicCatalogs[0].productCount).toBe(5);
    expect(result.current.publicCatalogs[1].productCount).toBe(0);
  });

  it('filtra catálogos por término de búsqueda', async () => {
    const mockData = [
      {
        id: '1',
        name: 'Ferretería Central',
        slogan: 'Materiales de construcción',
        description: null,
        slug: 'ferreteria',
        is_active: true,
        is_public: true,
        created_at: '2026-01-01',
        products: [],
      },
      {
        id: '2',
        name: 'Cafetería Delicia',
        slogan: 'El mejor café',
        description: null,
        slug: 'cafeteria',
        is_active: true,
        is_public: true,
        created_at: '2026-01-02',
        products: [],
      },
    ];

    const qb = (supabase as any)._queryBuilder;
    qb.order.mockResolvedValueOnce({ data: mockData, error: null });

    const { result } = renderHook(() => usePublicCatalogs());

    await act(async () => {
      await result.current.getPublicCatalogs();
    });

    expect(result.current.filteredCatalogs).toHaveLength(2);

    act(() => {
      result.current.setSearchQuery('café');
    });

    expect(result.current.filteredCatalogs).toHaveLength(1);
    expect(result.current.filteredCatalogs[0].name).toBe('Cafetería Delicia');

    act(() => {
      result.current.setSearchQuery('ferre');
    });

    expect(result.current.filteredCatalogs).toHaveLength(1);
    expect(result.current.filteredCatalogs[0].name).toBe('Ferretería Central');
  });
});
