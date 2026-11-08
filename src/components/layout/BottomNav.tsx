import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, LayoutGrid, Bookmark, User } from 'lucide-react';

export const BottomNav = () => {
  const tabs = [
    { name: 'Inicio', icon: Home, path: '/' },
    { name: 'Catálogos', icon: LayoutGrid, path: '/catalogs' },
    { name: 'Seguidos', icon: Bookmark, path: '/followed-catalogs' },
    { name: 'Perfil', icon: User, path: '/profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border pb-safe pt-1 px-4 transition-colors duration-200">
      <div className="flex justify-between items-center max-w-lg mx-auto h-12">
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            end={tab.path === '/'}
            className={({ isActive }) => `
              flex flex-col items-center gap-0.5 py-1 px-2 transition-all
              ${isActive ? 'text-accent' : 'text-secondary hover:text-primary'}
            `}
          >
            {({ isActive }) => (
              <>
                <tab.icon size={18} />
                <span className="text-[9px] font-semibold uppercase tracking-wider">
                  {tab.name}
                </span>
                <div className={`
                  w-3 h-0.5 rounded-none bg-accent transition-all
                  ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}
                `} />
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
