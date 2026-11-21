import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Lock, Eye, EyeOff, ArrowRight, AlertCircle, Store } from 'lucide-react';
import { COUNTRIES } from '../../constants/countries';
import { AuthLayout, UnifiedPhoneInput } from './AuthLayout';

export const LoginPage = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(
    COUNTRIES.find((c) => c.code === '53') || COUNTRIES[0]
  ); // Cuba por defecto
  const { login, loading, error, setError } = useAuthStore();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const fullPhone = `${selectedCountry.code}${cleanPhone}`;
      await login({ phone: fullPhone, password });
      navigate(redirect || '/catalogs');
    } catch {
      // El store ya gestiona el estado de error
    }
  };

  const registerHref = redirect
    ? `/register?redirect=${encodeURIComponent(redirect)}`
    : '/register';

  return (
    <AuthLayout
      activeTab="login"
      title="Bienvenido de nuevo"
      subtitle="Inicia sesión para gestionar tus catálogos y ventas"
      redirect={redirect}
      footer={
        <div className="space-y-3">
          <p className="text-secondary text-xs sm:text-sm">
            ¿Aún no tienes cuenta?{' '}
            <Link
              to={registerHref}
              className="text-[var(--accent)] font-bold hover:underline"
            >
              Regístrate ahora
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
      <form onSubmit={handleSubmit} className="space-y-4">
        <UnifiedPhoneInput
          countries={COUNTRIES}
          selectedCountry={selectedCountry}
          onSelectCountry={setSelectedCountry}
          phone={phone}
          onChangePhone={setPhone}
          label="Teléfono WhatsApp"
          autoFocus
          required
          disabled={loading}
        />

        {/* Campo Contraseña de 44px con enlace de recuperación alineado */}
        <div className="w-full space-y-1.5">
          <div className="flex items-center justify-between ml-0.5">
            <label
              htmlFor="login-password"
              className="text-xs font-semibold text-primary"
            >
              Contraseña
            </label>
            <Link
              to="/forgot-password"
              className="text-[11px] font-medium text-[var(--accent)] hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <div className="relative h-11 bg-surface-hover/80 border border-border rounded-xl flex items-center transition-all focus-within:border-accent focus-within:bg-surface focus-within:ring-2 focus-within:ring-[var(--accent)]/20">
            <Lock size={15} className="ml-3.5 text-secondary/70 shrink-0 pointer-events-none" />
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            <span>Entrar a mi cuenta</span>
            <ArrowRight size={16} />
          </Button>
        </div>
      </form>
    </AuthLayout>
  );
};
