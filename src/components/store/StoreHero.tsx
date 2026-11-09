import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Clock, Coins, LogIn, MapPin, Share2, UserPlus } from 'lucide-react';
import type { PublicCatalog } from '../../types/store';
import { useAuthStore } from '../../store/authStore';
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
  affiliate?: {
    isLoggedIn: boolean;
    isOwner: boolean;
    status?: 'approved' | 'pending' | 'rejected' | null;
    loading?: boolean;
    onApply: () => Promise<void>;
  };
}

/** Cabecera principal de la tienda: portada compacta, identidad, comprador/afiliación y acciones. */
export const StoreHero: React.FC<StoreHeroProps> = ({
  catalog,
  titleColor,
  vendorPhone,
  productCount,
  showBackButton = true,
  onBack,
  onShare,
  affiliate,
}) => {
  const { user } = useAuthStore();
  const glassButton =
    'inline-flex items-center justify-center gap-1.5 h-7 rounded-full bg-black/55 hover:bg-black/75 backdrop-blur-md text-white text-xs font-medium border border-white/20 transition-all active:scale-95 shadow';

  const redirectPath = encodeURIComponent(`/${catalog.slug || catalog.id}`);

  return (
    <header className="relative">
      {/* Portada compacta / fondo */}
      <div className="relative h-28 sm:h-36 md:h-40 w-full overflow-hidden">
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
          <div className="max-w-6xl mx-auto px-3 sm:px-4 pt-[max(0.5rem,env(safe-area-inset-top))] flex items-center justify-between gap-2">
            {showBackButton ? (
              <button type="button" onClick={onBack} className={`${glassButton} px-2.5`} aria-label="Volver">
                <ArrowLeft size={13} />
                <span>Volver</span>
              </button>
            ) : (
              <span />
            )}

            {/* Acciones de usuario / afiliación en la cabecera superior */}
            <div className="flex items-center gap-1.5">
              {!user ? (
                <>
                  <Link
                    to={`/login?redirect=${redirectPath}`}
                    className={`${glassButton} px-2.5`}
                    aria-label="Iniciar sesión"
                  >
                    <LogIn size={12} />
                    <span>Entrar</span>
                  </Link>
                  <Link
                    to={`/register?redirect=${redirectPath}`}
                    className="inline-flex items-center justify-center gap-1 h-7 px-2.5 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] text-xs font-semibold backdrop-blur-md border border-[var(--accent)] transition-all active:scale-95 shadow"
                    aria-label="Registrarse"
                  >
                    <UserPlus size={12} />
                    <span>Registrar</span>
                  </Link>
                </>
              ) : (
                <>
                  {/* Botón de Afiliación (si el catálogo lo permite) */}
                  {catalog.enable_affiliates && (
                    <>
                      {affiliate?.status === 'approved' ? (
                        <Link
                          to="/profile/affiliates"
                          className="inline-flex items-center justify-center gap-1 h-7 px-2.5 rounded-full bg-emerald-600/90 hover:bg-emerald-600 text-white text-[11px] font-semibold backdrop-blur-md border border-emerald-400/30 transition-all active:scale-95 shadow"
                          title="Ver programa de afiliados"
                        >
                          <Coins size={12} />
                          <span>Afiliado</span>
                        </Link>
                      ) : affiliate?.status === 'pending' ? (
                        <span className="inline-flex items-center justify-center gap-1 h-7 px-2 rounded-full bg-amber-500/85 text-white text-[11px] font-medium backdrop-blur-md border border-amber-300/30">
                          <Clock size={11} />
                          <span className="hidden sm:inline">Revisión</span>
                        </span>
                      ) : !affiliate?.isOwner ? (
                        <button
                          type="button"
                          disabled={affiliate?.loading}
                          onClick={affiliate?.onApply}
                          className="inline-flex items-center justify-center gap-1 h-7 px-2.5 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] text-[11px] font-semibold backdrop-blur-md border border-[var(--accent)] transition-all active:scale-95 shadow disabled:opacity-60"
                          title="Solicitar ser afiliado para ganar comisiones"
                        >
                          <Coins size={12} />
                          <span>{affiliate?.loading ? 'Enviando…' : 'Afiliación'}</span>
                        </button>
                      ) : null}
                    </>
                  )}

                  {/* Datos del comprador */}
                  <Link
                    to="/profile"
                    className={`${glassButton} px-2 max-w-[140px] sm:max-w-[200px]`}
                    title={`Comprador: ${user.nombre || user.phone}`}
                  >
                    <div className="w-4 h-4 rounded-full bg-[var(--accent)] text-[var(--accent-text)] flex items-center justify-center text-[9px] font-extrabold flex-shrink-0 overflow-hidden">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        (user.nombre?.charAt(0) || user.phone?.charAt(0) || 'U').toUpperCase()
                      )}
                    </div>
                    <span className="truncate text-[11px] font-medium text-white/95">
                      {user.nombre?.split(' ')[0] || user.phone}
                    </span>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Identidad de la tienda */}
      <div className="max-w-6xl mx-auto px-3 sm:px-4">
        <div className="flex flex-col md:flex-row md:items-end gap-3 md:gap-5 -mt-10 sm:-mt-12 md:-mt-14 relative z-10">
          {/* Logo prominente */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-card overflow-hidden bg-surface ring-4 ring-background shadow-xl flex-shrink-0">
            {catalog.logo_url ? (
              <img src={catalog.logo_url} alt={`Logo de ${catalog.name}`} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] flex items-center justify-center text-[var(--accent-text)] font-display font-extrabold text-2xl sm:text-3xl md:text-4xl select-none">
                {catalog.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Nombre y eslogan */}
          <div className="flex-1 min-w-0 md:pb-1">
            <h1
              style={{ color: titleColor }}
              className="font-display text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight break-words"
            >
              {catalog.name}
            </h1>
            {catalog.slogan && (
              <p className="text-secondary text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed whitespace-pre-line line-clamp-2 sm:line-clamp-3">
                {catalog.slogan}
              </p>
            )}
          </div>

          {/* Acciones de contacto y compartir */}
          <div className="flex items-center gap-2 md:pb-1">
            {vendorPhone && (
              <a
                href={buildWhatsAppUrl(vendorPhone)}
                target="_blank"
                rel="noreferrer"
                className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 h-8 sm:h-9 px-3.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm font-semibold transition-all active:scale-[0.98] shadow-sm"
              >
                <WhatsAppIcon size={14} />
                Escríbenos
              </a>
            )}
            <button
              type="button"
              onClick={onShare}
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 h-8 sm:h-9 px-3.5 rounded-lg bg-surface hover:bg-surface-hover border border-border text-primary text-xs sm:text-sm font-semibold transition-all active:scale-[0.98]"
            >
              <Share2 size={13} />
              Compartir
            </button>
          </div>
        </div>

        {/* Datos rápidos */}
        {(catalog.footer_schedule || catalog.footer_address || (productCount ?? 0) > 0) && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {(productCount ?? 0) > 0 && (
              <span className="inline-flex items-center h-5.5 px-2 rounded-md bg-surface border border-border text-[11px] font-medium text-secondary">
                {productCount} {productCount === 1 ? 'producto' : 'productos'}
              </span>
            )}
            {catalog.footer_schedule && (
              <span className="inline-flex items-center gap-1 h-5.5 px-2 rounded-md bg-surface border border-border text-[11px] font-medium text-secondary max-w-full">
                <Clock size={11} className="text-[var(--accent)] flex-shrink-0" />
                <span className="truncate">{catalog.footer_schedule}</span>
              </span>
            )}
            {catalog.footer_address && (
              <span className="inline-flex items-center gap-1 h-5.5 px-2 rounded-md bg-surface border border-border text-[11px] font-medium text-secondary max-w-full">
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
