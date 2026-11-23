import React, { useEffect } from 'react';
import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom';
import { Home, AlertTriangle, RefreshCw } from 'lucide-react';
import { useStore } from '../store/useStore';
import { clearStaleStaticCaches, isChunkLoadError } from '../lib/lazyWithRetry';

export const ErrorPage: React.FC = () => {
  const error = useRouteError();
  const navigate = useNavigate();
  const { theme } = useStore();

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [theme]);

  const chunkError = isChunkLoadError(error);
  const isOfflineNow = typeof navigator !== 'undefined' && navigator.onLine === false;

  let errorTitle = '¡Ups! Algo salió mal';
  let errorMessage = 'Ha ocurrido un error inesperado';
  let errorCode = 'Error';

  if (chunkError) {
    errorTitle = isOfflineNow ? 'Sin conexión' : 'Actualización disponible';
    errorMessage = isOfflineNow
      ? 'No pudimos cargar esta sección porque estás sin conexión a internet. Verifica tu conexión e inténtalo de nuevo.'
      : 'Hay una nueva versión de Nazaar disponible o hubo un problema temporal al cargar esta sección. Recarga la página para continuar.';
  } else if (isRouteErrorResponse(error)) {
    errorCode = error.status.toString();
    if (error.status === 404) {
      errorMessage = 'La página que buscas no existe o ha sido movida.';
    } else if (error.status === 401) {
      errorMessage = 'No tienes permiso para ver esta página.';
    } else if (error.status === 503) {
      errorMessage = 'El servicio no está disponible en este momento.';
    }
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  const handleGoHome = async () => {
    if (chunkError) {
      await clearStaleStaticCaches();
      window.location.assign('/');
      return;
    }
    navigate('/');
  };

  const handleReload = async () => {
    if (chunkError) {
      await clearStaleStaticCaches();
    }
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center space-y-8 animate-in fade-in zoom-in duration-500">
        {/* Visual Element */}
        <div className="relative inline-block">
          <div className="absolute inset-0 blur-3xl opacity-20 bg-[var(--accent)] rounded-full animate-pulse" />
          <div className="relative bg-[var(--surface)] border border-[var(--border)] p-8 rounded-3xl shadow-2xl">
            {errorCode === '404' ? (
              <div className="text-[var(--accent)] text-8xl font-black mb-2 tracking-tighter">404</div>
            ) : (
              <AlertTriangle className="w-20 h-20 text-[var(--accent)] mx-auto mb-4" />
            )}
          </div>
        </div>

        {/* Text Content */}
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">
            {errorTitle}
          </h1>
          <p className="text-[var(--text-secondary)] text-lg leading-relaxed">
            {errorMessage}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <button
            onClick={() => void handleGoHome()}
            className="flex items-center justify-center gap-2 px-8 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-accent-text font-bold rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-accent/25"
          >
            <Home className="w-5 h-5" />
            Ir al Inicio
          </button>

          <button
            onClick={() => void handleReload()}
            className="flex items-center justify-center gap-2 px-8 py-3 bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] font-bold rounded-xl transition-all hover:scale-105 active:scale-95"
          >
            <RefreshCw className="w-5 h-5" />
            {chunkError && !isOfflineNow ? 'Actualizar página' : 'Reintentar'}
          </button>
        </div>

        {/* Footer Info */}
        <p className="text-[var(--text-secondary)] text-sm opacity-50 pt-8">
          Si el problema persiste, contacta con soporte técnico.
        </p>
      </div>
    </div>
  );
};
