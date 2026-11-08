import React from 'react';
import { ArrowLeft, Clock, MapPin, Share2 } from 'lucide-react';
import type { PublicCatalog } from '../../types/store';
import { buildWhatsAppUrl } from '../../lib/whatsapp';
import { WhatsAppIcon } from './SocialIcons';

interface StoreHeroProps {
  catalog: PublicCatalog;
  titleColor?: string;
  vendorPhone: string;
  productCount?: number;
  showBackButton?: boolean;
  onBack: () => void;
  onShare: () => void;
}

/** Cabecera principal de la tienda: portada, logo, nombre, eslogan y acciones. */
export const StoreHero: React.FC<StoreHeroProps> = ({
  catalog,
  titleColor,
  vendorPhone,
  productCount,
  showBackButton = true,
  onBack,
  onShare,
}) => {
  const glassButton =
    'inline-flex items-center justify-center gap-1 h-7 rounded-none bg-black/50 hover:bg-black/70 backdrop-blur-md text-white text-xs font-medium border border-white/15 transition-all active:scale-95 shadow';

  return (
    <header className="relative">
      {/* Portada */}
      <div className="relative h-32 sm:h-44 md:h-52 w-full overflow-hidden">
        {catalog.cover_url ? (
          <img
            src={catalog.cover_url}
            alt=""
            fetchPriority="high"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-[radial-gradient(120%_120%_at_100%_0%,var(--accent-soft)_0%,var(--surface)_45%,var(--background)_100%)]" />
        )}
        {/* Degradado inferior para fundir la portada con el fondo */}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-background via-background/40 to-transparent pointer-events-none" />

        <div className="absolute top-0 inset-x-0 z-10">
          <div className="max-w-6xl mx-auto px-3 pt-[max(0.5rem,env(safe-area-inset-top))] flex items-center justify-between">
            {showBackButton ? (
              <button type="button" onClick={onBack} className={`${glassButton} px-2.5`} aria-label="Volver">
                <ArrowLeft size={13} />
                <span>Volver</span>
              </button>
            ) : (
              <span />
            )}
            <button type="button" onClick={onShare} className={`${glassButton} w-7`} aria-label="Compartir tienda">
              <Share2 size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Identidad */}
      <div className="max-w-6xl mx-auto px-3">
        <div className="flex flex-col md:flex-row md:items-end gap-2.5 md:gap-4 -mt-10 sm:-mt-12 relative z-10">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-card overflow-hidden bg-surface ring-2 ring-background shadow-lg flex-shrink-0">
            {catalog.logo_url ? (
              <img src={catalog.logo_url} alt={`Logo de ${catalog.name}`} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] flex items-center justify-center text-[var(--accent-text)] font-display font-extrabold text-2xl select-none">
                {catalog.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 md:pb-0.5">
            <h1
              style={{ color: titleColor }}
              className="font-display text-xl leading-tight sm:text-2xl font-extrabold tracking-tight break-words"
            >
              {catalog.name}
            </h1>
            {catalog.slogan && (
              <p className="text-secondary text-xs mt-0.5 max-w-2xl leading-relaxed whitespace-pre-line line-clamp-2">
                {catalog.slogan}
              </p>
            )}
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-1.5 md:pb-0.5">
            {vendorPhone && (
              <a
                href={buildWhatsAppUrl(vendorPhone)}
                target="_blank"
                rel="noreferrer"
                className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-none bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition-all active:scale-[0.98] shadow-sm"
              >
                <WhatsAppIcon size={14} />
                Escríbenos
              </a>
            )}
            <button
              type="button"
              onClick={onShare}
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-none bg-surface hover:bg-surface-hover border border-border text-primary text-xs font-semibold transition-all active:scale-[0.98]"
            >
              <Share2 size={13} />
              Compartir
            </button>
          </div>
        </div>

        {/* Datos rápidos */}
        {(catalog.footer_schedule || catalog.footer_address || (productCount ?? 0) > 0) && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            {(productCount ?? 0) > 0 && (
              <span className="inline-flex items-center h-6 px-2 rounded-none bg-surface border border-border text-[11px] font-medium text-secondary">
                {productCount} {productCount === 1 ? 'producto' : 'productos'}
              </span>
            )}
            {catalog.footer_schedule && (
              <span className="inline-flex items-center gap-1 h-6 px-2 rounded-none bg-surface border border-border text-[11px] font-medium text-secondary max-w-full">
                <Clock size={11} className="text-[var(--accent)] flex-shrink-0" />
                <span className="truncate">{catalog.footer_schedule}</span>
              </span>
            )}
            {catalog.footer_address && (
              <span className="inline-flex items-center gap-1 h-6 px-2 rounded-none bg-surface border border-border text-[11px] font-medium text-secondary max-w-full">
                <MapPin size={11} className="text-[var(--accent)] flex-shrink-0" />
                <span className="truncate">{catalog.footer_address}</span>
              </span>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
