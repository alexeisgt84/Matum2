import React from 'react';
import { Link } from 'react-router-dom';
import {
  Store,
  TrendingUp,
  ShieldCheck,
  Sparkles,
  ChevronDown,
  Phone,
  ArrowRight,
  Compass,
} from 'lucide-react';
import type { Country } from '../../constants/countries';

interface AuthLayoutProps {
  activeTab?: 'login' | 'register' | 'forgot';
  title: string;
  subtitle: string;
  redirect?: string | null;
  badges?: Array<{ label: string; icon?: React.ReactNode }>;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  activeTab = 'login',
  title,
  subtitle,
  redirect,
  badges,
  children,
  footer,
}) => {
  const loginHref = redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login';
  const registerHref = redirect ? `/register?redirect=${encodeURIComponent(redirect)}` : '/register';

  return (
    <div className="min-h-screen bg-background text-primary relative overflow-hidden flex flex-col justify-between p-3 sm:p-6 lg:p-8 font-store">
      {/* Halos radiales ambientales ("Cosmic Aura") */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-36 -left-24 w-96 h-96 rounded-full bg-[var(--accent)]/15 blur-[110px]" />
        <div className="absolute -bottom-36 -right-24 w-[28rem] h-[28rem] rounded-full bg-indigo-500/15 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: 'radial-gradient(var(--text-primary) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      {/* Barra superior compacta */}
      <header className="relative z-10 w-full max-w-5xl mx-auto flex items-center justify-between py-1.5 mb-3 lg:mb-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2.5 group focus:outline-none"
        >
          <div className="w-8 h-8 rounded-xl bg-[var(--accent)]/15 border border-[var(--accent)]/30 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
            <img
              src="/icon.png"
              alt="Nazaar"
              className="w-5 h-5 object-contain"
              draggable={false}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-display text-sm sm:text-base font-extrabold tracking-tight text-primary">
              Nazaar
            </span>
            <span className="hidden xs:inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/25">
              Social Store
            </span>
          </div>
        </Link>

        <Link
          to="/"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-secondary hover:text-primary bg-surface/80 hover:bg-surface-hover border border-border transition-all shadow-sm"
        >
          <Compass size={13} className="text-[var(--accent)]" />
          <span>Explorar tiendas públicas</span>
          <ArrowRight size={12} />
        </Link>
      </header>

      {/* Contenedor central Split-Screen (Desktop) / App-Native Card (Móvil) */}
      <main className="relative z-10 w-full max-w-5xl mx-auto my-auto grid grid-cols-1 lg:grid-cols-12 bg-surface/95 backdrop-blur-xl border border-border rounded-2xl shadow-[0_20px_60px_-15px_rgba(9,8,18,0.65)] overflow-hidden">
        {/* Columna Izquierda: Escaparate de Marca (Visible en Desktop) */}
        <aside className="hidden lg:flex lg:col-span-5 xl:col-span-6 flex-col justify-between p-8 xl:p-10 bg-gradient-to-br from-[var(--accent)]/15 via-surface-hover/60 to-surface border-r border-border relative overflow-hidden">
          <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[var(--accent)]/20 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 w-64 h-64 rounded-full bg-indigo-500/15 blur-3xl" aria-hidden="true" />

          <div className="relative z-10 space-y-6">
            {/* Sello superior */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface/80 border border-border backdrop-blur-md shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]" />
              </span>
              <span className="text-[10px] font-bold tracking-widest uppercase text-primary">
                NAZAAR • SOCIAL COMMERCE
              </span>
            </div>

            {/* Titular de Marca */}
            <div className="space-y-3">
              <h2 className="font-display text-2xl xl:text-3xl font-extrabold text-primary tracking-tight leading-tight">
                Tu catálogo profesional conectado al poder de WhatsApp.
              </h2>
              <p className="text-secondary text-xs xl:text-sm leading-relaxed">
                Crea tu tienda digital en segundos, automatiza la publicación de ofertas en tus grupos y multiplica tus ventas con nuestra red de afiliados.
              </p>
            </div>

            {/* Tarjetas de Propuesta de Valor */}
            <div className="space-y-3 pt-2">
              <div className="p-3.5 rounded-xl bg-surface/80 border border-border/80 backdrop-blur-sm flex items-start gap-3 shadow-sm hover:border-[var(--accent)]/40 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center shrink-0">
                  <Store size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-primary">Tienda & Marketplace en 1 minuto</h3>
                  <p className="text-[11px] text-secondary mt-0.5 leading-snug">
                    Catálogo moderno con carrito de compras y enlace listo para compartir.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-surface/80 border border-border/80 backdrop-blur-sm flex items-start gap-3 shadow-sm hover:border-[var(--accent)]/40 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                  <TrendingUp size={17} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-primary">Red de Afiliados y Comisiones</h3>
                  <p className="text-[11px] text-secondary mt-0.5 leading-snug">
                    Gana comisiones vendiendo productos del marketplace o suma vendedores a tu tienda.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Pie de confianza */}
          <div className="relative z-10 pt-6 mt-6 border-t border-border/70 flex items-center justify-between text-[11px] text-secondary">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <ShieldCheck size={14} className="text-[var(--accent)]" />
              <span>100% optimizado para móvil</span>
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Sparkles size={13} className="text-[var(--accent)]" />
              <span>Sincronización en tiempo real</span>
            </span>
          </div>
        </aside>

        {/* Columna Derecha: Formulario */}
        <section className="col-span-12 lg:col-span-7 xl:col-span-6 p-5 sm:p-8 xl:p-10 flex flex-col justify-center relative">
          {/* Línea superior decorativa */}
          <div
            className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent"
            aria-hidden="true"
          />

          <div className="w-full max-w-md mx-auto">
            {/* Cabecera con logo */}
            <div className="text-center mb-6">
              <div className="relative inline-flex items-center justify-center w-16 h-16 mb-3">
                <div className="nazaar-logo-halo absolute inset-0 rounded-full bg-[var(--accent)]/25 blur-xl pointer-events-none" />
                <div className="relative w-14 h-14 rounded-2xl bg-[var(--accent)]/12 border border-[var(--accent)]/30 flex items-center justify-center shadow-sm">
                  <img
                    src="/icon.png"
                    alt="Nazaar"
                    className="nazaar-logo-float w-9 h-9 object-contain drop-shadow-[0_4px_12px_rgba(108,56,255,0.35)]"
                    draggable={false}
                  />
                </div>
              </div>

              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
                {title}
              </h1>
              <p className="text-secondary text-xs sm:text-sm mt-1.5 leading-relaxed">
                {subtitle}
              </p>

              {badges && badges.length > 0 && (
                <div className="mt-3.5 flex flex-wrap items-center justify-center gap-1.5">
                  {badges.map((badge, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-surface-hover border border-border text-primary"
                    >
                      {badge.icon}
                      <span>{badge.label}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Conmutador Superior (Segmented Switch) */}
            {(activeTab === 'login' || activeTab === 'register') && (
              <div className="mb-6 p-1 rounded-xl bg-surface-hover/90 border border-border grid grid-cols-2 gap-1">
                <Link
                  to={loginHref}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold text-center transition-all ${
                    activeTab === 'login'
                      ? 'bg-accent text-accent-text shadow-sm'
                      : 'text-secondary hover:text-primary'
                  }`}
                >
                  Iniciar sesión
                </Link>
                <Link
                  to={registerHref}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold text-center transition-all ${
                    activeTab === 'register'
                      ? 'bg-accent text-accent-text shadow-sm'
                      : 'text-secondary hover:text-primary'
                  }`}
                >
                  Crear cuenta
                </Link>
              </div>
            )}

            {/* Contenido del formulario */}
            {children}

            {/* Pie del formulario */}
            {footer && (
              <div className="mt-6 pt-5 border-t border-border text-center">
                {footer}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Espaciador inferior sutil */}
      <footer className="relative z-10 w-full max-w-5xl mx-auto text-center pt-4 pb-1 text-[11px] text-secondary/80">
        Nazaar • Plataforma de Catálogos y Comercio Social por WhatsApp
      </footer>
    </div>
  );
};

interface UnifiedPhoneInputProps {
  countries: Country[];
  selectedCountry: Country;
  onSelectCountry: (country: Country) => void;
  phone: string;
  onChangePhone: (cleanPhone: string) => void;
  label?: string;
  helperText?: string;
  autoFocus?: boolean;
  required?: boolean;
  disabled?: boolean;
}

export const UnifiedPhoneInput: React.FC<UnifiedPhoneInputProps> = ({
  countries,
  selectedCountry,
  onSelectCountry,
  phone,
  onChangePhone,
  label = 'Teléfono WhatsApp',
  helperText,
  autoFocus = false,
  required = false,
  disabled = false,
}) => {
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <div className="flex items-center justify-between ml-0.5">
          <label className="text-xs font-semibold text-primary">
            {label}
          </label>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            WhatsApp
          </span>
        </div>
      )}

      <div className="h-11 bg-surface-hover/80 border border-border rounded-xl flex items-center transition-all focus-within:border-accent focus-within:bg-surface focus-within:ring-2 focus-within:ring-[var(--accent)]/20 overflow-hidden">
        {/* Selector integrado de país */}
        <div className="relative h-full flex items-center pl-3 pr-2.5 hover:bg-surface-hover transition-colors shrink-0">
          <span className="text-xs font-semibold text-primary flex items-center gap-1.5 pointer-events-none select-none">
            <span className="text-sm leading-none">{selectedCountry.flag}</span>
            <span>+{selectedCountry.code}</span>
            <ChevronDown size={13} className="text-secondary" />
          </span>
          <select
            aria-label="Código de país"
            value={selectedCountry.name}
            disabled={disabled}
            onChange={(e) => {
              const found = countries.find((c) => c.name === e.target.value);
              if (found) onSelectCountry(found);
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed bg-surface text-primary"
          >
            {countries.map((c) => (
              <option key={c.name} value={c.name} className="bg-surface text-primary">
                {c.flag} {c.name} (+{c.code})
              </option>
            ))}
          </select>
        </div>

        {/* Divisor vertical */}
        <div className="w-px h-6 bg-border shrink-0" />

        {/* Input numérico */}
        <div className="relative flex-1 h-full flex items-center">
          <Phone size={15} className="ml-3 text-secondary/70 shrink-0 pointer-events-none" />
          <input
            type="tel"
            inputMode="numeric"
            placeholder={selectedCountry.placeholder}
            value={phone}
            onChange={(e) => onChangePhone(e.target.value.replace(/\D/g, ''))}
            required={required}
            autoFocus={autoFocus}
            disabled={disabled}
            className="w-full h-full bg-transparent px-2.5 text-sm text-primary placeholder:text-secondary/50 outline-none disabled:opacity-50"
          />
        </div>
      </div>

      {helperText && (
        <p className="text-[11px] text-secondary ml-0.5">{helperText}</p>
      )}
    </div>
  );
};
