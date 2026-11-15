import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BottomNav } from '../BottomNav';
import { useAuthStore } from '../../../store/authStore';

vi.mock('../../../store/authStore', () => ({
  useAuthStore: vi.fn(),
}));

const mockUseAuthStore = useAuthStore as unknown as ReturnType<typeof vi.fn>;

describe('BottomNav component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra el botón Admin con enlace a /admin cuando el usuario es admin', () => {
    mockUseAuthStore.mockReturnValue({
      user: {
        id: 'admin-1',
        phone: '5350000000',
        nombre: 'Admin',
        avatar_url: null,
        plan: 'premium',
        role: 'admin',
      },
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <BottomNav />
      </MemoryRouter>
    );

    const adminLink = screen.getByRole('link', { name: /Admin/i });
    expect(adminLink).toBeInTheDocument();
    expect(adminLink).toHaveAttribute('href', '/admin');
    expect(screen.getByRole('link', { name: /Explorar/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Mis Tiendas/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Seguidos/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Perfil/i })).toBeInTheDocument();
  });

  it('no muestra el botón Admin cuando el usuario tiene rol user', () => {
    mockUseAuthStore.mockReturnValue({
      user: {
        id: 'user-1',
        phone: '5351111111',
        nombre: 'Usuario',
        avatar_url: null,
        plan: 'free',
        role: 'user',
      },
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <BottomNav />
      </MemoryRouter>
    );

    expect(screen.queryByRole('link', { name: /Admin/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Explorar/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Perfil/i })).toBeInTheDocument();
  });

  it('no muestra el botón Admin cuando no hay usuario autenticado', () => {
    mockUseAuthStore.mockReturnValue({ user: null });

    render(
      <MemoryRouter initialEntries={['/']}>
        <BottomNav />
      </MemoryRouter>
    );

    expect(screen.queryByRole('link', { name: /Admin/i })).not.toBeInTheDocument();
  });

  it('marca activo el enlace Admin cuando la ruta actual pertenece a /admin', () => {
    mockUseAuthStore.mockReturnValue({
      user: {
        id: 'admin-1',
        phone: '5350000000',
        nombre: 'Admin',
        avatar_url: null,
        plan: 'premium',
        role: 'admin',
      },
    });

    render(
      <MemoryRouter initialEntries={['/admin/users']}>
        <BottomNav />
      </MemoryRouter>
    );

    const adminLink = screen.getByRole('link', { name: /Admin/i });
    expect(adminLink).toHaveClass('text-accent');
  });
});
