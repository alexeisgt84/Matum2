import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePlanLimits } from '../usePlanLimits';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';

vi.mock('../../lib/supabase', () => {
  const queryBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  };

  return {
    supabase: {
      from: vi.fn().mockReturnValue(queryBuilder),
      auth: {
        signInWithPassword: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        updateUser: vi.fn(),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } },
        }),
      },
      _queryBuilder: queryBuilder,
    },
  };
});

describe('usePlanLimits hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe devolver límites por defecto cuando no hay usuario autenticado', () => {
    useAuthStore.setState({ user: null });

    const { result } = renderHook(() => usePlanLimits());

    expect(result.current.canCreateCatalog).toBe(true);
    expect(result.current.limits.catalogs).toBe(1);
    expect(result.current.counts.catalogs).toBe(0);
  });

  it('debe calcular correctamente los booleanos de límites permitidos cuando se alcanzan las cuotas', async () => {
    useAuthStore.setState({
      user: {
        id: 'usr-1',
        phone: '5351234567',
        nombre: 'Test User',
        avatar_url: null,
        plan: 'free',
        role: 'user',
      },
    });

    // Mock catalogs: 1 catálogo existente (límite free = 1)
    const mockCatalogsSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: [{ id: 'cat-1' }] }),
    });

    // Mock products: 8 productos existentes (límite free = 8)
    const mockProductsSelect = vi.fn().mockReturnValue({
      in: vi.fn().mockResolvedValue({ count: 8 }),
    });

    // Mock groups: 0 grupos
    const mockGroupsSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ count: 0 }),
    });

    // Mock subscription_plans
    const mockPlanSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { catalogs_limit: 1, products_limit: 8, groups_limit: 0 },
        }),
      }),
    });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'catalogs') return { select: mockCatalogsSelect };
      if (table === 'products') return { select: mockProductsSelect };
      if (table === 'whatsapp_groups') return { select: mockGroupsSelect };
      if (table === 'subscription_plans') return { select: mockPlanSelect };
      return { select: vi.fn().mockReturnThis() };
    });

    const { result } = renderHook(() => usePlanLimits());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.counts.catalogs).toBe(1);
    expect(result.current.counts.products).toBe(8);
    expect(result.current.canCreateCatalog).toBe(false);
    expect(result.current.canAddProduct).toBe(false);
    expect(result.current.canAddGroup).toBe(false);
  });
});
