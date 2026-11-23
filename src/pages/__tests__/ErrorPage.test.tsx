import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorPage } from '../ErrorPage';

const mockUseRouteError = vi.fn();
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useRouteError: () => mockUseRouteError(),
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../store/useStore', () => ({
  useStore: () => ({ theme: 'light' }),
}));

describe('ErrorPage', () => {
  const originalOnLineDescriptor = Object.getOwnPropertyDescriptor(navigator, 'onLine');
  const originalLocation = window.location;

  const setOnlineStatus = (online: boolean) => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => online,
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setOnlineStatus(true);
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: {
        ...originalLocation,
        reload: vi.fn(),
        assign: vi.fn(),
      },
    });
  });

  afterEach(() => {
    if (originalOnLineDescriptor) {
      Object.defineProperty(navigator, 'onLine', originalOnLineDescriptor);
    } else {
      delete (navigator as unknown as Record<string, unknown>).onLine;
    }

    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
  });

  it('muestra título y mensaje amigable en español para fallos de módulo dinámico estando online', async () => {
    const user = userEvent.setup();
    mockUseRouteError.mockReturnValue(
      new TypeError(
        'Failed to fetch dynamically imported module: https://nazaar.shop/assets/CatalogSettingsPage-VJD6ARyn.js'
      )
    );

    render(<ErrorPage />);

    expect(screen.getByRole('heading', { name: 'Actualización disponible' })).toBeInTheDocument();
    expect(
      screen.getByText(/Hay una nueva versión de Nazaar disponible/i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/CatalogSettingsPage-VJD6ARyn\.js/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Failed to fetch dynamically imported module/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Actualizar página/i }));
    await waitFor(() => {
      expect(window.location.reload).toHaveBeenCalledTimes(1);
    });

    await user.click(screen.getByRole('button', { name: /Ir al Inicio/i }));
    await waitFor(() => {
      expect(window.location.assign).toHaveBeenCalledWith('/');
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('muestra mensaje de conectividad cuando falla el chunk estando sin conexión', () => {
    setOnlineStatus(false);
    mockUseRouteError.mockReturnValue(
      new TypeError(
        'Failed to fetch dynamically imported module: https://nazaar.shop/assets/CatalogSettingsPage-VJD6ARyn.js'
      )
    );

    render(<ErrorPage />);

    expect(screen.getByRole('heading', { name: 'Sin conexión' })).toBeInTheDocument();
    expect(
      screen.getByText(/No pudimos cargar esta sección porque estás sin conexión a internet/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reintentar/i })).toBeInTheDocument();
  });

  it('conserva el comportamiento habitual para respuestas 404 y errores genéricos', async () => {
    const user = userEvent.setup();
    mockUseRouteError.mockReturnValue({
      status: 404,
      statusText: 'Not Found',
      internal: true,
      data: 'Not Found',
    });

    const { rerender } = render(<ErrorPage />);

    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '¡Ups! Algo salió mal' })).toBeInTheDocument();
    expect(
      screen.getByText('La página que buscas no existe o ha sido movida.')
    ).toBeInTheDocument();

    mockUseRouteError.mockReturnValue(new Error('Fallo genérico en el render'));
    rerender(<ErrorPage />);

    expect(screen.getByRole('heading', { name: '¡Ups! Algo salió mal' })).toBeInTheDocument();
    expect(screen.getByText('Fallo genérico en el render')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Ir al Inicio/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});
