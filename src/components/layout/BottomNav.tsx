import { NavLink } from 'react-router-dom';
import { Compass, Store, Bookmark, User, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export const BottomNav = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const tabs = [
    { name: 'Explorar', icon: Compass, path: '/' },
    { name: 'Mis Tiendas', icon: Store, path: '/catalogs' },
    { name: 'Seguidos', icon: Bookmark, path: '/followed-catalogs' },
    ...(isAdmin ? [{ name: 'Admin', icon: ShieldCheck, path: '/admin' }] : []),
    { name: 'Perfil', icon: User, path: '/profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border pb-safe pt-1 px-2 sm:px-4 transition-colors duration-200">
      <div className="flex justify-between items-center max-w-lg mx-auto h-12">
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            end={tab.path === '/'}
            className={({ isActive }) => `
              flex flex-col items-center gap-0.5 py-1 px-1.5 sm:px-2 transition-all
              ${isActive ? 'text-accent' : 'text-secondary hover:text-primary'}
            `}
          >
            {({ isActive }) => (
              <>
                <tab.icon size={18} />
                <span className="text-[9px] font-semibold uppercase tracking-wider whitespace-nowrap">
                  {tab.name}
                </span>
                <div className={`
                  w-3 h-0.5 rounded-full bg-accent transition-all
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
