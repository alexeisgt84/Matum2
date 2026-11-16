import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DashboardPage } from '../DashboardPage';
import { useAuthStore } from '../../../store/authStore';
import { useCatalogs } from '../../../hooks/useCatalogs';
import { usePublicCatalogs } from '../../../hooks/usePublicCatalogs';
import { useStore } from '../../../store/useStore';
import { useShareStore } from '../../../store/shareStore';

vi.mock('../../../store/authStore', () => ({
  useAuthStore: vi.fn(),
}));
vi.mock('../../../hooks/useCatalogs', () => ({
  useCatalogs: vi.fn(),
}));
vi.mock('../../../hooks/usePublicCatalogs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../hooks/usePublicCatalogs')>();
  return {
    ...actual,
    usePublicCatalogs: vi.fn(),
  };
});
vi.mock('../../../store/useStore', () => ({
  useStore: vi.fn(),
}));
vi.mock('../../../store/shareStore', () => ({
  useShareStore: vi.fn(),
}));

const mockGetPublicCatalogs = vi.fn();
const mockGetCatalogs = vi.fn();
const mockGetSharedCatalogs = vi.fn();
const mockSetSearchQuery = vi.fn();

const sampleCatalog = {
  id: 'cat-1',
  user_id: 'owner-1',
  name: 'Tienda Demo',
  slogan: 'Todo en uno',
  description: null,
  slug: 'tienda-demo',
  logo_url: null,
  cover_url: null,
  primary_color: '#10b981',
  background_color: null,
  surface_color: null,
  is_active: true,
  is_public: true,
  enable_affiliates: true,
  created_at: '2026-01-01T00:00:00Z',
  productCount: 5,
};

describe('DashboardPage (Explorar)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      theme: 'dark',
      toggleTheme: vi.fn(),
    });
    (useShareStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      sharedContentList: [],
    });
    (useCatalogs as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      catalogs: [],
      sharedCatalogs: [],
      getCatalogs: mockGetCatalogs,
      getSharedCatalogs: mockGetSharedCatalogs,
    });
    (usePublicCatalogs as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      publicCatalogs: [sampleCatalog],
      filteredCatalogs: [sampleCatalog],
      loading: false,
      searchQuery: '',
      setSearchQuery: mockSetSearchQuery,
      getPublicCatalogs: mockGetPublicCatalogs,
    });
  });

  it('permite explorar tiendas públicas sin autenticarse y muestra acciones de acceso', () => {
    (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: null,
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/catalogs/new" element={<div>New Catalog Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Bienvenido a Nazaar')).toBeInTheDocument();
    expect(screen.getByText('Tienda Demo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Entrar$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Crear catálogo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ser miembro/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Plan de afiliación/i })).toBeInTheDocument();

    expect(mockGetPublicCatalogs).toHaveBeenCalledTimes(1);
    expect(mockGetCatalogs).not.toHaveBeenCalled();
    expect(mockGetSharedCatalogs).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /^Entrar$/i }));
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('muestra el saludo personalizado y oculta la invitación de invitado cuando hay sesión', () => {
    (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: {
        id: 'user-1',
        phone: '5351111111',
        nombre: 'Alexeis Pérez',
        avatar_url: null,
        plan: 'free',
        role: 'user',
      },
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <DashboardPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Hola, Alexeis')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Entrar$/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Explora libremente/i)).not.toBeInTheDocument();
    expect(mockGetCatalogs).toHaveBeenCalledTimes(1);
    expect(mockGetSharedCatalogs).toHaveBeenCalledTimes(1);
  });

  it('ordena los catálogos por plan (premium, pro, basic, free) y luego por mayor cantidad de vistas', () => {
    (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      user: null,
    });

    const catalogsList = [
      { ...sampleCatalog, id: 'c-free', name: 'Tienda Free', owner_plan: 'free', views_count: 999 },
      { ...sampleCatalog, id: 'c-basic', name: 'Tienda Basic', owner_plan: 'basic', views_count: 500 },
      { ...sampleCatalog, id: 'c-pro-low', name: 'Tienda Pro Menos Vistas', owner_plan: 'pro', views_count: 10 },
      { ...sampleCatalog, id: 'c-pro-high', name: 'Tienda Pro Más Vistas', owner_plan: 'pro', views_count: 120 },
      { ...sampleCatalog, id: 'c-prem-low', name: 'Tienda Premium Menos Vistas', owner_plan: 'premium', views_count: 50 },
      { ...sampleCatalog, id: 'c-prem-high', name: 'Tienda Premium Más Vistas', owner_plan: 'premium', views_count: 300 },
    ];

    (usePublicCatalogs as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      publicCatalogs: catalogsList,
      filteredCatalogs: catalogsList,
      loading: false,
      searchQuery: '',
      setSearchQuery: mockSetSearchQuery,
      getPublicCatalogs: mockGetPublicCatalogs,
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <DashboardPage />
      </MemoryRouter>
    );

    const titles = screen
      .getAllByRole('heading', { level: 3 })
      .map((el) => el.textContent);

    expect(titles).toEqual([
      'Tienda Premium Más Vistas',
      'Tienda Premium Menos Vistas',
      'Tienda Pro Más Vistas',
      'Tienda Pro Menos Vistas',
      'Tienda Basic',
      'Tienda Free',
    ]);
  });
});
