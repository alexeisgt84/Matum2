import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCatalogs } from '../../hooks/useCatalogs';
import { useCollaboration } from '../../hooks/useCollaboration';
import { usePlanLimits } from '../../hooks/usePlanLimits';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import { useProfile } from '../../hooks/useProfile';
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
  Sparkles,
  Lock,
  AlertCircle,
  ShoppingBag,
  Users,
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

  const { pendingMemberInvitations, getPendingMemberInvitations, respondToMemberInvitation } =
    useCollaboration();
  const { limits, counts, canCreateCatalog, loading: limitsLoading } = usePlanLimits();
  const { checkUserCatalogCreation } = useSystemSettings();
  const { profile } = useProfile();
  const { sharedContentList, removeSharedContent } = useShareStore();
  const navigate = useNavigate();

  const creationCheck = checkUserCatalogCreation(user, profile?.can_create_catalogs);
  const isCreationAllowedByAdmin = creationCheck.allowed;

  const [showUpgrade, setShowUpgrade] = useState(false);
  const [catalogToDelete, setCatalogToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      if (!isCustomer) {
        getCatalogs();
        getPendingMemberInvitations();
      }
      getSharedCatalogs();
    }
  }, [user, isCustomer, getCatalogs, getSharedCatalogs, getPendingMemberInvitations]);

  const handleCreateClick = () => {
    if (!isCreationAllowedByAdmin) {
      toast.error(
        creationCheck.message || 'La creación de catálogos está desactivada por el administrador.'
      );
      return;
    }
    if (canCreateCatalog) {
      navigate('/catalogs/new');
    } else {
      setShowUpgrade(true);
    }
  };

  const operationalStats = [
    {
      label: 'Catálogos',
      current: counts.catalogs,
      limit: limits.catalogs,
      icon: LayoutGrid,
      color: 'text-accent',
      bg: 'bg-accent/10',
    },
    {
      label: 'Productos',
      current: counts.products,
      limit: limits.products,
      icon: ShoppingBag,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
    },
    {
      label: 'Grupos WA',
      current: counts.groups,
      limit: limits.groups,
      icon: Users,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
  ];

  return (
    <div className="p-4 max-w-lg mx-auto pb-24 space-y-5">
      {/* Encabezado */}
      <PageHeader
        title="Mis Catálogos"
        subtitle="Gestión y administración de tus tiendas"
        rightAction={
          !isCustomer ? (
            <Button
              size="sm"
              icon={isCreationAllowedByAdmin ? Plus : Lock}
              onClick={handleCreateClick}
              disabled={!isCreationAllowedByAdmin}
              title={
                !isCreationAllowedByAdmin
                  ? creationCheck.message || 'Creación desactivada por el administrador'
                  : undefined
              }
              className="shadow-md shadow-accent/20"
            >
              Nuevo
            </Button>
          ) : undefined
        }
      />

      <div className="space-y-3.5">
        {/* Resumen Operativo y Cupos del Plan */}
        {!isCustomer && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2.5">
              {operationalStats.map((stat) => (
                <div
                  key={stat.label}
                  className="card p-3 flex flex-col items-center gap-1.5 text-center border-border hover:border-accent/30 transition-colors"
                >
                  <div className={`p-2 rounded-xl ${stat.bg} ${stat.color}`}>
                    <stat.icon size={17} />
                  </div>
                  <div className="space-y-0.5 w-full flex flex-col items-center">
                    {limitsLoading ? (
                      <Skeleton className="h-5 w-10 mb-0.5" />
                    ) : (
                      <span className="text-sm font-black text-primary tabular-nums block">
                        {stat.current}
                        <span className="text-[11px] font-normal text-secondary">/{stat.limit}</span>
                      </span>
                    )}
                    <span className="text-[9px] font-bold uppercase tracking-wider text-secondary">
                      {stat.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <LimitBadge
              current={counts.catalogs}
              limit={limits.catalogs}
              label="Cupo de catálogos"
            />
          </div>
        )}

        {/* Aviso si la creación de catálogos está desactivada */}
        {!isCustomer && !isCreationAllowedByAdmin && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 animate-in fade-in duration-300">
            <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs space-y-0.5">
              <p className="font-bold text-amber-500">Creación de catálogos desactivada</p>
              <p className="text-secondary leading-relaxed">
                {creationCheck.message ||
                  'La creación de nuevos catálogos está desactivada por el administrador.'}{' '}
                Tus catálogos existentes siguen funcionando con normalidad.
              </p>
            </div>
          </div>
        )}

        {/* Invitaciones pendientes de colaboración */}
        {!isCustomer && pendingMemberInvitations.length > 0 && (
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
          isCustomer ? (
            <EmptyState
              icon={LayoutGrid}
              title="Aún no tienes tiendas propias"
              description="Explora los catálogos públicos de la plataforma para descubrir productos y ofertas."
              actionLabel="Explorar tiendas públicas"
              onAction={() => navigate('/')}
            />
          ) : (
            <EmptyState
              icon={LayoutGrid}
              title="No hay catálogos creados"
              description="Crea tu primer catálogo para comenzar a publicar productos y vender."
              actionLabel="Crear catálogo"
              onAction={handleCreateClick}
              actionDisabled={!isCreationAllowedByAdmin}
              actionNotice={
                !isCreationAllowedByAdmin
                  ? creationCheck.message ||
                    'La creación de catálogos está desactivada por el administrador.'
                  : undefined
              }
            />
          )
        ) : (
          <div className="grid gap-3.5">
            {catalogs.map((catalog: any) => (
              <PublicCatalogCard
                key={catalog.id}
                catalog={catalog}
                isOwner={true}
                onEdit={() => navigate(`/catalogs/${catalog.id}/edit`)}
                onDelete={() => setCatalogToDelete(catalog.id)}
              />
            ))}
          </div>
        )}

        {/* Catálogos colaborados */}
        {sharedCatalogs.length > 0 && (
          <div className="mt-5 space-y-2.5">
            <h2 className="text-[10px] font-black uppercase tracking-[0.15em] text-secondary px-0.5">
              Catálogos en los que colaboras ({sharedCatalogs.length})
            </h2>
            <div className="grid gap-3.5">
              {sharedCatalogs.map((catalog: any) => (
                <PublicCatalogCard
                  key={catalog.id}
                  catalog={catalog}
                  isCollaborator={true}
                />
              ))}
            </div>
          </div>
        )}
      </div>

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
