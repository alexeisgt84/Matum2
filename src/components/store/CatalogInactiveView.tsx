import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Clock, MessageCircle, RefreshCw, Store } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Catalog } from '../../types/catalog';
import type { PublicCatalog } from '../../types/store';

interface CatalogInactiveViewProps {
  catalog: Partial<Catalog> | Partial<PublicCatalog>;
}

interface TimeRemaining {
  total: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const calculateTimeRemaining = (targetIso?: string | null): TimeRemaining | null => {
  if (!targetIso) return null;
  const targetMs = new Date(targetIso).getTime();
  if (Number.isNaN(targetMs)) return null;

  const total = targetMs - Date.now();
  if (total <= 0) {
    return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));

  return { total, days, hours, minutes, seconds };
};

const isLightHex = (hex?: string | null): boolean => {
  if (!hex || !/^#[0-9A-F]{6}$/i.test(hex)) return false;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 >= 150;
};

const pad = (n: number) => String(n).padStart(2, '0');

export const CatalogInactiveView: React.FC<CatalogInactiveViewProps> = ({ catalog }) => {
  const [timeLeft, setTimeLeft] = useState<TimeRemaining | null>(() =>
    calculateTimeRemaining(catalog.reopen_at)
  );

  useEffect(() => {
    setTimeLeft(calculateTimeRemaining(catalog.reopen_at));
    if (!catalog.reopen_at) return;

    const timer = window.setInterval(() => {
      const next = calculateTimeRemaining(catalog.reopen_at);
      setTimeLeft(next);
      if (next && next.total <= 0) {
        window.clearInterval(timer);
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [catalog.reopen_at]);

  const primary = catalog.primary_color || '#ff782e';
  const bg = catalog.background_color || '#0a0a0c';
  const surface = catalog.surface_color || '#141418';
  const lightBg = isLightHex(bg);
  const textPrimary = catalog.text_color || (lightBg ? '#111827' : '#f9fafb');
  const textMuted = lightBg ? 'rgba(17, 24, 39, 0.62)' : 'rgba(249, 250, 251, 0.62)';
  const hairline = lightBg ? 'rgba(17, 24, 39, 0.1)' : 'rgba(255, 255, 255, 0.09)';

  const reopenDate = catalog.reopen_at ? new Date(catalog.reopen_at) : null;
  const hasValidReopenDate = reopenDate && !Number.isNaN(reopenDate.getTime());
  const cleanPhone = catalog.footer_phone ? catalog.footer_phone.replace(/[^\d]/g, '') : '';

  return (
    <div
      style={{ backgroundColor: bg, color: textPrimary }}
      className="relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-between px-5 py-10 font-store selection:bg-white/20"
    >
      {/* Fondo ambiental minimalista */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div
          style={{
            background: `radial-gradient(circle at 50% 25%, ${primary}22 0%, transparent 60%)`,
          }}
          className="absolute inset-0"
        />
        <div
          style={{
            backgroundImage: `linear-gradient(${hairline} 1px, transparent 1px), linear-gradient(90deg, ${hairline} 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(ellipse 70% 55% at 50% 40%, #000 15%, transparent 100%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 70% 55% at 50% 40%, #000 15%, transparent 100%)',
            opacity: 0.45,
          }}
          className="absolute inset-0"
        />
      </div>

      {/* Cabecera de marca */}
      <header className="relative z-10 flex flex-col items-center gap-3 text-center">
        {catalog.logo_url ? (
          <img
            src={catalog.logo_url}
            alt={catalog.name || 'Logo'}
            style={{ borderColor: hairline }}
            className="w-14 h-14 rounded-2xl object-cover border shadow-lg"
          />
        ) : (
          <div
            style={{
              backgroundColor: `${primary}18`,
              borderColor: `${primary}35`,
              color: primary,
            }}
            className="w-14 h-14 rounded-2xl border flex items-center justify-center shadow-lg"
          >
            <Store size={24} />
          </div>
        )}

        <div className="space-y-1.5">
          <p className="text-sm font-semibold tracking-tight">{catalog.name || 'Tienda'}</p>
          <span
            style={{
              backgroundColor: `${primary}14`,
              borderColor: `${primary}30`,
              color: primary,
            }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[11px] font-medium tracking-wide uppercase"
          >
            <span
              style={{ backgroundColor: primary }}
              className="w-1.5 h-1.5 rounded-full animate-pulse"
            />
            En pausa temporal
          </span>
        </div>
      </header>

      {/* Contenido central */}
      <main className="relative z-10 w-full max-w-md my-auto py-10 flex flex-col items-center text-center space-y-8">
        <div className="space-y-4">
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
            Volvemos pronto
          </h1>

          <div
            style={{
              backgroundColor: surface,
              borderColor: hairline,
            }}
            className="rounded-2xl border p-5 sm:p-6 text-left shadow-xl backdrop-blur-md"
          >
            <div className="flex items-start gap-3">
              <div
                style={{ backgroundColor: primary }}
                className="w-1 self-stretch rounded-full shrink-0 opacity-85"
              />
              <p
                style={{ color: textMuted }}
                className="text-sm sm:text-[15px] leading-relaxed whitespace-pre-line"
              >
                {catalog.inactive_reason?.trim() ||
                  'Estamos realizando ajustes y preparando novedades para brindarte una mejor experiencia.'}
              </p>
            </div>
          </div>
        </div>

        {/* Cuenta regresiva */}
        {timeLeft && (
          <div className="w-full space-y-3">
            {timeLeft.total > 0 ? (
              <>
                <div className="grid grid-cols-4 gap-2 sm:gap-3">
                  {[
                    { label: 'Días', value: pad(timeLeft.days) },
                    { label: 'Horas', value: pad(timeLeft.hours) },
                    { label: 'Min', value: pad(timeLeft.minutes) },
                    { label: 'Seg', value: pad(timeLeft.seconds) },
                  ].map((unit) => (
                    <div
                      key={unit.label}
                      style={{
                        backgroundColor: surface,
                        borderColor: hairline,
                      }}
                      className="rounded-2xl border py-3.5 px-2 flex flex-col items-center justify-center shadow-sm"
                    >
                      <span className="font-display text-2xl sm:text-3xl font-bold tabular-nums tracking-tight">
                        {unit.value}
                      </span>
                      <span
                        style={{ color: textMuted }}
                        className="text-[10px] font-semibold uppercase tracking-[0.14em] mt-1"
                      >
                        {unit.label}
                      </span>
                    </div>
                  ))}
                </div>

                {hasValidReopenDate && (
                  <p
                    style={{ color: textMuted }}
                    className="inline-flex items-center justify-center gap-1.5 text-xs"
                  >
                    <Clock size={12} style={{ color: primary }} />
                    <span>
                      Reapertura estimada:{' '}
                      {format(reopenDate, "d 'de' MMMM, HH:mm", { locale: es })}
                    </span>
                  </p>
                )}
              </>
            ) : (
              <div
                style={{
                  backgroundColor: surface,
                  borderColor: `${primary}40`,
                }}
                className="rounded-2xl border p-5 space-y-3"
              >
                <p className="text-sm font-semibold">¡Estamos listos para reabrir!</p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  style={{ backgroundColor: primary }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-md hover:opacity-90 transition-opacity"
                >
                  <RefreshCw size={14} />
                  Actualizar tienda
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Pie discreto */}
      <footer className="relative z-10 flex flex-wrap items-center justify-center gap-3">
        {cleanPhone && (
          <a
            href={`https://wa.me/${cleanPhone}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              backgroundColor: surface,
              borderColor: hairline,
              color: textPrimary,
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-medium hover:opacity-85 transition-opacity"
          >
            <MessageCircle size={14} style={{ color: primary }} />
            Contactar por WhatsApp
          </a>
        )}

        <Link
          to="/"
          style={{ color: textMuted, borderColor: hairline }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border text-xs font-medium hover:opacity-85 transition-opacity"
        >
          <ArrowLeft size={13} />
          Volver a Nazaar
        </Link>
      </footer>
    </div>
  );
};
