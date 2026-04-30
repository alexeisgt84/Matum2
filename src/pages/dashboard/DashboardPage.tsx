import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCatalogs } from '../../hooks/useCatalogs';
import { usePlanLimits } from '../../hooks/usePlanLimits';
import { useAuthStore } from '../../store/authStore';
import { 
  LayoutGrid, 
  ShoppingBag, 
  Users, 
  Plus, 
  ChevronRight, 
  Rocket,
  Settings,
  History,
  MessageCircle,
  Sun,
  Moon,
  ShieldCheck
} from 'lucide-react';
import { Skeleton } from '../../components/ui/Skeleton';
import { Button } from '../../components/ui/Button';
import { useStore } from '../../store/useStore';

export const DashboardPage = () => {
  const { user } = useAuthStore();
  const { theme, toggleTheme } = useStore();
  const { catalogs, loading, getCatalogs } = useCatalogs();
  const { counts, loading: limitsLoading } = usePlanLimits();
  const navigate = useNavigate();

  useEffect(() => {
    getCatalogs();
  }, [getCatalogs]);

  const stats = [
    { label: 'Catálogos', value: counts.catalogs, icon: LayoutGrid, color: 'text-accent', bg: 'bg-accent/10' },
    { label: 'Productos', value: counts.products, icon: ShoppingBag, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Grupos WA', value: counts.groups, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  ];

  const quickActions = [
    { label: 'Nuevo Catálogo', icon: Plus, path: '/catalogs/new', color: 'bg-accent' },
    { label: 'Ver Historial', icon: History, path: '/history', color: 'bg-surface-hover' },
    ...(user?.role === 'admin' ? [{ label: 'Panel Admin', icon: ShieldCheck, path: '/admin', color: 'bg-surface-hover' }] : []),
    { label: 'Mi Perfil', icon: Settings, path: '/profile', color: 'bg-surface-hover' },
  ];

  return (
    <div className="p-4 max-w-lg mx-auto pb-24 space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <header className="flex items-center gap-4">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-accent/20 bg-surface-hover flex items-center justify-center">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <Users size={24} className="text-secondary" />
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-accent rounded-lg border-2 border-background flex items-center justify-center">
            <Rocket size={10} className="text-black" />
          </div>
        </div>
        
        <div className="flex-1 space-y-0.5">
          <h1 className="text-2xl font-black text-primary tracking-tight leading-none">
            Hola, {user?.nombre?.split(' ')[0] || 'Capi'}
          </h1>
          <p className="text-secondary text-[10px] font-bold uppercase tracking-[0.1em]">Panel de Control</p>
        </div>

        <div className="flex flex-col gap-2">

          <Button
            variant="ghost"
            size="sm"
            icon={theme === 'dark' ? Sun : Moon}
            onClick={toggleTheme}
            className="w-10 h-10 p-0 rounded-xl"
          />
        </div>
      </header>

      {/* Stats Grid - NOW FIRST */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-3 flex flex-col items-center gap-2 text-center border-border hover:border-accent/30 transition-colors">
            <div className={`p-2 rounded-xl ${stat.bg} ${stat.color}`}>
              <stat.icon size={20} />
            </div>
            <div className="space-y-0.5 w-full flex flex-col items-center">
              {limitsLoading ? (
                <Skeleton className="h-7 w-8 mb-1" />
              ) : (
                <span className="text-xl font-black text-primary block">
                  {stat.value}
                </span>
              )}
              <span className="text-[9px] font-bold uppercase tracking-wider text-secondary">
                {stat.label}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Catalogs */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-secondary">Tus Catálogos</h2>
          <button 
            onClick={() => navigate('/catalogs')}
            className="text-[10px] font-bold text-accent uppercase tracking-wider hover:opacity-70 transition-opacity"
          >
            Ver todos
          </button>
        </div>

        <div className="space-y-3">
          {loading && catalogs.length === 0 ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="card p-4 flex items-center gap-4 border-white/5">
                <Skeleton className="w-12 h-12 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-5 w-5 rounded-md" />
              </div>
            ))
          ) : (
            <>
              {catalogs.slice(0, 3).map((catalog) => (
                <div
                  key={catalog.id}
                  onClick={() => navigate(`/catalogs/${catalog.id}`)}
                  className="card p-4 group hover:bg-surface-hover cursor-pointer transition-all border-border active:scale-[0.98]"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/20 to-transparent flex items-center justify-center text-accent border border-accent/10">
                      <LayoutGrid size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-primary truncate group-hover:text-accent transition-colors">{catalog.name}</h3>
                      <p className="text-xs text-secondary truncate">{catalog.description || 'Sin descripción'}</p>
                    </div>
                    <ChevronRight size={18} className="text-secondary group-hover:text-primary transition-colors" />
                  </div>
                </div>
              ))}
              {catalogs.length === 0 && (
                <div className="card p-8 border-dashed border-border text-center space-y-3">
                  <p className="text-secondary text-sm">No tienes catálogos creados</p>
                  <button 
                    onClick={() => navigate('/catalogs/new')}
                    className="text-xs font-bold text-accent uppercase tracking-widest border border-accent/20 px-4 py-2 rounded-full hover:bg-accent/5 transition-colors"
                  >
                    Crear el primero
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Quick Actions */}
      <section className="space-y-4">
        <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-secondary flex items-center gap-2 px-1">
          <div className="w-1.5 h-1.5 rounded-full bg-accent" />
          Accesos Rápidos
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className={`flex items-center gap-3 p-4 rounded-2xl transition-all active:scale-95 group relative overflow-hidden ${
                action.color === 'bg-accent' 
                ? 'bg-accent text-black shadow-lg shadow-accent/20' 
                : 'bg-surface-hover text-primary hover:bg-surface-hover/80'
              }`}
            >
              <div className={`${action.color === 'bg-accent' ? 'bg-black/10' : 'bg-primary/10'} p-2 rounded-lg`}>
                <action.icon size={18} />
              </div>
              <span className="font-bold text-sm tracking-tight">{action.label}</span>
              <ChevronRight size={14} className="ml-auto opacity-30 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};
