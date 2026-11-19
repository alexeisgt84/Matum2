import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  buildTrafficTimeSeries,
  getOrCreateVisitorId,
  recordStoreView,
  type ViewEvent,
} from '../analytics';
import { supabase } from '../supabase';

vi.mock('../supabase', () => {
  const queryBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
    maybeSingle: vi.fn().mockResolvedValue({ data: { views_count: 5 }, error: null }),
  };

  return {
    supabase: {
      from: vi.fn().mockReturnValue(queryBuilder),
      rpc: vi.fn().mockResolvedValue({ error: null }),
      _queryBuilder: queryBuilder,
    },
  };
});

describe('analytics tracking', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('generates and stores a unique visitor id', () => {
    const vid1 = getOrCreateVisitorId();
    expect(vid1).toBeDefined();
    expect(typeof vid1).toBe('string');
    expect(vid1.length).toBeGreaterThan(5);

    // Debe persistir el mismo visitor ID en siguientes llamadas
    const vid2 = getOrCreateVisitorId();
    expect(vid2).toBe(vid1);
  });

  it('calls record_store_view RPC when recording store view', async () => {
    await recordStoreView({
      catalogId: 'cat-123',
      referralCode: 'ref_alex',
    });

    expect(supabase.rpc).toHaveBeenCalledWith('record_store_view', expect.objectContaining({
      p_catalog_id: 'cat-123',
      p_referral_code: 'ref_alex',
    }));
  });

  it('calls record_store_view RPC with product_id when recording product view', async () => {
    await recordStoreView({
      catalogId: 'cat-123',
      productId: 'prod-456',
      referralCode: 'ref_promo',
    });

    expect(supabase.rpc).toHaveBeenCalledWith('record_store_view', expect.objectContaining({
      p_catalog_id: 'cat-123',
      p_product_id: 'prod-456',
      p_referral_code: 'ref_promo',
    }));
  });

  it('debounces duplicate views within the same session', async () => {
    await recordStoreView({
      catalogId: 'cat-123',
      productId: 'prod-789',
    });
    expect(supabase.rpc).toHaveBeenCalledTimes(1);

    // Segunda llamada inmediata con mismos IDs
    await recordStoreView({
      catalogId: 'cat-123',
      productId: 'prod-789',
    });
    // Debe haber prevenido duplicación
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
  });
});

describe('buildTrafficTimeSeries', () => {
  it('returns empty series when there are no events', () => {
    const result = buildTrafficTimeSeries([], 'all', new Date('2026-11-19T12:00:00Z'));
    expect(result.byDay).toEqual([]);
    expect(result.byWeek).toEqual([]);
    expect(result.byMonth).toEqual([]);
  });

  it('groups events by day, week, and month and fills gaps', () => {
    const now = new Date(2026, 10, 19, 12, 0, 0); // 19 nov 2026 local
    const events: ViewEvent[] = [
      {
        catalog_id: 'cat-1',
        product_id: null,
        referral_code: 'ref1',
        created_at: new Date(2026, 9, 15, 10, 0, 0).toISOString(), // 15 oct 2026
      },
      {
        catalog_id: 'cat-1',
        product_id: 'prod-1',
        referral_code: null,
        created_at: new Date(2026, 10, 17, 14, 0, 0).toISOString(), // 17 nov 2026
      },
      {
        catalog_id: 'cat-1',
        product_id: null,
        referral_code: 'ref2',
        created_at: new Date(2026, 10, 19, 9, 0, 0).toISOString(), // 19 nov 2026
      },
      {
        catalog_id: 'cat-1',
        product_id: 'prod-2',
        referral_code: 'ref2',
        created_at: new Date(2026, 10, 19, 11, 0, 0).toISOString(), // 19 nov 2026
      },
    ];

    const series7d = buildTrafficTimeSeries(events, '7d', now);
    expect(series7d.byDay).toHaveLength(7);
    const nov17 = series7d.byDay.find(d => d.key === '2026-11-17');
    const nov18 = series7d.byDay.find(d => d.key === '2026-11-18');
    const nov19 = series7d.byDay.find(d => d.key === '2026-11-19');

    expect(nov17).toMatchObject({ storeViews: 0, productViews: 1, referralViews: 0, totalViews: 1 });
    expect(nov18).toMatchObject({ storeViews: 0, productViews: 0, referralViews: 0, totalViews: 0 });
    expect(nov19).toMatchObject({ storeViews: 1, productViews: 1, referralViews: 2, totalViews: 2 });

    const seriesAll = buildTrafficTimeSeries(events, 'all', now);
    expect(seriesAll.byMonth.map(m => m.key)).toEqual(['2026-10', '2026-11']);
    expect(seriesAll.byMonth[0]).toMatchObject({ storeViews: 1, productViews: 0, totalViews: 1 });
    expect(seriesAll.byMonth[1]).toMatchObject({ storeViews: 1, productViews: 2, totalViews: 3 });

    expect(seriesAll.byWeek.length).toBeGreaterThanOrEqual(5);
    const totalWeekly = seriesAll.byWeek.reduce((acc, w) => acc + w.totalViews, 0);
    expect(totalWeekly).toBe(4);
  });
});
