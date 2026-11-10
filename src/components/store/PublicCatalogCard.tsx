import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Coins, Package, Store, Settings, Sparkles, Users, Edit3, Trash2 } from 'lucide-react';
import type { PublicCatalogItem } from '../../hooks/usePublicCatalogs';
import type { Catalog } from '../../types/catalog';
import { useAuthStore } from '../../store/authStore';

export interface PublicCatalogCardProps {
  catalog: PublicCatalogItem | (Catalog & { productCount?: number });
  isOwner?: boolean;
  isCollaborator?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const PublicCatalogCard: React.FC<PublicCatalogCardProps> = ({
  catalog,
  isOwner: isOwnerProp,
  isCollaborator: isCollaboratorProp,
  onEdit,
  onDelete,
}) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const storeUrl = `/${catalog.slug || catalog.id}`;
  const configUrl = `/catalogs/${catalog.id}`;

  const isOwner = Boolean(
    isOwnerProp ??
      (user && ((catalog as any).user_id ? (catalog as any).user_id === user.id : false) || user?.role === 'admin')
  );
  const isCollaborator = Boolean(isCollaboratorProp);
  const canConfigure = isOwner || isCollaborator;

  return (
    <div
      onClick={() => navigate(storeUrl)}
      className="group relative flex flex-col bg-surface border border-border hover:border-accent/40 rounded-card overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
    >
      {/* Portada panorámica */}
      <div className="relative h-28 sm:h-32 w-full overflow-hidden bg-surface-hover">
        {catalog.cover_url ? (
          <img
            src={catalog.cover_url}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        ) : (
          <div
            className="w-full h-full bg-gradient-to-br from-surface-hover via-surface to-background flex items-center justify-center opacity-80"
            style={{
              background: catalog.primary_color
                ? `linear-gradient(135deg, ${catalog.primary_color}25 0%, var(--surface) 60%, var(--background) 100%)`
                : undefined,
            }}
          >
            <Store size={28} className="text-secondary/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/30 to-transparent" />

        {/* Badges superiores flotantes */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
          {(catalog as any).enable_affiliates && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-600/90 text-white text-[10px] font-bold backdrop-blur-md shadow-sm">
              <Coins size={11} />
              <span>Afiliados</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-semibold backdrop-blur-md shadow-sm">
            <Package size={11} className="text-[var(--accent)]" />
            <span>
              {catalog.productCount ?? 0} {catalog.productCount === 1 ? 'producto' : 'productos'}
            </span>
          </span>
        </div>
      </div>

      {/* Cuerpo de la tarjeta con logo superpuesto aumentado */}
      <div className="relative px-3.5 pb-3.5 pt-0 flex-1 flex flex-col justify-between">
        <div>
          {/* Fila del logo superpuesto a la portada con badges / acciones */}
          <div className="-mt-10 mb-2.5 flex items-end justify-between gap-2">
            <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl bg-surface ring-4 ring-surface border border-border/80 overflow-hidden shadow-md flex-shrink-0 flex items-center justify-center">
              {catalog.logo_url ? (
                <img
                  src={catalog.logo_url}
                  alt={catalog.name}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center font-display font-black text-2xl sm:text-3xl text-[var(--accent-text)] select-none"
                  style={{
                    backgroundColor: catalog.primary_color || 'var(--accent)',
                  }}
                >
                  {catalog.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Badges de rol o botones de edición directa */}
            <div className="flex items-center gap-1.5 mb-1 flex-shrink-0">
              {isOwner && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-accent/15 border border-accent/30 text-accent text-[10px] font-bold">
                  <Sparkles size={10} />
                  <span>Dueño</span>
                </span>
              )}
              {isCollaborator && !isOwner && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-[10px] font-bold">
                  <Users size={10} />
                  <span>Colaborador</span>
                </span>
              )}

              {/* Botones de acción directa para dueño en gestión */}
              {onEdit && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="p-1.5 text-secondary hover:text-primary hover:bg-surface-hover rounded-lg transition-colors border border-border/60 bg-surface/80"
                  aria-label={`Editar catálogo ${catalog.name}`}
                  title="Editar catálogo"
                >
                  <Edit3 size={13} />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors border border-border/60 bg-surface/80"
                  aria-label={`Eliminar catálogo ${catalog.name}`}
                  title="Eliminar catálogo"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Nombre y eslogan */}
          <h3
            className="font-display text-base font-bold text-primary group-hover:text-accent transition-colors truncate"
            style={{ color: catalog.title_color || undefined }}
          >
            {catalog.name}
          </h3>

          {catalog.slogan ? (
            <p className="text-secondary text-xs mt-1 line-clamp-2 leading-relaxed">
              {catalog.slogan}
            </p>
          ) : catalog.description ? (
            <p className="text-secondary text-xs mt-1 line-clamp-2 leading-relaxed opacity-85">
              {catalog.description}
            </p>
          ) : (
            <p className="text-secondary/60 text-xs mt-1 italic">
              Visita esta tienda para conocer sus ofertas
            </p>
          )}
        </div>

        {/* Footer con los dos botones: "Entrar a tienda" y "Configurar" si es dueño o colaborador */}
        <div className="pt-3 mt-3 border-t border-border flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(storeUrl);
            }}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all active:scale-[0.98] ${
              canConfigure
                ? 'flex-1 bg-surface-hover hover:bg-border/60 text-primary border border-border'
                : 'w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] shadow-sm'
            }`}
          >
            <Store size={14} className={canConfigure ? 'text-secondary' : ''} />
            <span>Entrar a tienda</span>
          </button>

          {canConfigure && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate(configUrl);
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] text-xs font-semibold shadow-sm transition-all active:scale-[0.98]"
            >
              <Settings size={14} />
              <span>Configurar</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
