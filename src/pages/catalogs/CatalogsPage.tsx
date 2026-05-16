import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCatalogs } from '../../hooks/useCatalogs';
import { usePlanLimits } from '../../hooks/usePlanLimits';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { LimitBadge } from '../../components/ui/LimitBadge';
import { UpgradeModal } from '../../components/ui/UpgradeModal';
import { PageHeader } from '../../components/ui/PageHeader';
import { LayoutGrid, Plus, ExternalLink, Trash2, Edit3 } from 'lucide-react';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Skeleton } from '../../components/ui/Skeleton';

export const CatalogsPage = () => {
  const { catalogs, loading, getCatalogs, deleteCatalog } = useCatalogs();
  const { limits, counts, canCreateCatalog } = usePlanLimits();
  const navigate = useNavigate();
  
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [catalogToDelete, setCatalogToDelete] = useState<string | null>(null);

  useEffect(() => {
    getCatalogs();
  }, [getCatalogs]);

  const handleCreateClick = () => {
    if (canCreateCatalog) {
      navigate('/catalogs/new');
    } else {
      setShowUpgrade(true);
    }
  };

  if (loading && catalogs.length === 0) {
    return (
      <div className="p-4 max-w-lg mx-auto pb-24">
        <PageHeader 
          title="Tus Catálogos" 
          subtitle="Cargando…"
          rightAction={
            <div className="w-24 h-9 bg-surface-hover animate-pulse rounded-lg" />
          }
        />
        <div className="mb-8">
          <Skeleton className="h-6 w-full" />
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
              </div>
              <div className="pt-4 border-t border-border flex justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto pb-24">
      <PageHeader 
        title="Tus Catálogos" 
        subtitle="Gestión de Listas"
        rightAction={
          <Button 
            size="sm" 
            icon={Plus} 
            onClick={handleCreateClick}
            className="shadow-lg shadow-accent/20"
          >
            Nuevo
          </Button>
        }
      />

      <div className="mb-8">
        <LimitBadge 
          current={counts.catalogs} 
          limit={limits.catalogs} 
          label="Cupo de catálogos" 
        />
      </div>

      {catalogs.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="No hay catálogos"
          description="Crea tu primer catálogo para comenzar a enviar productos a tus grupos."
          actionLabel="Empezar ahora"
          onAction={handleCreateClick}
        />
      ) : (
        <div className="grid gap-4">
          {catalogs.map((catalog: any) => (
            <div 
              key={catalog.id} 
              className="card group hover:border-accent/30 transition-all cursor-pointer relative overflow-hidden"
              onClick={() => navigate(`/catalogs/${catalog.id}`)}
            >
              {/* Decorative gradient */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-accent/10 transition-colors" />
              
              <div className="relative flex justify-between items-start">
                <div className="space-y-1 flex-1">
                  <h3 className="text-lg font-bold text-primary group-hover:text-accent transition-colors">
                    {catalog.name}
                  </h3>
                  <p className="text-secondary text-sm line-clamp-2 pr-8 leading-relaxed">
                    {catalog.description || 'Sin descripción'}
                  </p>
                </div>
                
                <div className="flex gap-1">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/catalogs/${catalog.id}/edit`);
                    }}
                    className="p-2 text-secondary hover:text-primary hover:bg-surface-hover rounded-lg transition-colors"
                    aria-label={`Editar catálogo ${catalog.name}`}
                  >
                    <Edit3 size={18} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setCatalogToDelete(catalog.id);
                    }}
                    className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                    aria-label={`Eliminar catálogo ${catalog.name}`}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="pt-6 mt-4 border-t border-border flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-secondary">
                <div className="flex items-center gap-1.5">
                  <LayoutGrid size={12} />
                  <span className="tabular-nums">{catalog.productCount || 0} Productos</span>
                </div>
                <div className="flex items-center gap-1 group-hover:text-accent transition-colors">
                  Abrir Catálogo
                  <ExternalLink size={12} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <UpgradeModal 
        isOpen={showUpgrade} 
        onClose={() => setShowUpgrade(false)}
        currentPlan={limits.catalogs === 1 ? 'free' : 'basic'} // Placeholder logic
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
