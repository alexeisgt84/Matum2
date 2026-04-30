import React, { useEffect } from 'react';
import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom';
import { Home, AlertTriangle, RefreshCw } from 'lucide-react';
import { useStore } from '../store/useStore';

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

  let errorMessage = "Ha ocurrido un error inesperado";
  let errorCode = "Error";

  if (isRouteErrorResponse(error)) {
    errorCode = error.status.toString();
    if (error.status === 404) {
      errorMessage = "La página que buscas no existe o ha sido movida.";
    } else if (error.status === 401) {
      errorMessage = "No tienes permiso para ver esta página.";
    } else if (error.status === 503) {
      errorMessage = "El servicio no está disponible en este momento.";
    }
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center space-y-8 animate-in fade-in zoom-in duration-500">
        {/* Visual Element */}
        <div className="relative inline-block">
          <div className="absolute inset-0 blur-3xl opacity-20 bg-[var(--accent)] rounded-full animate-pulse" />
          <div className="relative bg-[var(--surface)] border border-[var(--border)] p-8 rounded-3xl shadow-2xl">
            {errorCode === "404" ? (
               <div className="text-[var(--accent)] text-8xl font-black mb-2 tracking-tighter">404</div>
            ) : (
              <AlertTriangle className="w-20 h-20 text-[var(--accent)] mx-auto mb-4" />
            )}
          </div>
        </div>

        {/* Text Content */}
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">
            ¡Ups! Algo salió mal
          </h1>
          <p className="text-[var(--text-secondary)] text-lg leading-relaxed">
            {errorMessage}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center gap-2 px-8 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-black font-bold rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-orange-500/20"
          >
            <Home className="w-5 h-5" />
            Ir al Inicio
          </button>
          
          <button
            onClick={() => window.location.reload()}
            className="flex items-center justify-center gap-2 px-8 py-3 bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] font-bold rounded-xl transition-all hover:scale-105 active:scale-95"
          >
            <RefreshCw className="w-5 h-5" />
            Reintentar
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
