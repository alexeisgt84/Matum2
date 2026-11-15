import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Store, 
  Search, 
  ShieldAlert, 
  ShieldCheck, 
  Trash2, 
  Lock, 
  Unlock, 
  ExternalLink, 
  Phone, 
  Package, 
  Eye, 
  Calendar, 
  AlertTriangle, 
  Filter, 
  Sparkles,
  Layers,
  ArrowLeft,
  X,
  MessageCircle,
  User as UserIcon,
  RefreshCw,
  Users
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { Switch } from '../../components/ui/Switch';
import { useAdminCatalogStore } from '../../store/adminCatalogStore';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import type { AdminCatalog } from '../../types/catalog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'react-hot-toast';

export const AdminCatalogsPage: React.FC = () => {
  const navigate = useNavigate();
  const { catalogs, loading, getAdminCatalogs, toggleBlockCatalog, deleteCatalogWithAllData } = useAdminCatalogStore();
  const {
    isGlobalCatalogCreationEnabled,
    setGlobalCatalogCreation,
    loading: settingsLoading,
  } = useSystemSettings();
  const [updatingGlobalCreation, setUpdatingGlobalCreation] = useState(false);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'blocked' | 'active' | 'inactive' | 'marketplace'>('all');

  // Estado para modal de bloqueo
  const [blockingCatalog, setBlockingCatalog] = useState<AdminCatalog | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [isBlockingAction, setIsBlockingAction] = useState(false);

  // Estado para modal de eliminación
  const [deletingCatalog, setDeletingCatalog] = useState<AdminCatalog | null>(null);
  const [confirmName, setConfirmName] = useState('');
  const [isDeletingAction, setIsDeletingAction] = useState(false);

  useEffect(() => {
    getAdminCatalogs();
  }, [getAdminCatalogs]);

  // Métricas
  const metrics = useMemo(() => {
    const total = catalogs.length;
    const blocked = catalogs.filter((c) => c.is_blocked).length;
    const active = catalogs.filter((c) => c.is_active && !c.is_blocked).length;
    const totalProducts = catalogs.reduce((acc, c) => acc + (c.product_count || 0), 0);
    return { total, blocked, active, totalProducts };
  }, [catalogs]);

  // Filtrado
  const filteredCatalogs = useMemo(() => {
    return catalogs.filter((cat) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        cat.name.toLowerCase().includes(q) ||
        (cat.slug && cat.slug.toLowerCase().includes(q)) ||
        (cat.owner?.full_name && cat.owner.full_name.toLowerCase().includes(q)) ||
        (cat.owner?.phone && cat.owner.phone.includes(q));

      if (!matchesSearch) return false;

      if (filter === 'blocked') return cat.is_blocked;
      if (filter === 'active') return cat.is_active && !cat.is_blocked;
      if (filter === 'inactive') return !cat.is_active && !cat.is_blocked;
      if (filter === 'marketplace') return cat.catalog_type === 'marketplace';
      return true;
    });
  }, [catalogs, search, filter]);

  // Manejar bloqueo / desbloqueo
  const handleOpenBlockModal = (cat: AdminCatalog) => {
    setBlockingCatalog(cat);
    setBlockReason(cat.blocked_reason || 'Incumplimiento de las políticas de uso de la plataforma');
  };

  const handleConfirmToggleBlock = async () => {
    if (!blockingCatalog) return;
    const nextBlockedState = !blockingCatalog.is_blocked;
    setIsBlockingAction(true);
    const toastId = toast.loading(nextBlockedState ? 'Bloqueando catálogo...' : 'Desbloqueando catálogo...');

    try {
      await toggleBlockCatalog(blockingCatalog.id, nextBlockedState, nextBlockedState ? blockReason : undefined);
      toast.success(
        nextBlockedState
          ? `Catálogo "${blockingCatalog.name}" bloqueado correctamente`
          : `Catálogo "${blockingCatalog.name}" desbloqueado correctamente`,
        { id: toastId }
      );
      setBlockingCatalog(null);
      setBlockReason('');
    } catch (err: any) {
      toast.error(`Error: ${err.message || 'No se pudo completar la operación'}`, { id: toastId });
    } finally {
      setIsBlockingAction(false);
    }
  };

  // Manejar eliminación
  const handleOpenDeleteModal = (cat: AdminCatalog) => {
    setDeletingCatalog(cat);
    setConfirmName('');
  };

  const handleConfirmDelete = async () => {
    if (!deletingCatalog) return;
    if (confirmName.trim().toLowerCase() !== deletingCatalog.name.trim().toLowerCase()) {
      toast.error('El nombre ingresado no coincide con el catálogo');
      return;
    }

    setIsDeletingAction(true);
    const toastId = toast.loading(`Eliminando catálogo "${deletingCatalog.name}" y toda su información...`);

    try {
      const res = await deleteCatalogWithAllData(deletingCatalog.id);
      toast.success(res.message || 'Catálogo eliminado por completo', { id: toastId, duration: 4000 });
      setDeletingCatalog(null);
      setConfirmName('');
      await getAdminCatalogs();
    } catch (err: any) {
      toast.error(`Error al eliminar: ${err.message || 'Error desconocido'}`, { id: toastId });
    } finally {
      setIsDeletingAction(false);
    }
  };

  const handleToggleGlobalCatalogCreation = async (enabled: boolean) => {
    setUpdatingGlobalCreation(true);
    const result = await setGlobalCatalogCreation(enabled);
    if (result.success) {
      toast.success(
        enabled
          ? 'Creación de catálogos activada para los usuarios'
          : 'Creación de catálogos desactivada para los usuarios'
      );
    } else {
      toast.error('Error al actualizar el permiso: ' + (result.error || 'Intente de nuevo'));
    }
    setUpdatingGlobalCreation(false);
  };

  return (
    <div className="p-4 max-w-3xl mx-auto pb-24 space-y-6 animate-in fade-in duration-500">
      {/* Encabezado */}
      <PageHeader
        title="Catálogos"
        subtitle="Gestión, Bloqueo y Eliminación Completa"
        rightAction={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => getAdminCatalogs()}
            className="text-secondary hover:text-primary gap-1"
            title="Refrescar listado"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline text-xs">Actualizar</span>
          </Button>
        }
      />

      {/* Control Global de Creación de Catálogos */}
      <div
        className={`card p-4 border transition-all ${
          isGlobalCatalogCreationEnabled
            ? 'bg-emerald-500/5 border-emerald-500/20'
            : 'bg-red-500/5 border-red-500/30'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`p-2.5 rounded-xl flex-shrink-0 ${
                isGlobalCatalogCreationEnabled
                  ? 'bg-emerald-500/15 text-emerald-500'
                  : 'bg-red-500/15 text-red-500'
              }`}
            >
              {isGlobalCatalogCreationEnabled ? <Store size={18} /> : <Lock size={18} />}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-primary">
                  Creación de Catálogos por Usuarios
                </h3>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    isGlobalCatalogCreationEnabled
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                      : 'bg-red-500/10 text-red-500 border-red-500/20'
                  }`}
                >
                  {isGlobalCatalogCreationEnabled ? 'Activada' : 'Desactivada'}
                </span>
              </div>
              <p className="text-xs text-secondary leading-relaxed">
                {isGlobalCatalogCreationEnabled
                  ? 'Los usuarios pueden crear nuevos catálogos según los límites de su plan.'
                  : 'Ningún usuario (salvo administradores) puede crear nuevos catálogos. Sus catálogos existentes siguen activos.'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50 flex-shrink-0">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={Users}
              onClick={() => navigate('/admin/users')}
              className="text-xs"
            >
              Permisos por usuario
            </Button>
            <Switch
              checked={isGlobalCatalogCreationEnabled}
              onChange={handleToggleGlobalCatalogCreation}
              disabled={settingsLoading || updatingGlobalCreation}
            />
          </div>
        </div>
      </div>

      {/* Tarjetas de Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-3.5 space-y-1 bg-surface border-border">
          <div className="flex items-center justify-between text-secondary">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total</span>
            <Layers size={14} className="text-primary" />
          </div>
          <p className="text-2xl font-black text-primary">{metrics.total}</p>
          <span className="text-[11px] text-secondary">Catálogos creados</span>
        </div>

        <div className="card p-3.5 space-y-1 bg-surface border-border">
          <div className="flex items-center justify-between text-secondary">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Activos</span>
            <ShieldCheck size={14} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-500">{metrics.active}</p>
          <span className="text-[11px] text-secondary">En funcionamiento</span>
        </div>

        <div className={`card p-3.5 space-y-1 border ${metrics.blocked > 0 ? 'bg-red-500/5 border-red-500/30' : 'bg-surface border-border'}`}>
          <div className="flex items-center justify-between text-secondary">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-red-500">Bloqueados</span>
            <ShieldAlert size={14} className="text-red-500" />
          </div>
          <p className="text-2xl font-black text-red-500">{metrics.blocked}</p>
          <span className="text-[11px] text-secondary">Suspendidos</span>
        </div>

        <div className="card p-3.5 space-y-1 bg-surface border-border">
          <div className="flex items-center justify-between text-secondary">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Productos</span>
            <Package size={14} className="text-[var(--accent)]" />
          </div>
          <p className="text-2xl font-black text-[var(--accent)]">{metrics.totalProducts}</p>
          <span className="text-[11px] text-secondary">Alojados en total</span>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="space-y-3">
        <Input
          type="text"
          placeholder="Buscar catálogo por nombre, enlace, propietario o teléfono..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={Search}
        />

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              filter === 'all'
                ? 'bg-primary text-background shadow-sm'
                : 'bg-surface hover:bg-surface-hover text-secondary border border-border'
            }`}
          >
            Todos ({catalogs.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('blocked')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              filter === 'blocked'
                ? 'bg-red-500 text-white shadow-sm shadow-red-500/20'
                : 'bg-surface hover:bg-surface-hover text-red-400 border border-border'
            }`}
          >
            <ShieldAlert size={12} />
            <span>Bloqueados ({metrics.blocked})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              filter === 'active'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'bg-surface hover:bg-surface-hover text-secondary border border-border'
            }`}
          >
            Activos ({metrics.active})
          </button>
          <button
            type="button"
            onClick={() => setFilter('inactive')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              filter === 'inactive'
                ? 'bg-secondary text-background shadow-sm'
                : 'bg-surface hover:bg-surface-hover text-secondary border border-border'
            }`}
          >
            Inactivos
          </button>
          <button
            type="button"
            onClick={() => setFilter('marketplace')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${
              filter === 'marketplace'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'bg-surface hover:bg-surface-hover text-amber-500 border border-border'
            }`}
          >
            <Sparkles size={11} />
            <span>Nazaar</span>
          </button>
        </div>
      </div>

      {/* Listado de Catálogos */}
      {loading && catalogs.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-4 space-y-3">
              <div className="flex gap-3">
                <Skeleton className="w-16 h-16 rounded-xl flex-shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredCatalogs.length === 0 ? (
        <EmptyState
          icon={Store}
          title={search ? 'No se encontraron catálogos' : 'No hay catálogos en esta sección'}
          description={
            search
              ? `No se hallaron resultados para "${search}". Prueba con otros términos.`
              : 'No hay catálogos que coincidan con el filtro seleccionado.'
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredCatalogs.map((catalog) => {
            const isBlocked = Boolean(catalog.is_blocked);
            const storeUrl = `/${catalog.slug || catalog.id}`;
            const ownerPhone = catalog.owner?.phone || catalog.footer_phone || '';
            const ownerName = catalog.owner?.full_name || 'Sin nombre registrado';

            return (
              <div
                key={catalog.id}
                className={`card p-4 transition-all duration-200 border relative overflow-hidden ${
                  isBlocked
                    ? 'bg-red-500/5 border-red-500/30 ring-1 ring-red-500/20'
                    : 'bg-surface hover:border-border/80 border-border'
                }`}
              >
                {/* Banner de bloqueo si está bloqueado */}
                {isBlocked && (
                  <div className="mb-3 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2.5">
                    <ShieldAlert size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-bold text-red-500">Catálogo Bloqueado por Administración</p>
                      {catalog.blocked_reason && (
                        <p className="text-red-400 text-[11px] mt-0.5 leading-relaxed">
                          Motivo: {catalog.blocked_reason}
                        </p>
                      )}
                      {catalog.blocked_at && (
                        <p className="text-secondary text-[10px] mt-1 opacity-80">
                          Fecha de bloqueo: {format(new Date(catalog.blocked_at), "d 'de' MMMM, yyyy HH:mm", { locale: es })}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4 items-start justify-between">
                  {/* Info del Catálogo e Imagen */}
                  <div className="flex gap-3.5 min-w-0 flex-1">
                    {/* Logo / Portada */}
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-surface-hover border border-border overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {catalog.logo_url ? (
                        <img
                          src={catalog.logo_url}
                          alt={catalog.name}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center font-display font-black text-xl text-white select-none"
                          style={{ backgroundColor: catalog.primary_color || 'var(--accent)' }}
                        >
                          {catalog.name.charAt(0).toUpperCase()}
                        </div>
                      )}

                      {/* Mini badge flotante de tipo */}
                      {catalog.catalog_type === 'marketplace' && (
                        <span className="absolute bottom-0 inset-x-0 bg-amber-500 text-slate-950 font-black text-[8px] text-center py-0.5 uppercase tracking-wider">
                          Nazaar
                        </span>
                      )}
                    </div>

                    {/* Datos */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-sm sm:text-base text-primary leading-tight truncate">
                          {catalog.name}
                        </h3>

                        {isBlocked ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold">
                            <Lock size={9} /> Bloqueado
                          </span>
                        ) : catalog.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-hover text-secondary border border-border text-[10px]">
                            Inactivo
                          </span>
                        )}

                        {catalog.is_public && (
                          <span className="text-[10px] text-secondary font-medium px-1.5 py-0.5 bg-surface-hover rounded-md">
                            Público
                          </span>
                        )}
                      </div>

                      {/* Slug / enlace */}
                      <p className="text-xs text-secondary font-mono flex items-center gap-1 truncate">
                        <span>/{catalog.slug || catalog.id}</span>
                        <a
                          href={storeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[var(--accent)] hover:underline inline-flex items-center gap-0.5 ml-1"
                          title="Ver tienda en vivo"
                        >
                          <ExternalLink size={12} />
                        </a>
                      </p>

                      {/* Datos del Propietario */}
                      <div className="pt-1.5 flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-secondary">
                        <div className="flex items-center gap-1 truncate">
                          <UserIcon size={12} className="text-secondary/70 flex-shrink-0" />
                          <span className="text-primary font-medium truncate max-w-[150px]">{ownerName}</span>
                          {catalog.owner?.plan && (
                            <span className="uppercase text-[9px] px-1.5 py-0.2 rounded bg-surface-hover border border-border font-bold text-secondary">
                              {catalog.owner.plan}
                            </span>
                          )}
                        </div>

                        {ownerPhone && (
                          <div className="flex items-center gap-1">
                            <Phone size={12} className="text-secondary/70 flex-shrink-0" />
                            <a
                              href={`https://wa.me/${ownerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                                `Hola ${ownerName}, te contacto desde la administración de Nazaar con relación a tu catálogo "${catalog.name}".`
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-500 hover:underline flex items-center gap-0.5 font-mono"
                              title="Contactar al dueño por WhatsApp"
                            >
                              <span>{ownerPhone}</span>
                              <MessageCircle size={11} />
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Métricas secundarias */}
                      <div className="pt-1 flex items-center gap-3 text-[11px] text-secondary">
                        <span className="flex items-center gap-1">
                          <Package size={12} className="text-[var(--accent)]" />
                          <strong className="text-primary font-semibold">{catalog.product_count ?? 0}</strong> productos
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye size={12} />
                          <strong className="text-primary font-semibold">{catalog.views_count ?? 0}</strong> visitas
                        </span>
                        <span className="flex items-center gap-1 hidden sm:inline-flex">
                          <Calendar size={12} />
                          {format(new Date(catalog.created_at), 'd MMM yyyy', { locale: es })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Acciones Administrativas */}
                  <div className="flex sm:flex-col gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-border justify-end flex-shrink-0">
                    {/* Botón Bloquear / Desbloquear */}
                    <Button
                      size="sm"
                      variant={isBlocked ? 'secondary' : 'ghost'}
                      onClick={() => handleOpenBlockModal(catalog)}
                      className={`text-xs h-8 px-3 gap-1.5 justify-center flex-1 sm:flex-initial ${
                        isBlocked
                          ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border-emerald-500/20'
                          : 'hover:bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      }`}
                    >
                      {isBlocked ? (
                        <>
                          <Unlock size={13} />
                          <span>Desbloquear</span>
                        </>
                      ) : (
                        <>
                          <Lock size={13} />
                          <span>Bloquear</span>
                        </>
                      )}
                    </Button>

                    {/* Botón Eliminar con toda la información */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenDeleteModal(catalog)}
                      className="text-xs h-8 px-3 gap-1.5 justify-center text-red-500 hover:bg-red-500/10 border border-red-500/20 flex-1 sm:flex-initial"
                      title="Eliminar catálogo y toda su información"
                    >
                      <Trash2 size={13} />
                      <span>Eliminar</span>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Bloquear / Desbloquear Catálogo */}
      <Modal
        isOpen={Boolean(blockingCatalog)}
        onClose={() => !isBlockingAction && setBlockingCatalog(null)}
        title={
          blockingCatalog?.is_blocked
            ? `¿Desbloquear "${blockingCatalog?.name}"?`
            : `Bloquear Catálogo "${blockingCatalog?.name}"`
        }
      >
        <div className="space-y-4">
          {blockingCatalog?.is_blocked ? (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2">
              <p className="text-xs text-primary leading-relaxed">
                Al desbloquear este catálogo, volverá a estar disponible para su propietario y sus visitantes podrán
                acceder a la tienda pública normalmente.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1 text-xs">
                <p className="font-bold text-amber-500 flex items-center gap-1.5">
                  <AlertTriangle size={14} /> Efectos del bloqueo:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-secondary pl-1">
                  <li>La tienda pública mostrará un aviso de suspensión/bloqueo.</li>
                  <li>No se podrán realizar pedidos ni ver fichas de productos.</li>
                  <li>El propietario no podrá reactivarlo hasta que sea desbloqueado por un administrador.</li>
                </ul>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-primary">Motivo del bloqueo (opcional pero recomendado):</label>
                <textarea
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Ej: Contenido inapropiado, productos no permitidos, petición del dueño..."
                  className="w-full bg-surface border border-border rounded-xl p-2.5 text-xs text-primary outline-none focus:border-[var(--accent)] min-h-[80px]"
                />
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="ghost"
              onClick={() => setBlockingCatalog(null)}
              disabled={isBlockingAction}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              variant={blockingCatalog?.is_blocked ? 'primary' : 'secondary'}
              onClick={handleConfirmToggleBlock}
              disabled={isBlockingAction}
              className={`text-xs ${
                !blockingCatalog?.is_blocked ? '!bg-red-500 hover:!bg-red-600 !text-white' : ''
              }`}
            >
              {isBlockingAction
                ? 'Procesando...'
                : blockingCatalog?.is_blocked
                ? 'Confirmar Desbloqueo'
                : 'Confirmar Bloqueo'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL: Eliminar Catálogo con Toda la Información */}
      <Modal
        isOpen={Boolean(deletingCatalog)}
        onClose={() => !isDeletingAction && setDeletingCatalog(null)}
        title="⚠️ Eliminar Catálogo Definitivamente"
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl space-y-2">
            <p className="text-xs font-bold text-red-500 flex items-center gap-1.5">
              <AlertTriangle size={15} /> Acción destructiva e irreversible
            </p>
            <p className="text-xs text-primary leading-relaxed">
              Estás a punto de eliminar permanentemente el catálogo{' '}
              <strong className="text-red-400 font-bold">"{deletingCatalog?.name}"</strong>.
            </p>
            <div className="text-[11px] text-secondary space-y-1 pt-1 border-t border-red-500/20">
              <p className="font-semibold text-primary">Se eliminará toda la información vinculada:</p>
              <ul className="list-disc list-inside space-y-0.5 pl-1">
                <li>
                  <strong className="text-primary">{deletingCatalog?.product_count ?? 0} productos</strong> creados en este catálogo.
                </li>
                <li>Todas las categorías personalizadas.</li>
                <li>Colaboradores vinculados y miembros del catálogo.</li>
                <li>Seguidores y solicitudes de seguimiento.</li>
                <li>Enlaces de afiliados y registro de comisiones generadas.</li>
                <li>Estadísticas de visualizaciones y registro de tráfico.</li>
                <li>Mensajes programados en cola para WhatsApp.</li>
              </ul>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-primary">
              Para confirmar, escribe exactamente el nombre del catálogo:{' '}
              <span className="font-mono text-red-400 select-all font-bold">
                {deletingCatalog?.name}
              </span>
            </label>
            <Input
              type="text"
              placeholder={deletingCatalog?.name}
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              className="font-medium"
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="ghost"
              onClick={() => setDeletingCatalog(null)}
              disabled={isDeletingAction}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={
                isDeletingAction ||
                confirmName.trim().toLowerCase() !== deletingCatalog?.name.trim().toLowerCase()
              }
              className="!bg-red-600 hover:!bg-red-700 !text-white text-xs gap-1.5 disabled:opacity-50"
            >
              <Trash2 size={13} />
              <span>{isDeletingAction ? 'Eliminando todo...' : 'Eliminar Todo Definitivamente'}</span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
