import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Coins, Package, Store } from 'lucide-react';
import type { PublicCatalogItem } from '../../hooks/usePublicCatalogs';

interface PublicCatalogCardProps {
  catalog: PublicCatalogItem;
}

export const PublicCatalogCard: React.FC<PublicCatalogCardProps> = ({ catalog }) => {
  const storeUrl = `/${catalog.slug || catalog.id}`;

  return (
    <Link
      to={storeUrl}
      className="group relative flex flex-col bg-surface border border-border hover:border-accent/40 rounded-card overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.99]"
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
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none bg-emerald-600/90 text-white text-[10px] font-bold backdrop-blur-md shadow-sm">
              <Coins size={11} />
              <span>Afiliados</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none bg-black/60 text-white text-[10px] font-semibold backdrop-blur-md shadow-sm">
            <Package size={11} className="text-[var(--accent)]" />
            <span>
              {catalog.productCount ?? 0} {catalog.productCount === 1 ? 'producto' : 'productos'}
            </span>
          </span>
        </div>
      </div>

      {/* Cuerpo de la tarjeta con logo superpuesto */}
      <div className="relative px-3.5 pb-3.5 pt-0 flex-1 flex flex-col justify-between">
        <div>
          {/* Logo superpuesto a la portada */}
          <div className="-mt-6 mb-2 flex items-end justify-between">
            <div className="w-12 h-12 rounded-card bg-surface ring-2 ring-background border border-border overflow-hidden shadow-md flex-shrink-0 flex items-center justify-center">
              {catalog.logo_url ? (
                <img
                  src={catalog.logo_url}
                  alt={catalog.name}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center font-display font-extrabold text-base text-[var(--accent-text)] select-none"
                  style={{
                    backgroundColor: catalog.primary_color || 'var(--accent)',
                  }}
                >
                  {catalog.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>

          {/* Nombre y eslogan */}
          <h3
            className="font-display text-sm sm:text-base font-bold text-primary group-hover:text-accent transition-colors truncate"
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

        {/* Footer con llamada a la acción */}
        <div className="pt-3 mt-3 border-t border-border flex items-center justify-between text-xs">
          <span className="text-[11px] font-semibold text-secondary group-hover:text-primary transition-colors">
            Ver productos
          </span>
          <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-accent group-hover:translate-x-0.5 transition-transform">
            Entrar a tienda
            <ChevronRight size={13} />
          </span>
        </div>
      </div>
    </Link>
  );
};
