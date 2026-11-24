import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProducts } from '../useProducts';
import { supabase } from '../../lib/supabase';
import * as offlineCache from '../../lib/offlineCache';

vi.mock('../../lib/supabase', () => {
  const queryBuilder: any = {
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({ data: [], error: null }),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue({ data: [], error: null }),
  };

  return {
    supabase: {
      from: vi.fn().mockReturnValue(queryBuilder),
      auth: {
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } },
        }),
      },
      _queryBuilder: queryBuilder,
    },
  };
});

vi.mock('../../lib/imageOptimizer', () => ({
  optimizeImage: vi.fn(),
  blobToFile: vi.fn(),
}));

vi.mock('../../lib/offlineCache', () => ({
  isOffline: vi.fn().mockReturnValue(false),
  isNetworkError: vi.fn().mockReturnValue(false),
  getCatalogProductsFromCache: vi.fn().mockResolvedValue(null),
  upsertCatalogProductsInCache: vi.fn().mockResolvedValue(undefined),
  saveCatalogProductsToCache: vi.fn().mockResolvedValue(undefined),
  syncCatalogForOffline: vi.fn().mockResolvedValue(undefined),
}));

describe('useProducts hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no duplica productos cuando el servidor devuelve elementos con IDs repetidos en paginación o carreras', async () => {
    const mockProducts = [
      { id: 'prod-1', name: 'Zapato Deportivo', price: 25, position: 0 },
      { id: 'prod-2', name: 'Zapato Casual', price: 30, position: 1 },
    ];

    const qb = (supabase as any)._queryBuilder;
    qb.range.mockResolvedValueOnce({ data: mockProducts, error: null });

    const { result } = renderHook(() => useProducts('catalog-123', 'zapato'));

    await act(async () => {
      await result.current.getProducts(true);
    });

    expect(result.current.products).toHaveLength(2);
    expect(result.current.products.map(p => p.id)).toEqual(['prod-1', 'prod-2']);

    // Simulamos que una llamada paginada recibe solapamiento con prod-2 y un nuevo prod-3
    qb.range.mockResolvedValueOnce({
      data: [
        { id: 'prod-2', name: 'Zapato Casual', price: 30, position: 1 },
        { id: 'prod-3', name: 'Zapato Elegante', price: 45, position: 2 },
      ],
      error: null,
    });

    await act(async () => {
      await result.current.getProducts(false);
    });

    // Debe contener 3 productos únicos, no 4
    expect(result.current.products).toHaveLength(3);
    expect(result.current.products.map(p => p.id)).toEqual(['prod-1', 'prod-2', 'prod-3']);
  });

  it('deduplica correctamente productos provenientes de la caché offline', async () => {
    const cachedProducts = [
      { id: 'p1', name: 'Camisa Blanca', price: 20, position: 0 },
      { id: 'p1', name: 'Camisa Blanca Duplicada', price: 20, position: 0 },
      { id: 'p2', name: 'Camisa Azul', price: 22, position: 1 },
    ];

    vi.spyOn(offlineCache, 'getCatalogProductsFromCache').mockResolvedValueOnce(cachedProducts as any);

    const qb = (supabase as any)._queryBuilder;
    qb.range.mockResolvedValueOnce({ data: [], error: null });

    const { result } = renderHook(() => useProducts('catalog-123', 'camisa'));

    await act(async () => {
      await result.current.getProducts(true);
    });

    // La caché offline contenía 'p1' dos veces; debe haber solo 2 elementos únicos
    const ids = result.current.products.map(p => p.id);
    const uniqueIds = Array.from(new Set(ids));
    expect(ids).toEqual(uniqueIds);
  });

  it('asigna una categoría de forma masiva a los productos seleccionados y sincroniza la caché', async () => {
    const initialProducts = [
      { id: 'prod-1', name: 'Producto 1', price: 10, position: 0, category_id: null },
      { id: 'prod-2', name: 'Producto 2', price: 20, position: 1, category_id: 2 },
      { id: 'prod-3', name: 'Producto 3', price: 30, position: 2, category_id: 2 },
    ];

    const qb = (supabase as any)._queryBuilder;
    qb.range.mockResolvedValueOnce({ data: initialProducts, error: null });
    qb.in.mockResolvedValueOnce({ data: [], error: null });
    vi.spyOn(offlineCache, 'getCatalogProductsFromCache')
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(initialProducts as any);

    const { result } = renderHook(() => useProducts('catalog-123'));

    await act(async () => {
      await result.current.getProducts(true);
    });

    let ok = false;
    await act(async () => {
      ok = await result.current.updateProductsCategory(['prod-1', 'prod-2'], 5);
    });

    expect(ok).toBe(true);
    expect(qb.update).toHaveBeenCalledWith({ category_id: 5 });
    expect(qb.in).toHaveBeenCalledWith('id', ['prod-1', 'prod-2']);
    expect(result.current.products.find(p => p.id === 'prod-1')?.category_id).toBe(5);
    expect(result.current.products.find(p => p.id === 'prod-2')?.category_id).toBe(5);
    expect(result.current.products.find(p => p.id === 'prod-3')?.category_id).toBe(2);
    expect(offlineCache.saveCatalogProductsToCache).toHaveBeenCalledWith(
      'catalog-123',
      expect.arrayContaining([
        expect.objectContaining({ id: 'prod-1', category_id: 5 }),
        expect.objectContaining({ id: 'prod-2', category_id: 5 }),
        expect.objectContaining({ id: 'prod-3', category_id: 2 }),
      ])
    );
  });
});
