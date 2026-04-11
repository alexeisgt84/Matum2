import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, LayoutGrid, Calendar, History, User } from 'lucide-react';

export const BottomNav = () => {
  const tabs = [
    { name: 'Inicio', icon: Home, path: '/' },
    { name: 'Catálogos', icon: LayoutGrid, path: '/catalogs' },
    { name: 'Historial', icon: History, path: '/history' },
    { name: 'Perfil', icon: User, path: '/profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#0f0f0f] border-t border-white/5 pb-safe pt-2 px-6">
      <div className="flex justify-between items-center max-w-lg mx-auto h-16">
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            end={tab.path === '/'}
            className={({ isActive }) => `
              flex flex-col items-center gap-1 transition-all
              ${isActive ? 'text-[#25D366]' : 'text-gray-500 hover:text-white'}
            `}
          >
            {({ isActive }) => (
              <>
                <tab.icon size={24} />
                <span className="text-[10px] font-medium uppercase tracking-wider">
                  {tab.name}
                </span>
                <div className={`
                  w-1 h-1 rounded-full bg-[#25D366] transition-all
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
