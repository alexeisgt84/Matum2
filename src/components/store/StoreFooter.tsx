import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Check, Clock, Coins, Copy, Mail, MapPin, Phone, Settings } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { PublicCatalog } from '../../types/store';
import { buildWhatsAppUrl } from '../../lib/whatsapp';
import { FacebookIcon, InstagramIcon } from './SocialIcons';

interface StoreFooterProps {
  catalog: PublicCatalog;
  slug?: string;
  titleColor?: string;
  hasCatalogRole: boolean;
  affiliate: {
    isLoggedIn: boolean;
    isOwner: boolean;
    status?: 'approved' | 'pending' | 'rejected' | null;
    loading?: boolean;
    onApply: () => Promise<void>;
  };
}

/** Pie de página de la tienda pública. */
export const StoreFooter: React.FC<StoreFooterProps> = ({
  catalog,
  slug,
  titleColor,
  hasCatalogRole,
  affiliate,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [applying, setApplying] = useState(false);
  const desc = catalog.description || '';
  const longDesc = desc.length > 180;

  return (
    <footer className="w-full bg-surface border-t border-border mt-16 py-12 px-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Marca */}
        <div className="space-y-3 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2.5">
            {catalog.logo_url ? (
              <img src={catalog.logo_url} alt="" className="w-9 h-9 rounded-xl object-cover border border-border" />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-[var(--accent)] text-[var(--accent-text)] flex items-center justify-center font-display font-extrabold text-sm">
                {catalog.name.charAt(0).toUpperCase()}
              </div>
            )}
            <h4 className="font-display text-base font-bold" style={{ color: titleColor }}>
              {catalog.name}
            </h4>
          </div>

          {desc && (
            <p className="text-xs text-secondary leading-relaxed whitespace-pre-line">
              {expanded || !longDesc ? desc : `${desc.slice(0, 180)}…`}
              {longDesc && (
                <button
                  type="button"
                  onClick={() => setExpanded(v => !v)}
                  className="ml-1 font-semibold text-[var(--accent)] hover:underline"
                >
                  {expanded ? 'Ver menos' : 'Ver más'}
                </button>
              )}
            </p>
          )}

          {catalog.follow_code && (
            <div className="inline-flex items-center gap-2 text-xs text-secondary pt-1">
              <span>Código de tienda:</span>
              <span className="font-mono bg-background border border-border px-2 py-0.5 rounded-md text-[var(--accent)] font-bold">
                {catalog.follow_code}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(catalog.follow_code || '');
                  toast.success('Código copiado al portapapeles');
                }}
                className="p-1.5 rounded-md hover:bg-surface-hover text-secondary hover:text-primary transition-colors"
                aria-label="Copiar código de tienda"
              >
                <Copy size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Ubicación y horarios */}
        {(catalog.footer_address || catalog.footer_schedule) && (
          <div className="space-y-3">
            <h5 className="text-xs font-semibold text-primary">Ubicación y horarios</h5>
            <ul className="space-y-2.5 text-xs text-secondary">
              {catalog.footer_address && (
                <li className="flex items-start gap-2">
                  <MapPin size={15} className="text-[var(--accent)] flex-shrink-0 mt-0.5" />
                  <span>{catalog.footer_address}</span>
                </li>
              )}
              {catalog.footer_schedule && (
                <li className="flex items-start gap-2">
                  <Clock size={15} className="text-[var(--accent)] flex-shrink-0 mt-0.5" />
                  <span>{catalog.footer_schedule}</span>
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Contacto */}
        {(catalog.footer_phone || catalog.footer_email || catalog.footer_instagram || catalog.footer_facebook) && (
          <div className="space-y-3">
            <h5 className="text-xs font-semibold text-primary">Contacto</h5>
            <ul className="space-y-2.5 text-xs text-secondary">
              {catalog.footer_phone && (
                <li className="flex items-center gap-2">
                  <Phone size={15} className="text-[var(--accent)] flex-shrink-0" />
                  <a href={buildWhatsAppUrl(catalog.footer_phone)} target="_blank" rel="noreferrer" className="hover:text-primary hover:underline">
                    {catalog.footer_phone}
                  </a>
                </li>
              )}
              {catalog.footer_email && (
                <li className="flex items-center gap-2">
                  <Mail size={15} className="text-[var(--accent)] flex-shrink-0" />
                  <a href={`mailto:${catalog.footer_email}`} className="hover:text-primary hover:underline break-all">
                    {catalog.footer_email}
                  </a>
                </li>
              )}
            </ul>

            {(catalog.footer_instagram || catalog.footer_facebook) && (
              <div className="flex items-center gap-2.5 pt-1">
                {catalog.footer_instagram && (
                  <a
                    href={`https://instagram.com/${catalog.footer_instagram.replace(/^@/, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-9 h-9 rounded-full bg-background border border-border flex items-center justify-center text-secondary hover:text-[var(--accent)] hover:border-[var(--accent)]/40 transition-colors"
                    aria-label="Instagram"
                  >
                    <InstagramIcon size={16} />
                  </a>
                )}
                {catalog.footer_facebook && (
                  <a
                    href={`https://facebook.com/${catalog.footer_facebook}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-9 h-9 rounded-full bg-background border border-border flex items-center justify-center text-secondary hover:text-[var(--accent)] hover:border-[var(--accent)]/40 transition-colors"
                    aria-label="Facebook"
                  >
                    <FacebookIcon size={16} />
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* Afiliados y administración */}
        {(catalog.enable_affiliates || hasCatalogRole) && (
          <div className="space-y-5">
            {catalog.enable_affiliates && (
              <div className="space-y-2.5">
                <h5 className="text-xs font-semibold text-primary flex items-center gap-1.5">
                  <Coins size={14} className="text-[var(--accent)]" /> Programa de afiliados
                </h5>
                <p className="text-xs text-secondary leading-relaxed">
                  Gana comisiones compartiendo los productos de esta tienda.
                </p>

                {affiliate.status === 'approved' && (
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                      <Check size={13} /> Afiliado aprobado
                    </span>
                    <div>
                      <Link
                        to="/profile/affiliates"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] hover:underline"
                      >
                        Ver mis ganancias →
                      </Link>
                    </div>
                  </div>
                )}

                {affiliate.status === 'pending' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-500 text-xs font-semibold">
                    <Clock size={13} /> Solicitud en revisión
                  </span>
                )}

                {affiliate.status === 'rejected' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 text-rose-500 text-xs font-semibold">
                    <AlertTriangle size={13} /> Solicitud no aprobada
                  </span>
                )}

                {!affiliate.status && !affiliate.isOwner && (
                  affiliate.isLoggedIn ? (
                    <button
                      type="button"
                      disabled={applying || affiliate.loading}
                      onClick={async () => {
                        setApplying(true);
                        await affiliate.onApply();
                        setApplying(false);
                      }}
                      className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      <Coins size={14} /> {applying ? 'Enviando…' : 'Solicitar ser afiliado'}
                    </button>
                  ) : (
                    <Link
                      to={`/login?redirect=/${slug}`}
                      className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-background hover:bg-surface-hover border border-border text-primary text-xs font-semibold transition-colors"
                    >
                      <Coins size={14} className="text-[var(--accent)]" /> Solicitar ser afiliado
                    </Link>
                  )
                )}
              </div>
            )}

            {hasCatalogRole && (
              <div className="space-y-2">
                <h5 className="text-xs font-semibold text-primary">Administración</h5>
                <div className="flex flex-wrap gap-2">
                  <Link
                    to="/"
                    className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-background hover:bg-surface-hover border border-border text-xs font-semibold text-primary transition-colors"
                  >
                    <ArrowLeft size={13} /> Panel
                  </Link>
                  <Link
                    to={`/catalogs/${catalog.id}`}
                    className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-background hover:bg-surface-hover border border-border text-xs font-semibold text-primary transition-colors"
                  >
                    <Settings size={13} /> Configurar tienda
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-secondary">
        <span>
          © {new Date().getFullYear()} {catalog.name}
        </span>
        <span className="opacity-75">Tienda creada con Matum</span>
      </div>
    </footer>
  );
};
