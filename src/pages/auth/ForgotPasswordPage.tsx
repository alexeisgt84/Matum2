import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { generateCode, sendVerificationCode } from '../../lib/authHelpers';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { KeyRound, ShieldCheck, ArrowRight, Save } from 'lucide-react';

export const ForgotPasswordPage = () => {
  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const vCode = generateCode();
      const expiresAt = new Date(Date.now() + 10 * 60000).toISOString();

      const { error: dbError } = await supabase
        .from('verification_codes')
        .insert([{ phone, code: vCode, expires_at: expiresAt }]);

      if (dbError) throw dbError;
      
      await sendVerificationCode(
        phone,
        vCode,
        import.meta.env.VITE_EVOLUTION_DEFAULT_URL || '',
        import.meta.env.VITE_EVOLUTION_API_KEY || '',
        import.meta.env.VITE_EVOLUTION_INSTANCE || ''
      );
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
        .eq('phone', phone)
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
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="card w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#25D366]/10 text-[#25D366] mb-4">
            {step === 1 ? <KeyRound size={32} /> : <ShieldCheck size={32} />}
          </div>
          <h1 className="text-3xl font-bold text-white">
            {step === 1 ? 'Recuperar' : 'Nueva clave'}
          </h1>
          <p className="text-gray-400 mt-2">
            {step === 1 
              ? 'Te enviaremos un código de acceso' 
              : 'Verifica el código y elige tu nueva clave'}
          </p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleRequestCode} className="space-y-6">
            <Input
              label="Teléfono vinculado"
              placeholder="Ej: 54911..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              helperText="El código tiene una validez de 10 minutos"
            />
            {error && <p className="text-red-500 text-xs text-center">{error}</p>}
            <Button 
                type="submit" 
                className="w-full" 
                loading={loading}
                icon={ArrowRight}
            >
              Enviar código
            </Button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-4 mb-6">
              <label className="text-sm font-medium text-gray-400 block text-center">
                Código recibido
              </label>
              <input
                type="text"
                maxLength={6}
                className="w-full bg-[#1a1a1a] border-2 border-white/5 rounded-2xl p-4 text-3xl font-bold tracking-[1em] text-center text-[#25D366] focus:border-[#25D366] outline-none transition-all"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                required
                autoFocus
              />
            </div>
            
            <Input
              label="Nueva contraseña"
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            
            {error && <p className="text-red-500 text-xs text-center">{error}</p>}
            
            <div className="pt-4 space-y-3">
              <Button type="submit" className="w-full" loading={loading} icon={Save}>
                Guardar cambios
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-xs"
                onClick={() => setStep(1)}
              >
                Volver a solicitar código
              </Button>
            </div>
          </form>
        )}
        
        <div className="mt-8 text-center pt-6 border-t border-white/5">
          <Link to="/login" className="text-sm text-gray-400 hover:text-white transition-colors">
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  );
};
