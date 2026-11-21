import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import {
  ArrowRight,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  Store,
  Send,
  TrendingUp,
} from 'lucide-react';
import { COUNTRIES } from '../../constants/countries';
import { AuthLayout, UnifiedPhoneInput } from './AuthLayout';

function getPasswordStrength(password: string): {
  score: number;
  label: string;
  barClass: string;
  textClass: string;
} {
  if (!password) {
    return { score: 0, label: '', barClass: 'bg-border', textClass: 'text-secondary' };
  }
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1;

  const clamped = Math.max(1, Math.min(4, score));
  if (clamped === 1) {
    return { score: 1, label: 'Débil', barClass: 'bg-red-500', textClass: 'text-red-500' };
  }
  if (clamped === 2) {
    return { score: 2, label: 'Aceptable', barClass: 'bg-amber-500', textClass: 'text-amber-500' };
  }
  if (clamped === 3) {
    return { score: 3, label: 'Buena', barClass: 'bg-sky-500', textClass: 'text-sky-500' };
  }
  return { score: 4, label: 'Fuerte', barClass: 'bg-emerald-500', textClass: 'text-emerald-500' };
}

export const RegisterPage = () => {
  const [form, setForm] = useState({ nombre: '', phone: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(
    COUNTRIES.find((c) => c.code === '53') || COUNTRIES[0]
  ); // Cuba por defecto
  const { register, loading, error, setError } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawRedirect = searchParams.get('redirect');
  const redirect =
    rawRedirect && rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')
      ? rawRedirect
      : null;

  useEffect(() => {
    setError(null);
  }, [setError]);

  const strength = useMemo(() => getPasswordStrength(form.password), [form.password]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cleanPhone = form.phone.replace(/\D/g, '');
      const fullPhone = `${selectedCountry.code}${cleanPhone}`;
      await register({ ...form, phone: fullPhone });
      navigate(redirect || '/catalogs');
    } catch {
      // El store ya gestiona el estado de error
    }
  };

  const loginHref = redirect
    ? `/login?redirect=${encodeURIComponent(redirect)}`
    : '/login';

  return (
    <AuthLayout
      activeTab="register"
      title="Crea tu cuenta"
      subtitle="Únete a Nazaar y lanza tu catálogo profesional hoy mismo"
      redirect={redirect}
      badges={[
        { label: 'Catálogo Gratis', icon: <Store size={11} className="text-[var(--accent)]" /> },
        { label: 'Difusión WhatsApp', icon: <Send size={11} className="text-emerald-500" /> },
        { label: 'Gana Comisiones', icon: <TrendingUp size={11} className="text-amber-500" /> },
      ]}
      footer={
        <div className="space-y-3">
          <p className="text-secondary text-xs sm:text-sm">
            ¿Ya tienes una cuenta?{' '}
            <Link
              to={loginHref}
              className="text-[var(--accent)] font-bold hover:underline"
            >
              Inicia sesión
            </Link>
          </p>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-1.5 text-xs text-secondary hover:text-primary transition-colors"
          >
            <Store size={13} className="text-[var(--accent)]" />
            <span>Explorar tiendas públicas sin iniciar sesión</span>
          </Link>
        </div>
      }
    >
      <form onSubmit={handleRegister} className="space-y-4">
        {/* Nombre completo o negocio */}
        <div className="w-full space-y-1.5">
          <label
            htmlFor="register-name"
            className="text-xs font-semibold text-primary ml-0.5 block"
          >
            Nombre completo o de tu negocio
          </label>
          <div className="relative h-11 bg-surface-hover/80 border border-border rounded-xl flex items-center transition-all focus-within:border-accent focus-within:bg-surface focus-within:ring-2 focus-within:ring-[var(--accent)]/20">
            <User size={15} className="ml-3.5 text-secondary/70 shrink-0 pointer-events-none" />
            <input
              id="register-name"
              type="text"
              placeholder="Ej: Tienda Nazaar o Juan Pérez"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              required
              autoFocus
              disabled={loading}
              className="w-full h-full bg-transparent px-3 text-sm text-primary placeholder:text-secondary/50 outline-none disabled:opacity-50"
            />
          </div>
        </div>

        {/* Cápsula unificada de Teléfono WhatsApp */}
        <UnifiedPhoneInput
          countries={COUNTRIES}
          selectedCountry={selectedCountry}
          onSelectCountry={setSelectedCountry}
          phone={form.phone}
          onChangePhone={(cleanPhone) => setForm({ ...form, phone: cleanPhone })}
          label="Teléfono WhatsApp"
          helperText="Este número será tu acceso y el contacto de tu catálogo"
          required
          disabled={loading}
        />

        {/* Contraseña + Medidor de fortaleza */}
        <div className="w-full space-y-1.5">
          <div className="flex items-center justify-between ml-0.5">
            <label
              htmlFor="register-password"
              className="text-xs font-semibold text-primary"
            >
              Contraseña
            </label>
            {form.password.length > 0 && (
              <span className={`text-[11px] font-semibold ${strength.textClass}`}>
                Seguridad: {strength.label}
              </span>
            )}
          </div>

          <div className="relative h-11 bg-surface-hover/80 border border-border rounded-xl flex items-center transition-all focus-within:border-accent focus-within:bg-surface focus-within:ring-2 focus-within:ring-[var(--accent)]/20">
            <Lock size={15} className="ml-3.5 text-secondary/70 shrink-0 pointer-events-none" />
            <input
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Mínimo 6 caracteres"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              disabled={loading}
              className="w-full h-full bg-transparent px-3 text-sm text-primary placeholder:text-secondary/50 outline-none disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              className="pr-3.5 pl-2 h-full text-secondary/70 hover:text-primary transition-colors focus:outline-none flex items-center justify-center"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* 4 barras visuales de seguridad */}
          {form.password.length > 0 && (
            <div className="grid grid-cols-4 gap-1.5 pt-1 px-0.5" aria-label="Fortaleza de contraseña">
              {[1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  className={`h-1.5 rounded-full transition-colors duration-200 ${
                    strength.score >= level ? strength.barClass : 'bg-border'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-danger/10 border border-danger/25 rounded-xl p-3 flex items-center gap-2.5 text-danger">
            <AlertCircle size={16} className="shrink-0" />
            <p className="text-xs font-medium leading-snug">{error}</p>
          </div>
        )}

        <div className="pt-1.5">
          <Button
            type="submit"
            className="w-full h-11 rounded-xl font-bold text-sm bg-accent hover:bg-accent-hover text-accent-text shadow-[0_8px_24px_-4px_rgba(108,56,255,0.45)] flex items-center justify-center gap-2"
            loading={loading}
            size="lg"
          >
            <span>Crear cuenta y comenzar</span>
            <ArrowRight size={16} />
          </Button>
        </div>
      </form>
    </AuthLayout>
  );
};
