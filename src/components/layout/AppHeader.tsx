import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useHeader } from '../../lib/HeaderContext';
import { BackButton } from '../ui/BackButton';

export const AppHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { title: contextTitle, subtitle, rightAction } = useHeader();

  const getTitle = (path: string) => {
    if (path === '/catalogs') return 'Tus Catálogos';
    if (path === '/history') return 'Historial';
    if (path === '/profile') return 'Mi Perfil';
    if (path.includes('/catalogs/')) return 'Detalle Catálogo';
    return 'WA Catalog';
  };

  const isHome = ['/', '/history', '/profile'].includes(location.pathname);

  return (
    <header className="sticky top-0 z-40 bg-[#0a0a0a]/80 backdrop-blur-lg border-b border-white/5 h-20 px-4 flex items-center gap-3">
      {!isHome && (
        <BackButton variant="minimal" className="-ml-2" />
      )}
      
      <div className="flex-1 min-w-0">
        <h1 className="font-bold text-lg text-white truncate leading-tight">
          {contextTitle || getTitle(location.pathname)}
        </h1>
        {subtitle && (
          <p className="text-gray-500 text-[10px] uppercase tracking-[0.2em] font-bold opacity-70 mt-0.5 flex items-center gap-1.5 truncate">
            <span className="w-1 h-1 rounded-full bg-[#25D366]/40 animate-pulse flex-shrink-0" />
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex-shrink-0 flex items-center gap-2">
        {rightAction}
      </div>
    </header>
  );
};
