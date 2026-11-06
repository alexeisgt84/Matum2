import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCatalogs } from '../../hooks/useCatalogs';
import { usePublicCatalogs } from '../../hooks/usePublicCatalogs';
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
  Bookmark,
  MessageCircle,
  Sun,
  Moon,
  ShieldCheck,
  Sparkles,
  X,
  MessageSquare,
  Store,
  Search
} from 'lucide-react';
import { Skeleton } from '../../components/ui/Skeleton';
import { Button } from '../../components/ui/Button';
import { useStore } from '../../store/useStore';
import { useShareStore } from '../../store/shareStore';
import { SwipeableShareBanner } from '../../components/products/SwipeableShareBanner';

export const DashboardPage = () => {
  const { user } = useAuthStore();
  const { theme, toggleTheme } = useStore();
  const { catalogs, loading, getCatalogs } = useCatalogs();
  const { 
    publicCatalogs, 
    filteredCatalogs, 
    loading: publicLoading, 
    searchQuery, 
    setSearchQuery, 
    getPublicCatalogs 
  } = usePublicCatalogs();
  const { counts, loading: limitsLoading } = usePlanLimits();
  const { sharedContentList, removeSharedContent } = useShareStore();
  const navigate = useNavigate();

  useEffect(() => {
    getCatalogs();
    getPublicCatalogs();
  }, [getCatalogs, getPublicCatalogs]);

  const stats = [
    { label: 'Catálogos', value: counts.catalogs, icon: LayoutGrid, color: 'text-accent', bg: 'bg-accent/10' },
    { label: 'Productos', value: counts.products, icon: ShoppingBag, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Grupos WA', value: counts.groups, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  ];

  const quickActions = [
    { label: 'Nuevo Catálogo', icon: Plus, path: '/catalogs/new', color: 'bg-accent' },
    { label: 'Catálogos Seguidos', icon: Bookmark, path: '/followed-catalogs', color: 'bg-surface-hover' },
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

      {sharedContentList.length > 0 && (
        <div className="space-y-1">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-secondary px-1 mb-1 flex justify-between items-center">
            <span>Productos en espera ({sharedContentList.length})</span>
            <span className="text-[8px] lowercase opacity-60">Arraste a la izquierda para borrar</span>
          </p>
          {sharedContentList.map((item, index) => (
            <SwipeableShareBanner
              key={index}
              item={item}
              onRegister={() => navigate('/catalogs')}
              onDelete={() => removeSharedContent(index)}
            />
          ))}
        </div>
      )}

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

      {/* Public Catalogs (Catálogos Públicos) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Store size={15} className="text-accent" />
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-secondary">Catálogos Públicos</h2>
          </div>
          {!publicLoading && publicCatalogs.length > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
              {publicCatalogs.length} {publicCatalogs.length === 1 ? 'disponible' : 'disponibles'}
            </span>
          )}
        </div>

        {/* Búsqueda rápida si hay varios catálogos */}
        {publicCatalogs.length > 3 && (
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary" size={14} />
            <input
              type="text"
              placeholder="Buscar tienda o catálogo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-surface border border-border rounded-xl text-xs text-primary placeholder:text-secondary focus:outline-none focus:border-accent transition-colors"
            />
          </div>
        )}

        <div className="space-y-3">
          {publicLoading && publicCatalogs.length === 0 ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="card p-3.5 flex items-center gap-3.5 border-border">
                <Skeleton className="w-12 h-12 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
                <Skeleton className="h-8 w-20 rounded-xl" />
              </div>
            ))
          ) : filteredCatalogs.length === 0 ? (
            <div className="card p-6 border-dashed border-border text-center space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-surface-hover flex items-center justify-center mx-auto text-secondary">
                <Store size={20} />
              </div>
              <p className="text-secondary text-xs">
                {searchQuery ? 'No se encontraron catálogos con esa búsqueda' : 'No hay catálogos públicos disponibles actualmente'}
              </p>
            </div>
          ) : (
            filteredCatalogs.map((catalog) => (
              <Link
                key={catalog.id}
                to={`/${catalog.slug || catalog.id}`}
                className="card p-3.5 group hover:bg-surface-hover hover:border-accent/40 cursor-pointer transition-all border-border active:scale-[0.98] block relative overflow-hidden"
              >
                {/* Glow decorativo suave */}
                <div 
                  className="absolute top-0 right-0 w-28 h-28 rounded-full -mr-12 -mt-12 blur-2xl opacity-10 group-hover:opacity-25 transition-opacity pointer-events-none"
                  style={{ backgroundColor: catalog.primary_color || 'var(--accent)' }}
                />

                <div className="flex items-center gap-3.5 relative z-10">
                  {/* Logo o Inicial */}
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-surface-hover border border-border flex items-center justify-center flex-shrink-0 relative shadow-sm">
                    {catalog.logo_url ? (
                      <img 
                        src={catalog.logo_url} 
                        alt={catalog.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                      />
                    ) : (
                      <div 
                        className="w-full h-full flex items-center justify-center font-black text-sm select-none"
                        style={{
                          backgroundColor: catalog.primary_color ? `${catalog.primary_color}25` : 'rgba(255, 120, 46, 0.15)',
                          color: catalog.primary_color || 'var(--accent)'
                        }}
                      >
                        {catalog.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Información */}
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <h3 className="font-bold text-sm text-primary truncate group-hover:text-accent transition-colors">
                      {catalog.name}
                    </h3>
                    
                    {catalog.slogan ? (
                      <p className="text-xs text-secondary truncate italic">
                        {catalog.slogan}
                      </p>
                    ) : catalog.description ? (
                      <p className="text-xs text-secondary truncate">
                        {catalog.description}
                      </p>
                    ) : (
                      <p className="text-[11px] text-secondary/60 truncate">
                        Tienda en línea
                      </p>
                    )}

                    <div className="flex items-center gap-3 pt-0.5">
                      <span className="text-[10px] font-semibold text-secondary flex items-center gap-1">
                        <ShoppingBag size={11} className="text-accent" />
                        {catalog.productCount} {catalog.productCount === 1 ? 'producto' : 'productos'}
                      </span>
                    </div>
                  </div>

                  {/* Botón Ver Tienda */}
                  <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-surface-hover border border-border group-hover:border-accent/40 group-hover:bg-accent/10 transition-all flex-shrink-0">
                    <span className="text-[10px] font-bold text-secondary group-hover:text-accent transition-colors">
                      Ver tienda
                    </span>
                    <ChevronRight size={13} className="text-secondary group-hover:text-accent transition-colors" />
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>

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
