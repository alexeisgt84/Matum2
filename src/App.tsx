import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AppHeader } from './components/layout/AppHeader';
import { BottomNav } from './components/layout/BottomNav';
import { HeaderProvider } from './lib/HeaderContext';
import { useStore } from './store/useStore';

function App() {
  const location = useLocation();
  const { theme } = useStore();
  
  const isAuthPage = ['/login', '/register', '/forgot-password'].includes(location.pathname);
  
  const isPublicStorePage = () => {
    const path = location.pathname;
    const knownPrefixes = ['/login', '/register', '/forgot-password', '/catalogs', '/history', '/profile', '/admin'];
    if (path === '/') return false;
    return !knownPrefixes.some(prefix => path.startsWith(prefix));
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
