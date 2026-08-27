import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSubscriptionStore } from '../subscriptionStore';
import { supabase } from '../../lib/supabase';

vi.mock('../../lib/supabase', () => {
  const queryBuilder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };

  const storage = {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/receipt.jpg' } }),
    }),
  };

  return {
    supabase: {
      from: vi.fn().mockReturnValue(queryBuilder),
      storage,
      rpc: vi.fn(),
      _queryBuilder: queryBuilder,
    },
  };
});

describe('subscriptionStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSubscriptionStore.setState({
      subscription: null,
      transactions: [],
      pendingTransactions: [],
      loading: false,
      error: null,
    });
  });

  it('debe obtener la suscripción del usuario correctamente', async () => {
    const mockSubscription = {
      id: 'sub-1',
      user_id: 'user-123',
      plan_id: 'pro',
      status: 'active',
      start_date: '2026-01-01',
      end_date: '2026-12-31',
    };

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: mockSubscription, error: null }),
      }),
    });
    (supabase.from as any).mockReturnValueOnce({ select: mockSelect });

    await useSubscriptionStore.getState().fetchSubscription('user-123');

    const state = useSubscriptionStore.getState();
    expect(state.subscription).toEqual(mockSubscription);
    expect(state.loading).toBe(false);
  });

  it('debe obtener el historial de transacciones del usuario', async () => {
    const mockTransactions = [
      { id: 'tx-1', amount: 5000, currency: 'CUP', status: 'approved' },
      { id: 'tx-2', amount: 5000, currency: 'CUP', status: 'pending' },
    ];

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: mockTransactions, error: null }),
      }),
    });
    (supabase.from as any).mockReturnValueOnce({ select: mockSelect });

    await useSubscriptionStore.getState().fetchTransactions('user-123');

    const state = useSubscriptionStore.getState();
    expect(state.transactions).toEqual(mockTransactions);
    expect(state.loading).toBe(false);
  });

  it('debe aprobar una transacción mediante RPC', async () => {
    (supabase.rpc as any).mockResolvedValueOnce({ data: true, error: null });

    const fetchPendingSpy = vi.spyOn(useSubscriptionStore.getState(), 'fetchPendingTransactions')
      .mockResolvedValueOnce();

    await useSubscriptionStore.getState().approveTransaction('tx-100', 'admin-1');

    expect(supabase.rpc).toHaveBeenCalledWith('approve_payment_transaction', {
      target_transaction_id: 'tx-100',
      admin_id: 'admin-1',
    });
  });
});
