import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import {
  CHUNK_RELOAD_COOLDOWN_MS,
  CHUNK_RELOAD_STORAGE_KEY,
  attemptChunkReload,
  clearStaleStaticCaches,
  isChunkLoadError,
  lazyWithRetry,
  registerChunkPreloadErrorHandler,
  resetChunkReloadStateForTests,
} from '../lazyWithRetry';

class TestErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return React.createElement(
        'div',
        { 'data-testid': 'boundary-error' },
        this.state.error.message
      );
    }
    return this.props.children;
  }
}

describe('lazyWithRetry', () => {
  const originalOnLineDescriptor = Object.getOwnPropertyDescriptor(navigator, 'onLine');
  const originalCachesDescriptor = Object.getOwnPropertyDescriptor(window, 'caches');
  const originalSwDescriptor = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker');

  const setOnlineStatus = (online: boolean) => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => online,
    });
  };

  beforeEach(() => {
    window.sessionStorage.clear();
    resetChunkReloadStateForTests();
    setOnlineStatus(true);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    window.sessionStorage.clear();
    resetChunkReloadStateForTests();

    if (originalOnLineDescriptor) {
      Object.defineProperty(navigator, 'onLine', originalOnLineDescriptor);
    } else {
      delete (navigator as unknown as Record<string, unknown>).onLine;
    }

    if (originalCachesDescriptor) {
      Object.defineProperty(window, 'caches', originalCachesDescriptor);
    } else {
      delete (window as unknown as Record<string, unknown>).caches;
    }

    if (originalSwDescriptor) {
      Object.defineProperty(navigator, 'serviceWorker', originalSwDescriptor);
    } else {
      delete (navigator as unknown as Record<string, unknown>).serviceWorker;
    }
  });

  describe('isChunkLoadError', () => {
    it('detecta errores de carga de módulos dinámicos de Chrome, Safari, Firefox y Vite CSS', () => {
      expect(
        isChunkLoadError(
          new TypeError(
            'Failed to fetch dynamically imported module: https://nazaar.shop/assets/CatalogSettingsPage-VJD6ARyn.js'
          )
        )
      ).toBe(true);
      expect(isChunkLoadError(new Error('Importing a module script failed.'))).toBe(true);
      expect(
        isChunkLoadError(
          new Error('error loading dynamically imported module: https://nazaar.shop/assets/chunk.js')
        )
      ).toBe(true);
      expect(
        isChunkLoadError(new Error('Unable to preload CSS for /assets/CatalogSettingsPage.css'))
      ).toBe(true);
      expect(isChunkLoadError(new Error('Failed to load module script'))).toBe(true);
      expect(isChunkLoadError(new Error('Loading chunk 42 failed'))).toBe(true);
      expect(isChunkLoadError(new Error('Loading CSS chunk 7 failed'))).toBe(true);
      expect(
        isChunkLoadError(Object.assign(new Error('Error cualquiera'), { name: 'ChunkLoadError' }))
      ).toBe(true);
    });

    it('devuelve false para errores normales o valores vacíos', () => {
      expect(isChunkLoadError(new Error('Error de validación'))).toBe(false);
      expect(isChunkLoadError('Error de red genérico')).toBe(false);
      expect(isChunkLoadError(null)).toBe(false);
      expect(isChunkLoadError(undefined)).toBe(false);
    });
  });

  describe('attemptChunkReload y clearStaleStaticCaches', () => {
    it('recarga una vez online y bloquea recargas repetidas dentro del cooldown de 15s', () => {
      const reloadFn = vi.fn();

      expect(attemptChunkReload(reloadFn)).toBe(true);
      expect(reloadFn).toHaveBeenCalledTimes(1);

      // Segundo intento en la misma sesión de ejecución: ya estaba programada
      expect(attemptChunkReload(reloadFn)).toBe(true);
      expect(reloadFn).toHaveBeenCalledTimes(1);

      // Tras recargar (estado en memoria reiniciado), sessionStorage impide el bucle dentro de 15s
      resetChunkReloadStateForTests();
      expect(attemptChunkReload(reloadFn)).toBe(false);
      expect(reloadFn).toHaveBeenCalledTimes(1);
    });

    it('permite recargar nuevamente cuando el cooldown de 15s ha expirado', () => {
      const reloadFn = vi.fn();
      const expiredTimestamp = Date.now() - CHUNK_RELOAD_COOLDOWN_MS - 1000;
      window.sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, String(expiredTimestamp));

      expect(attemptChunkReload(reloadFn)).toBe(true);
      expect(reloadFn).toHaveBeenCalledTimes(1);
    });

    it('no recarga cuando navigator.onLine es false', () => {
      setOnlineStatus(false);
      const reloadFn = vi.fn();

      expect(attemptChunkReload(reloadFn)).toBe(false);
      expect(reloadFn).not.toHaveBeenCalled();
    });

    it('limpia cachés matum-static-* preservando matum-images-* antes de recargar', async () => {
      const deleteMock = vi.fn().mockResolvedValue(true);
      const updateMock = vi.fn().mockResolvedValue(undefined);

      Object.defineProperty(window, 'caches', {
        configurable: true,
        value: {
          keys: vi
            .fn()
            .mockResolvedValue([
              'matum-static-v1',
              'matum-static-v2',
              'nazaar-static-v1',
              'matum-images-v2',
            ]),
          delete: deleteMock,
        },
      });

      Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        value: {
          getRegistrations: vi.fn().mockResolvedValue([{ update: updateMock }]),
        },
      });

      const reloadFn = vi.fn();
      expect(attemptChunkReload(reloadFn)).toBe(true);

      await waitFor(() => {
        expect(reloadFn).toHaveBeenCalledTimes(1);
      });

      expect(deleteMock).toHaveBeenCalledWith('matum-static-v1');
      expect(deleteMock).toHaveBeenCalledWith('matum-static-v2');
      expect(deleteMock).toHaveBeenCalledWith('nazaar-static-v1');
      expect(deleteMock).not.toHaveBeenCalledWith('matum-images-v2');
      expect(updateMock).toHaveBeenCalledTimes(1);

      await clearStaleStaticCaches();
      expect(deleteMock).toHaveBeenCalledTimes(6);
    });
  });

  describe('lazyWithRetry wrapper', () => {
    const renderWithBoundary = (LazyComp: React.ComponentType) =>
      render(
        React.createElement(
          TestErrorBoundary,
          null,
          React.createElement(
            React.Suspense,
            { fallback: React.createElement('div', null, 'Cargando...') },
            React.createElement(LazyComp)
          )
        )
      );

    it('renderiza el componente normalmente cuando el import tiene éxito', async () => {
      const LazyComp = lazyWithRetry(async () => ({
        default: () => React.createElement('div', null, 'Contenido cargado'),
      }));

      renderWithBoundary(LazyComp);

      expect(await screen.findByText('Contenido cargado')).toBeInTheDocument();
    });

    it('dispara recarga y mantiene el fallback pendiente en el primer error de chunk', async () => {
      const reloadFn = vi.fn();
      const LazyComp = lazyWithRetry<React.ComponentType>(
        async () => {
          throw new TypeError(
            'Failed to fetch dynamically imported module: https://nazaar.shop/assets/CatalogSettingsPage-VJD6ARyn.js'
          );
        },
        reloadFn
      );

      renderWithBoundary(LazyComp);

      await waitFor(() => {
        expect(reloadFn).toHaveBeenCalledTimes(1);
      });
      expect(screen.getByText('Cargando...')).toBeInTheDocument();
      expect(screen.queryByTestId('boundary-error')).not.toBeInTheDocument();
    });

    it('relanza el error de chunk si ya hubo una recarga dentro del cooldown', async () => {
      window.sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, String(Date.now()));
      const reloadFn = vi.fn();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const LazyComp = lazyWithRetry<React.ComponentType>(
        async () => {
          throw new TypeError(
            'Failed to fetch dynamically imported module: https://nazaar.shop/assets/CatalogSettingsPage-VJD6ARyn.js'
          );
        },
        reloadFn
      );

      renderWithBoundary(LazyComp);

      expect(await screen.findByTestId('boundary-error')).toHaveTextContent(
        'Failed to fetch dynamically imported module'
      );
      expect(reloadFn).not.toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('relanza errores normales sin intentar recargar', async () => {
      const reloadFn = vi.fn();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const LazyComp = lazyWithRetry<React.ComponentType>(
        async () => {
          throw new Error('Fallo interno de componente');
        },
        reloadFn
      );

      renderWithBoundary(LazyComp);

      expect(await screen.findByTestId('boundary-error')).toHaveTextContent(
        'Fallo interno de componente'
      );
      expect(reloadFn).not.toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('registerChunkPreloadErrorHandler', () => {
    it('dispara recarga ante vite:preloadError sin llamar a event.preventDefault()', () => {
      const reloadFn = vi.fn();
      const cleanup = registerChunkPreloadErrorHandler(reloadFn);

      const event = new Event('vite:preloadError', { cancelable: true }) as Event & {
        payload?: unknown;
      };
      event.payload = new TypeError(
        'Failed to fetch dynamically imported module: https://nazaar.shop/assets/CatalogSettingsPage-VJD6ARyn.js'
      );

      const notCancelled = window.dispatchEvent(event);

      expect(notCancelled).toBe(true);
      expect(event.defaultPrevented).toBe(false);
      expect(reloadFn).toHaveBeenCalledTimes(1);

      cleanup();
    });
  });
});
