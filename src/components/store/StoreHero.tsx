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
    'inline-flex items-center justify-center gap-1.5 h-10 rounded-full bg-black/45 hover:bg-black/65 backdrop-blur-md text-white text-sm font-medium border border-white/15 transition-all active:scale-95 shadow-lg';

  return (
    <header className="relative">
      {/* Portada */}
      <div className="relative h-44 sm:h-60 md:h-72 w-full overflow-hidden">
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
          <div className="max-w-6xl mx-auto px-4 pt-[max(0.75rem,env(safe-area-inset-top))] flex items-center justify-between">
            {showBackButton ? (
              <button type="button" onClick={onBack} className={`${glassButton} px-3.5`} aria-label="Volver">
                <ArrowLeft size={16} />
                <span>Volver</span>
              </button>
            ) : (
              <span />
            )}
            <button type="button" onClick={onShare} className={`${glassButton} w-10`} aria-label="Compartir tienda">
              <Share2 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Identidad */}
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end gap-4 md:gap-6 -mt-14 sm:-mt-16 relative z-10">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden bg-surface ring-4 ring-background shadow-xl flex-shrink-0">
            {catalog.logo_url ? (
              <img src={catalog.logo_url} alt={`Logo de ${catalog.name}`} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] flex items-center justify-center text-[var(--accent-text)] font-display font-extrabold text-4xl select-none">
                {catalog.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 md:pb-1">
            <h1
              style={{ color: titleColor }}
              className="font-display text-[1.75rem] leading-tight sm:text-4xl font-extrabold tracking-tight break-words"
            >
              {catalog.name}
            </h1>
            {catalog.slogan && (
              <p className="text-secondary text-sm sm:text-base mt-1.5 max-w-2xl leading-relaxed whitespace-pre-line line-clamp-3">
                {catalog.slogan}
              </p>
            )}
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2 md:pb-1">
            {vendorPhone && (
              <a
                href={buildWhatsAppUrl(vendorPhone)}
                target="_blank"
                rel="noreferrer"
                className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-all active:scale-[0.98] shadow-md shadow-green-900/20"
              >
                <WhatsAppIcon size={18} />
                Escríbenos
              </a>
            )}
            <button
              type="button"
              onClick={onShare}
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-surface hover:bg-surface-hover border border-border text-primary text-sm font-semibold transition-all active:scale-[0.98]"
            >
              <Share2 size={16} />
              Compartir
            </button>
          </div>
        </div>

        {/* Datos rápidos */}
        {(catalog.footer_schedule || catalog.footer_address || (productCount ?? 0) > 0) && (
          <div className="flex flex-wrap items-center gap-2 mt-4">
            {(productCount ?? 0) > 0 && (
              <span className="inline-flex items-center h-8 px-3 rounded-full bg-surface border border-border text-xs font-medium text-secondary">
                {productCount} {productCount === 1 ? 'producto' : 'productos'}
              </span>
            )}
            {catalog.footer_schedule && (
              <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-surface border border-border text-xs font-medium text-secondary max-w-full">
                <Clock size={13} className="text-[var(--accent)] flex-shrink-0" />
                <span className="truncate">{catalog.footer_schedule}</span>
              </span>
            )}
            {catalog.footer_address && (
              <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-surface border border-border text-xs font-medium text-secondary max-w-full">
                <MapPin size={13} className="text-[var(--accent)] flex-shrink-0" />
                <span className="truncate">{catalog.footer_address}</span>
              </span>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
