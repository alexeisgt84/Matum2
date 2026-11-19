import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCatalogs } from '../../hooks/useCatalogs';
import {
  usePublicCatalogs,
  comparePublicCatalogs,
  type PublicCatalogItem,
} from '../../hooks/usePublicCatalogs';
import { useAuthStore } from '../../store/authStore';
import {
  Users,
  Rocket,
  Sun,
  Moon,
  ShieldCheck,
  Store,
  Search,
  X,
  Coins,
  ChevronRight,
  Package,
  LogIn,
  Plus,
  Bookmark,
} from 'lucide-react';
import { Skeleton } from '../../components/ui/Skeleton';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { PublicCatalogCard } from '../../components/store/PublicCatalogCard';
import { useStore } from '../../store/useStore';
import { useShareStore } from '../../store/shareStore';

type FilterMode = 'all' | 'affiliates';

const isMarketplaceCatalog = (catalog: PublicCatalogItem) =>
  catalog.catalog_type === 'marketplace' ||
  (catalog.name ? /naz+a+r/i.test(catalog.name) : false) ||
  (catalog.slug ? /naz+a+r/i.test(catalog.slug) : false);

export const DashboardPage = () => {
  const { user } = useAuthStore();
  const isCustomer = user?.role === 'customer' || user?.role === 'client';
  const { theme, toggleTheme } = useStore();
  const { catalogs, sharedCatalogs, getCatalogs, getSharedCatalogs } = useCatalogs();
  const {
    publicCatalogs,
    filteredCatalogs,
    loading: publicLoading,
    searchQuery,
    setSearchQuery,
    getPublicCatalogs,
  } = usePublicCatalogs();
  const { sharedContentList } = useShareStore();
  const navigate = useNavigate();

  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  const myCatalogIds = useMemo(() => new Set(catalogs.map((c) => c.id)), [catalogs]);
  const sharedCatalogIds = useMemo(() => new Set(sharedCatalogs.map((c) => c.id)), [sharedCatalogs]);

  const userId = user?.id;

  useEffect(() => {
    getPublicCatalogs();
  }, [getPublicCatalogs]);

  useEffect(() => {
    if (userId) {
      if (!isCustomer) {
        getCatalogs();
      }
      getSharedCatalogs();
    }
  }, [userId, isCustomer, getCatalogs, getSharedCatalogs]);

  const affiliatesCount = useMemo(
    () => publicCatalogs.filter((c) => Boolean(c.enable_affiliates)).length,
    [publicCatalogs]
  );

  const displayedCatalogs = useMemo(() => {
    const byFilter =
      filterMode === 'affiliates'
        ? filteredCatalogs.filter((cat) => Boolean(cat.enable_affiliates))
        : filteredCatalogs;

    return [...byFilter].sort((a, b) => {
      const aMarket = isMarketplaceCatalog(a) ? 1 : 0;
      const bMarket = isMarketplaceCatalog(b) ? 1 : 0;
      if (aMarket !== bMarket) return bMarket - aMarket;
      return comparePublicCatalogs(a, b);
    });
  }, [filteredCatalogs, filterMode]);

  const hasActiveFilters = Boolean(searchQuery.trim()) || filterMode !== 'all';

  return (
    <div className="p-4 max-w-lg mx-auto pb-24 space-y-5 animate-in fade-in duration-700">
      {/* Header Section */}
      <header className="flex items-center gap-3.5">
        <div className="relative flex-shrink-0">
          <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-accent/20 bg-surface-hover flex items-center justify-center">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <Users size={22} className="text-secondary" />
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 bg-accent rounded-md border-2 border-background flex items-center justify-center">
            <Rocket size={9} className="text-accent-text" />
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-0.5">
          <h1 className="text-xl font-black text-primary tracking-tight leading-none truncate">
            {user ? `Hola, ${user.nombre?.split(' ')[0] || 'Capi'}` : 'Bienvenido a Nazaar'}
          </h1>
          <p className="text-secondary text-[10px] font-bold uppercase tracking-[0.1em]">
            Explora tiendas y catálogos
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {!user && (
            <Button
              variant="primary"
              size="sm"
              icon={LogIn}
              onClick={() => navigate('/login?redirect=/')}
              className="h-9 px-3 rounded-xl text-xs font-bold"
            >
              Entrar
            </Button>
          )}
          {user?.role === 'admin' && (
            <Button
              variant="ghost"
              size="sm"
              icon={ShieldCheck}
              onClick={() => navigate('/admin')}
              title="Panel Admin"
              aria-label="Panel Admin"
              className="w-10 h-10 p-0 rounded-xl text-accent hover:bg-accent/10"
            />
          )}
          <Button
            variant="ghost"
            size="sm"
            icon={theme === 'dark' ? Sun : Moon}
            onClick={toggleTheme}
            title="Cambiar tema"
            aria-label="Cambiar tema"
            className="w-10 h-10 p-0 rounded-xl"
          />
        </div>
      </header>

      {/* Invitación compacta para visitantes sin cuenta */}
      {!user && (
        <section className="p-3.5 rounded-2xl bg-surface border border-border space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-primary">
              Explora libremente. Inicia sesión solo si quieres:
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate('/catalogs/new')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-accent/10 text-accent hover:bg-accent/15 text-[11px] font-semibold transition-colors"
            >
              <Plus size={13} />
              <span>Crear catálogo</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/followed-catalogs')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-surface-hover text-primary hover:border-accent/40 border border-border text-[11px] font-semibold transition-colors"
            >
              <Bookmark size={13} />
              <span>Ser miembro</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/profile/affiliates')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/15 text-[11px] font-semibold transition-colors"
            >
              <Coins size={13} />
              <span>Plan de afiliación</span>
            </button>
          </div>
        </section>
      )}

      {/* Aviso compacto de productos compartidos en espera */}
      {user && sharedContentList.length > 0 && (
        <button
          type="button"
          onClick={() => navigate('/catalogs')}
          className="w-full p-3 rounded-2xl bg-accent/10 border border-accent/25 hover:bg-accent/15 transition-all flex items-center justify-between gap-3 text-left active:scale-[0.99]"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-accent/20 text-accent flex items-center justify-center flex-shrink-0">
              <Package size={16} />
            </div>
            <p className="text-xs font-semibold text-primary truncate">
              Tienes {sharedContentList.length}{' '}
              {sharedContentList.length === 1 ? 'producto' : 'productos'} en espera para registrar
            </p>
          </div>
          <ChevronRight size={16} className="text-accent flex-shrink-0" />
        </button>
      )}

      {/* Buscador y Filtros Rápidos */}
      <section className="space-y-3">
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary pointer-events-none"
          />
          <input
            type="text"
            placeholder="Buscar por nombre, rubro o eslogan…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 bg-surface border border-border rounded-xl text-xs text-primary placeholder:text-secondary focus:outline-none focus:border-accent transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-secondary hover:text-primary p-1"
              aria-label="Limpiar búsqueda"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 flex-shrink-0 border ${
              filterMode === 'all'
                ? 'bg-[var(--accent)] text-[var(--accent-text)] border-transparent shadow-sm'
                : 'bg-surface border-border text-secondary hover:text-primary hover:bg-surface-hover'
            }`}
          >
            <Store size={13} />
            <span>Todas</span>
            {!publicLoading && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  filterMode === 'all' ? 'bg-black/20' : 'bg-surface-hover'
                }`}
              >
                {publicCatalogs.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('affiliates')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 flex-shrink-0 border ${
              filterMode === 'affiliates'
                ? 'bg-emerald-600 text-white border-transparent shadow-sm'
                : 'bg-surface border-border text-secondary hover:text-primary hover:bg-surface-hover'
            }`}
          >
            <Coins size={13} />
            <span>Con Afiliados · Gana Comisión</span>
            {!publicLoading && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  filterMode === 'affiliates' ? 'bg-black/20' : 'bg-surface-hover'
                }`}
              >
                {affiliatesCount}
              </span>
            )}
          </button>
        </div>
      </section>

      {/* Plaza Comercial / Catálogos Públicos */}
      <section className="space-y-3.5">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2">
            <Store size={15} className="text-accent" />
            <h2 className="text-[11px] font-black uppercase tracking-[0.18em] text-secondary">
              Tiendas en la Plataforma
            </h2>
          </div>
          {!publicLoading && displayedCatalogs.length > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
              {displayedCatalogs.length}{' '}
              {displayedCatalogs.length === 1 ? 'disponible' : 'disponibles'}
            </span>
          )}
        </div>

        {publicLoading && publicCatalogs.length === 0 ? (
          <div className="grid gap-3.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-3.5 space-y-3">
                <Skeleton className="h-28 w-full rounded-card" />
                <div className="flex gap-2.5 items-center">
                  <Skeleton className="w-12 h-12 rounded-xl flex-shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : displayedCatalogs.length === 0 ? (
          <EmptyState
            icon={Store}
            title={
              hasActiveFilters
                ? 'No se encontraron tiendas'
                : 'No hay catálogos públicos'
            }
            description={
              searchQuery.trim()
                ? `No encontramos tiendas que coincidan con "${searchQuery}". Prueba con otro término.`
                : filterMode === 'affiliates'
                ? 'Aún no hay tiendas públicas con programa de afiliados activo.'
                : 'Aún no se han publicado catálogos en la plataforma.'
            }
            actionLabel={hasActiveFilters ? 'Ver todas las tiendas' : undefined}
            onAction={
              hasActiveFilters
                ? () => {
                    setSearchQuery('');
                    setFilterMode('all');
                  }
                : undefined
            }
          />
        ) : (
          <div className="grid gap-3.5">
            {displayedCatalogs.map((catalog) => {
              const isOwner = Boolean(
                user &&
                  (catalog.user_id === user.id ||
                    myCatalogIds.has(catalog.id) ||
                    user.role === 'admin')
              );
              const isCollaborator = Boolean(sharedCatalogIds.has(catalog.id));

              return (
                <PublicCatalogCard
                  key={catalog.id}
                  catalog={catalog}
                  isOwner={isOwner}
                  isCollaborator={isCollaborator}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
