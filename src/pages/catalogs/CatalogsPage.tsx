import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCatalogs } from '../../hooks/useCatalogs';
import { usePublicCatalogs } from '../../hooks/usePublicCatalogs';
import { useCollaboration } from '../../hooks/useCollaboration';
import { usePlanLimits } from '../../hooks/usePlanLimits';
import { useAuthStore } from '../../store/authStore';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { LimitBadge } from '../../components/ui/LimitBadge';
import { UpgradeModal } from '../../components/ui/UpgradeModal';
import { PageHeader } from '../../components/ui/PageHeader';
import { PublicCatalogCard } from '../../components/store/PublicCatalogCard';
import {
  LayoutGrid,
  Plus,
  ExternalLink,
  Trash2,
  Edit3,
  Sparkles,
  Store,
  Search,
  X,
  Compass,
} from 'lucide-react';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Skeleton } from '../../components/ui/Skeleton';
import { useShareStore } from '../../store/shareStore';
import { toast } from 'react-hot-toast';
import { SwipeableShareBanner } from '../../components/products/SwipeableShareBanner';

export const CatalogsPage = () => {
  const { user } = useAuthStore();
  const isCustomer = user?.role === 'customer' || user?.role === 'client';

  const {
    catalogs,
    sharedCatalogs,
    loading: myLoading,
    getCatalogs,
    getSharedCatalogs,
    deleteCatalog,
  } = useCatalogs();

  const {
    publicCatalogs,
    filteredCatalogs,
    loading: publicLoading,
    searchQuery,
    setSearchQuery,
    getPublicCatalogs,
  } = usePublicCatalogs();

  const { pendingMemberInvitations, getPendingMemberInvitations, respondToMemberInvitation } =
    useCollaboration();
  const { limits, counts, canCreateCatalog } = usePlanLimits();
  const { sharedContentList, removeSharedContent } = useShareStore();
  const navigate = useNavigate();

  // Si es cliente, la vista siempre es 'public'
  const [activeTab, setActiveTab] = useState<'public' | 'my'>(isCustomer ? 'public' : 'public');
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [catalogToDelete, setCatalogToDelete] = useState<string | null>(null);

  useEffect(() => {
    getPublicCatalogs();
    if (!isCustomer) {
      getCatalogs();
      getSharedCatalogs();
      getPendingMemberInvitations();
    }
  }, [isCustomer, getPublicCatalogs, getCatalogs, getSharedCatalogs, getPendingMemberInvitations]);

  const handleCreateClick = () => {
    if (canCreateCatalog) {
      navigate('/catalogs/new');
    } else {
      setShowUpgrade(true);
    }
  };

  return (
    <div className="p-3 max-w-lg mx-auto pb-20 space-y-4">
      {/* Encabezado */}
      <PageHeader
        title={isCustomer || activeTab === 'public' ? 'Catálogos Públicos' : 'Tus Catálogos'}
        subtitle={
          isCustomer
            ? 'Explora tiendas y descubre productos'
            : activeTab === 'public'
            ? 'Exploración de tiendas en la plataforma'
            : 'Gestión y administración de tus listas'
        }
        rightAction={
          !isCustomer && activeTab === 'my' ? (
            <Button
              size="sm"
              icon={Plus}
              onClick={handleCreateClick}
              className="shadow-md shadow-accent/20"
            >
              Nuevo
            </Button>
          ) : undefined
        }
      />

      {/* Selector de pestañas para vendedores/administradores */}
      {!isCustomer && (
        <div className="flex p-1 bg-surface border border-border rounded-none gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('public')}
            className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-none transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'public'
                ? 'bg-[var(--accent)] text-[var(--accent-text)] shadow-sm'
                : 'text-secondary hover:text-primary hover:bg-surface-hover'
            }`}
          >
            <Compass size={13} />
            <span>Públicos</span>
            {!publicLoading && publicCatalogs.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-none bg-black/20">
                {publicCatalogs.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('my')}
            className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-none transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'my'
                ? 'bg-[var(--accent)] text-[var(--accent-text)] shadow-sm'
                : 'text-secondary hover:text-primary hover:bg-surface-hover'
            }`}
          >
            <LayoutGrid size={13} />
            <span>Mis Catálogos</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-none bg-black/20">
              {catalogs.length}
            </span>
          </button>
        </div>
      )}

      {/* VISTA 1: CATÁLOGOS PÚBLICOS (Clientes y exploración) */}
      {(isCustomer || activeTab === 'public') && (
        <div className="space-y-3.5">
          {/* Buscador de catálogos */}
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none"
            />
            <input
              type="text"
              placeholder="Buscar por nombre, rubro o eslogan…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2 bg-surface border border-border rounded-none text-xs text-primary placeholder:text-secondary focus:outline-none focus:border-accent transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-secondary hover:text-primary p-0.5"
                aria-label="Limpiar búsqueda"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Estado de carga */}
          {publicLoading && publicCatalogs.length === 0 ? (
            <div className="grid gap-3.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card p-3.5 space-y-3">
                  <Skeleton className="h-28 w-full rounded-card" />
                  <div className="flex gap-2.5 items-center">
                    <Skeleton className="w-10 h-10 rounded-card flex-shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredCatalogs.length === 0 ? (
            <EmptyState
              icon={Store}
              title={searchQuery ? 'No se encontraron resultados' : 'No hay catálogos públicos'}
              description={
                searchQuery
                  ? `No encontramos tiendas que coincidan con "${searchQuery}". Prueba con otro término.`
                  : 'Aún no se han publicado catálogos en la plataforma.'
              }
              actionLabel={searchQuery ? 'Ver todos los catálogos' : undefined}
              onAction={searchQuery ? () => setSearchQuery('') : undefined}
            />
          ) : (
            <div className="grid gap-3.5">
              {filteredCatalogs.map((catalog) => (
                <PublicCatalogCard key={catalog.id} catalog={catalog} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* VISTA 2: MIS CATÁLOGOS (Solo vendedores / admin) */}
      {!isCustomer && activeTab === 'my' && (
        <div className="space-y-3">
          {/* Límite de catálogos */}
          <div>
            <LimitBadge
              current={counts.catalogs}
              limit={limits.catalogs}
              label="Cupo de catálogos"
            />
          </div>

          {/* Invitaciones pendientes de colaboración */}
          {pendingMemberInvitations.length > 0 && (
            <div className="space-y-2 bg-accent/5 border border-accent/15 p-3 rounded-card animate-in slide-in-from-top duration-300">
              <h4 className="text-[9px] font-black uppercase tracking-wider text-accent flex items-center gap-1">
                <Sparkles size={11} />
                Invitaciones a Colaborar ({pendingMemberInvitations.length})
              </h4>
              <div className="space-y-1.5">
                {pendingMemberInvitations.map((inv: any) => (
                  <div
                    key={inv.id}
                    className="flex justify-between items-center bg-surface p-2 rounded-card border border-border"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="font-bold text-primary text-xs truncate">
                        {inv.catalog?.name}
                      </p>
                      <p className="text-secondary text-[10px] truncate">
                        {inv.catalog?.description || 'Sin descripción'}
                      </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        size="sm"
                        className="!py-0.5 px-2.5 text-[10px] h-6"
                        onClick={async () => {
                          const ok = await respondToMemberInvitation(inv.id, 'accepted');
                          if (ok) {
                            getSharedCatalogs();
                          }
                        }}
                      >
                        Aceptar
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="!py-0.5 px-2.5 text-[10px] h-6 border-border hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20"
                        onClick={() => respondToMemberInvitation(inv.id, 'rejected')}
                      >
                        Rechazar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Productos en espera de compartir */}
          {sharedContentList.length > 0 && (
            <div className="space-y-1">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-secondary px-1 mb-0.5 flex justify-between items-center">
                <span>Productos en espera ({sharedContentList.length})</span>
                <span className="text-[8px] lowercase opacity-60">
                  Arrastre a la izquierda para borrar
                </span>
              </p>
              {sharedContentList.map((item, index) => (
                <SwipeableShareBanner
                  key={index}
                  item={item}
                  onRegister={() => {
                    toast.success(
                      'Selecciona un catálogo abajo para registrar el producto',
                      { id: 'select-catalog-toast' }
                    );
                  }}
                  onDelete={() => removeSharedContent(index)}
                />
              ))}
            </div>
          )}

          {/* Lista de catálogos propios */}
          {myLoading && catalogs.length === 0 ? (
            <div className="grid gap-2.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card p-3.5 space-y-2.5">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-3.5 w-1/2" />
                </div>
              ))}
            </div>
          ) : catalogs.length === 0 ? (
            <EmptyState
              icon={LayoutGrid}
              title="No hay catálogos creados"
              description="Crea tu primer catálogo para comenzar a publicar productos y vender."
              actionLabel="Crear catálogo"
              onAction={handleCreateClick}
            />
          ) : (
            <div className="grid gap-2.5">
              {catalogs.map((catalog: any) => (
                <div
                  key={catalog.id}
                  className="card group hover:border-accent/30 transition-all cursor-pointer relative overflow-hidden"
                  onClick={() => navigate(`/catalogs/${catalog.id}`)}
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-accent/10 transition-colors" />

                  <div className="relative flex justify-between items-start gap-2">
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-primary group-hover:text-accent transition-colors truncate">
                        {catalog.name}
                      </h3>
                      <p className="text-secondary text-xs line-clamp-2 pr-4 leading-snug">
                        {catalog.description || 'Sin descripción'}
                      </p>
                    </div>

                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/catalogs/${catalog.id}/edit`);
                        }}
                        className="p-1.5 text-secondary hover:text-primary hover:bg-surface-hover rounded-none transition-colors"
                        aria-label={`Editar catálogo ${catalog.name}`}
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCatalogToDelete(catalog.id);
                        }}
                        className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-none transition-colors"
                        aria-label={`Eliminar catálogo ${catalog.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="pt-3 mt-2.5 border-t border-border flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-secondary">
                    <div className="flex items-center gap-1">
                      <LayoutGrid size={11} />
                      <span className="tabular-nums">
                        {catalog.productCount || 0} Productos
                      </span>
                    </div>
                    <div className="flex items-center gap-1 group-hover:text-accent transition-colors">
                      Abrir Catálogo
                      <ExternalLink size={11} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Catálogos colaborados */}
          {sharedCatalogs.length > 0 && (
            <div className="mt-5 space-y-2.5">
              <h2 className="text-[10px] font-black uppercase tracking-[0.15em] text-secondary px-0.5">
                Catálogos en los que colaboras ({sharedCatalogs.length})
              </h2>
              <div className="grid gap-2.5">
                {sharedCatalogs.map((catalog: any) => (
                  <div
                    key={catalog.id}
                    className="card group hover:border-accent/30 transition-all cursor-pointer relative overflow-hidden"
                    onClick={() => navigate(`/catalogs/${catalog.id}`)}
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full -mr-12 -mt-12 blur-2xl" />

                    <div className="relative flex justify-between items-start">
                      <div className="space-y-0.5 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-bold text-primary group-hover:text-accent transition-colors truncate">
                            {catalog.name}
                          </h3>
                          <span className="text-[8px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-none font-black uppercase tracking-wider">
                            Colaborador
                          </span>
                        </div>
                        <p className="text-secondary text-xs line-clamp-2 pr-4 leading-snug">
                          {catalog.description || 'Sin descripción'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 mt-2.5 border-t border-border flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-secondary">
                      <div className="flex items-center gap-1">
                        <LayoutGrid size={11} />
                        <span className="tabular-nums">
                          {catalog.productCount || 0} Productos
                        </span>
                      </div>
                      <div className="flex items-center gap-1 group-hover:text-accent transition-colors">
                        Abrir Catálogo
                        <ExternalLink size={11} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modales */}
      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        currentPlan={limits.catalogs === 1 ? 'free' : 'basic'}
        reachedLimit="catalogs"
      />

      <ConfirmDialog
        isOpen={!!catalogToDelete}
        onClose={() => setCatalogToDelete(null)}
        onConfirm={async () => {
          if (catalogToDelete) {
            await deleteCatalog(catalogToDelete);
            setCatalogToDelete(null);
          }
        }}
        title="Eliminar Catálogo"
        message="¿Estás seguro de que deseas eliminar este catálogo? Todos los productos, mensajes y secuencias asociadas se perderán permanentemente."
      />
    </div>
  );
};
