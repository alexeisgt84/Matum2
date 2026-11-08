import React from 'react';
import { useLocation } from 'react-router-dom';
import { useHeader } from '../../lib/HeaderContext';
import { BackButton } from '../ui/BackButton';

export const AppHeader = () => {
  const location = useLocation();
  const { title: contextTitle, subtitle, rightAction, onBack } = useHeader();

  const getTitle = (path: string) => {
    if (path === '/catalogs') return 'Tus Catálogos';
    if (path === '/followed-catalogs') return 'Catálogos Seguidos';
    if (path === '/profile') return 'Mi Perfil';
    if (path.includes('/settings')) return 'Configuración';
    if (path.includes('/catalogs/')) return 'Detalle Catálogo';
    return 'Matum';
  };

  const isHome = ['/', '/profile'].includes(location.pathname);

  return (
    <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-lg border-b border-border h-12 px-3 transition-colors duration-200">
      <div className="max-w-lg mx-auto h-full flex items-center gap-2">
        {!isHome && (
          <BackButton variant="minimal" className="-ml-1" onClick={onBack || undefined} />
        )}
        
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-sm text-primary truncate leading-tight transition-colors">
            {contextTitle || getTitle(location.pathname)}
          </h1>
          {subtitle && (
            <p className="text-secondary text-[9px] uppercase tracking-[0.15em] font-bold opacity-70 flex items-center gap-1 truncate transition-colors">
              <span className="w-1 h-1 rounded-none bg-accent/60 animate-pulse flex-shrink-0" />
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex-shrink-0 flex items-center gap-1.5">
          {rightAction}
        </div>
      </div>
    </header>
  );
};
