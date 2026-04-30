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
        {!isAuthPage && location.pathname !== '/' && <AppHeader />}
        
        <main className={`flex-1 ${!isAuthPage ? 'pb-24' : ''}`}>
          <Outlet />
        </main>

        {!isAuthPage && <BottomNav />}
      </div>
    </HeaderProvider>
  );
}

export default App;
