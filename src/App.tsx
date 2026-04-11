import { Outlet, useLocation } from 'react-router-dom';
import { AppHeader } from './components/layout/AppHeader';
import { BottomNav } from './components/layout/BottomNav';
import { HeaderProvider } from './lib/HeaderContext';

function App() {
  const location = useLocation();
  const isAuthPage = ['/login', '/register', '/forgot-password'].includes(location.pathname);

  return (
    <HeaderProvider>
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
        {!isAuthPage && <AppHeader />}
        
        <main className={`flex-1 ${!isAuthPage ? 'pb-24' : ''}`}>
          <Outlet />
        </main>

        {!isAuthPage && <BottomNav />}
      </div>
    </HeaderProvider>
  );
}

export default App;
