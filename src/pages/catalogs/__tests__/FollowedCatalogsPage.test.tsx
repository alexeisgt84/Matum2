import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { HeaderProvider } from '../../../lib/HeaderContext';
import { FollowedCatalogsPage } from '../FollowedCatalogsPage';

const mockFrom = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

vi.mock('../../../store/authStore', () => ({
  useAuthStore: () => ({
    user: { id: 'user-1', phone: '5350000000', role: 'user' },
  }),
}));

vi.mock('../../../hooks/useCatalogs', () => ({
  useCatalogs: () => ({
    catalogs: [],
    getCatalogs: vi.fn(),
  }),
}));

vi.mock('../../../hooks/useCollaboration', () => ({
  useCollaboration: () => ({
    pendingFollowRequests: [],
    getPendingFollowRequests: vi.fn(),
    respondToFollowRequest: vi.fn(),
  }),
}));

vi.mock('../../../lib/offlineCache', () => ({
  isOffline: () => false,
  isNetworkError: () => false,
  saveCachedList: vi.fn().mockResolvedValue(undefined),
  getCachedList: vi.fn().mockResolvedValue(null),
  saveCatalogToCache: vi.fn().mockResolvedValue(undefined),
  saveCatalogProductsToCache: vi.fn().mockResolvedValue(undefined),
  getCatalogProductsFromCache: vi.fn().mockResolvedValue([]),
  syncCatalogForOffline: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('react-hot-toast', () => ({
  toast: {
    success: (...args: any[]) => mockToastSuccess(...args),
    error: (...args: any[]) => mockToastError(...args),
    loading: vi.fn(),
  },
}));

vi.mock('../PublicCatalogPage', () => ({
  PublicCatalogPage: () => <div>PublicCatalogPage</div>,
}));

describe('FollowedCatalogsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('filtra por user_id, evita duplicados, muestra el botón "Dejar de seguir" y permite dejar de seguir', async () => {
    const followedEqCalls: Array<[string, any]> = [];
    const deleteEqCalls: Array<[string, any]> = [];
    let isDeleted = false;

    const sampleRow = {
      id: 'follow-1',
      catalog_id: 'cat-1',
      created_at: '2026-11-15T10:00:00Z',
      catalogs: {
        id: 'cat-1',
        user_id: 'owner-2',
        name: 'Electronemu',
        description: 'Tienda de electrónica',
        follow_code: 'MAT-123456',
        slug: 'electronemu',
        logo_url: null,
      },
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'followed_catalogs') {
        const builder: any = {
          select: vi.fn(() => builder),
          delete: vi.fn(() => {
            const delBuilder: any = {
              eq: vi.fn((col: string, val: any) => {
                deleteEqCalls.push([col, val]);
                return delBuilder;
              }),
              select: vi.fn().mockImplementation(async () => {
                isDeleted = true;
                return { data: [{ id: 'follow-1' }], error: null };
              }),
            };
            return delBuilder;
          }),
          eq: vi.fn((col: string, val: any) => {
            followedEqCalls.push([col, val]);
            return builder;
          }),
          order: vi.fn().mockImplementation(async () => ({
            // Simula incluso una respuesta duplicada para verificar deduplicación defensiva
            data: isDeleted ? [] : [sampleRow, { ...sampleRow, id: 'follow-dup' }],
            error: null,
          })),
        };
        return builder;
      }

      if (table === 'products') {
        const prodBuilder: any = {
          select: vi.fn((_cols?: string, opts?: any) => {
            if (opts?.head) {
              const countBuilder: any = {
                eq: vi.fn(() => countBuilder),
                then: (resolve: any) => resolve({ count: 3, error: null }),
              };
              return countBuilder;
            }
            return prodBuilder;
          }),
          in: vi.fn(() => prodBuilder),
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
        return prodBuilder;
      }

      return {};
    });

    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <HeaderProvider>
          <FollowedCatalogsPage />
        </HeaderProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Electronemu')).toBeInTheDocument();
    });

    // Solo debe aparecer una vez y el filtro debe incluir user_id y status='accepted'
    expect(screen.getAllByText('Electronemu')).toHaveLength(1);
    expect(followedEqCalls).toContainEqual(['user_id', 'user-1']);
    expect(followedEqCalls).toContainEqual(['status', 'accepted']);

    // Botón visible "Dejar de seguir"
    const unfollowButton = screen.getByRole('button', { name: /Dejar de seguir Electronemu/i });
    expect(unfollowButton).toHaveTextContent('Dejar de seguir');

    await user.click(unfollowButton);

    const dialog = await screen.findByText(/¿Estás seguro de que deseas dejar de seguir este catálogo\?/i);
    const modalRoot = dialog.closest('.fixed') as HTMLElement;
    const confirmBtn = within(modalRoot).getByRole('button', { name: 'Dejar de seguir' });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(deleteEqCalls).toContainEqual(['catalog_id', 'cat-1']);
      expect(deleteEqCalls).toContainEqual(['user_id', 'user-1']);
      expect(mockToastSuccess).toHaveBeenCalledWith('Dejaste de seguir el catálogo');
    });

    await waitFor(() => {
      expect(screen.queryByText('Electronemu')).not.toBeInTheDocument();
    });
  });
});
