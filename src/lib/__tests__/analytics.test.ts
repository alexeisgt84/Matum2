import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getOrCreateVisitorId, recordStoreView } from '../analytics';
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
