import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { WifiOff } from 'lucide-react';
import { AppHeader } from './components/layout/AppHeader';
import { BottomNav } from './components/layout/BottomNav';
import { HeaderProvider } from './lib/HeaderContext';
import { useStore } from './store/useStore';
import { useShareStore } from './store/shareStore';
import { useAuthStore } from './store/authStore';
import {
  setupOfflineImageFallback,
  isOffline,
  checkNetworkConnectivity,
} from './lib/offlineCache';

function App() {
  const location = useLocation();
  const { theme } = useStore();
  const initListener = useShareStore((state) => state.initListener);
  const [isOnline, setIsOnline] = useState<boolean>(() => !isOffline());

  useEffect(() => {
    initListener();
    setupOfflineImageFallback();
    useAuthStore.getState().loadUser();
  }, [initListener]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleNetworkStatus = (e: Event) => {
      const custom = e as CustomEvent<{ online: boolean }>;
      if (custom.detail && typeof custom.detail.online === 'boolean') {
        setIsOnline(custom.detail.online);
      } else {
        setIsOnline(!isOffline());
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('matum:network-status', handleNetworkStatus);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('matum:network-status', handleNetworkStatus);
    };
  }, []);

  useEffect(() => {
    if (isOnline) return;
    const interval = setInterval(() => {
      if (typeof navigator === 'undefined' || navigator.onLine !== false) {
        void checkNetworkConnectivity();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isOnline]);

  const isAuthPage = ['/login', '/register', '/forgot-password'].includes(location.pathname);

  const isPublicStorePage = () => {
    const path = location.pathname;
    const knownPrefixes = [
      '/login',
      '/register',
      '/forgot-password',
      '/catalogs',
      '/followed-catalogs',
      '/profile',
      '/admin',
    ];
    if (path === '/') return false;
    return !knownPrefixes.some((prefix) => path.startsWith(prefix));
  };

  const isPublicStore = isPublicStorePage();
  const showLayout = !isAuthPage && !isPublicStore;

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [theme]);

  return (
    <HeaderProvider>
      <div className="min-h-screen bg-background text-primary flex flex-col transition-colors duration-300">
        {!isOnline && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-400 px-3 py-1.5 text-[11px] font-semibold flex items-center justify-center gap-1.5 z-50">
            <WifiOff size={13} className="flex-shrink-0" />
            <span>Modo sin conexión — Navegando catálogos guardados</span>
          </div>
        )}

        {showLayout && location.pathname !== '/' && <AppHeader />}

        <main className={`flex-1 ${showLayout ? 'pb-24' : ''}`}>
          <Outlet />
        </main>

        {showLayout && <BottomNav />}
      </div>
    </HeaderProvider>
  );
}

export default App;
