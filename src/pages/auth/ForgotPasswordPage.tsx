import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { generateCode } from '../../lib/authHelpers';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import {
  ArrowRight,
  Save,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import { COUNTRIES } from '../../constants/countries';
import { AuthLayout, UnifiedPhoneInput } from './AuthLayout';

export const ForgotPasswordPage = () => {
  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(
    COUNTRIES.find((c) => c.code === '53') || COUNTRIES[0]
  );
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fullPhone = `${selectedCountry.code}${phone.replace(/\D/g, '')}`;

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const vCode = generateCode();
      const expiresAt = new Date(Date.now() + 10 * 60000).toISOString();

      const { error: dbError } = await supabase
        .from('verification_codes')
        .insert([{ phone: fullPhone, code: vCode, expires_at: expiresAt }]);

      if (dbError) throw dbError;

      const { data: edgeData, error: edgeError } = await supabase.functions.invoke(
        'send-verification-otp',
        {
          body: { phone: fullPhone },
        }
      );

      if (edgeError || (edgeData && edgeData.error)) {
        throw new Error(
          edgeError?.message ||
            edgeData?.error ||
            'Error al enviar el código de verificación por WhatsApp'
        );
      }
      setStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data, error: vError } = await supabase
        .from('verification_codes')
        .select('*')
        .eq('phone', fullPhone)
        .eq('code', code)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (vError || !data) throw new Error('Código inválido o expirado');

      // IMPORTANTE: Esto requiere una Edge Function para realizar el cambio real
      // ya que un usuario anónimo no puede actualizar contraseñas por ID.
      // Por ahora simularemos el éxito para la demo.
      console.warn('Simulando cambio de contraseña. Requiere Edge Function para producción.');

      alert('¡Contraseña restablecida correctamente! (Modo Demo)');
      navigate('/login');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      activeTab="forgot"
      title={step === 1 ? 'Recuperar acceso' : 'Nueva contraseña'}
      subtitle={
        step === 1
          ? 'Te enviaremos un código de verificación a tu WhatsApp'
          : 'Ingresa el código recibido y elige tu nueva clave'
      }
      footer={
        <Link
          to="/login"
          className="inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm font-medium text-secondary hover:text-primary transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Volver al inicio de sesión</span>
        </Link>
      }
    >
      {/* Indicador visual de pasos */}
      <div className="mb-6 flex items-center gap-2">
        <div
          className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
            step === 1
              ? 'bg-[var(--accent)]/15 border-[var(--accent)]/40 text-primary'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
          }`}
        >
          {step > 1 ? (
            <CheckCircle2 size={15} className="shrink-0" />
          ) : (
            <span className="w-5 h-5 rounded-full bg-accent text-accent-text text-[11px] font-bold flex items-center justify-center shrink-0">
              1
            </span>
          )}
          <span className="truncate">Tu WhatsApp</span>
        </div>

        <div className="w-4 h-px bg-border shrink-0" />

        <div
          className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
            step === 2
              ? 'bg-[var(--accent)]/15 border-[var(--accent)]/40 text-primary'
              : 'bg-surface-hover/60 border-border text-secondary'
          }`}
        >
          <span
            className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 ${
              step === 2
                ? 'bg-accent text-accent-text'
                : 'bg-surface border border-border text-secondary'
            }`}
          >
            2
          </span>
          <span className="truncate">Código y Clave</span>
        </div>
      </div>

      {step === 1 ? (
        <form onSubmit={handleRequestCode} className="space-y-4">
          <UnifiedPhoneInput
            countries={COUNTRIES}
            selectedCountry={selectedCountry}
            onSelectCountry={setSelectedCountry}
            phone={phone}
            onChangePhone={setPhone}
            label="Teléfono vinculado"
            helperText="El código de acceso tiene una validez de 10 minutos"
            autoFocus
            required
            disabled={loading}
          />

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
              <span>Enviar código por WhatsApp</span>
              <ArrowRight size={16} />
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="otp-code"
              className="text-xs font-semibold text-secondary block text-center"
            >
              Código de 6 dígitos enviado a +{fullPhone}
            </label>
            <input
              id="otp-code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              className="w-full bg-surface-hover/80 border border-border rounded-xl py-3.5 px-4 text-2xl sm:text-3xl font-bold tracking-[0.55em] text-center text-primary placeholder:text-secondary/30 focus:border-accent focus:bg-surface focus:ring-2 focus:ring-[var(--accent)]/20 outline-none transition-all"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              required
              autoFocus
            />
          </div>

          <div className="w-full space-y-1.5">
            <label
              htmlFor="forgot-new-password"
              className="text-xs font-semibold text-primary ml-0.5 block"
            >
              Nueva contraseña
            </label>
            <div className="relative h-11 bg-surface-hover/80 border border-border rounded-xl flex items-center transition-all focus-within:border-accent focus-within:bg-surface focus-within:ring-2 focus-within:ring-[var(--accent)]/20">
              <Lock size={15} className="ml-3.5 text-secondary/70 shrink-0 pointer-events-none" />
              <input
                id="forgot-new-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
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

          <div className="pt-1.5 space-y-2.5">
            <Button
              type="submit"
              className="w-full h-11 rounded-xl font-bold text-sm bg-accent hover:bg-accent-hover text-accent-text shadow-[0_8px_24px_-4px_rgba(108,56,255,0.45)] flex items-center justify-center gap-2"
              loading={loading}
              size="lg"
            >
              <Save size={16} />
              <span>Guardar nueva contraseña</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full h-9 text-xs text-secondary hover:text-primary"
              onClick={() => {
                setError(null);
                setStep(1);
              }}
            >
              Volver a solicitar código
            </Button>
          </div>
        </form>
      )}
    </AuthLayout>
  );
};
