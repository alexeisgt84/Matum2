import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { MessageSquare, ShieldCheck, ArrowRight } from 'lucide-react';

export const RegisterPage = () => {
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({ nombre: '', phone: '', password: '' });
  const [code, setCode] = useState('');
  const { sendRegisterCode, verifyAndRegister, loading, error, setError } = useAuthStore();
  const navigate = useNavigate();

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await sendRegisterCode(form);
      setStep(2);
    } catch (err) {}
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await verifyAndRegister(code, form);
      navigate('/catalogs');
    } catch (err) {}
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="card w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#25D366]/10 text-[#25D366] mb-4">
            {step === 1 ? <MessageSquare size={32} /> : <ShieldCheck size={32} />}
          </div>
          <h1 className="text-3xl font-bold text-white">
            {step === 1 ? 'Crear cuenta' : 'Verificar teléfono'}
          </h1>
          <p className="text-gray-400 mt-2">
            {step === 1 
              ? 'Únete a la mejor plataforma de catálogos' 
              : `Ingresa el código enviado al ${form.phone}`}
          </p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleSendCode} className="space-y-4">
            <Input
              label="Nombre completo"
              placeholder="Juan Pérez"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              required
            />
            <Input
              label="Teléfono WhatsApp"
              placeholder="Ej: 54911..."
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
              helperText="Enviaremos un código por WhatsApp"
            />
            <Input
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />

            {error && <p className="text-red-500 text-xs text-center">{error}</p>}

            <Button
              type="submit"
              className="w-full"
              loading={loading}
              icon={ArrowRight}
            >
              Continuar
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-6">
            <div className="space-y-4">
              <label className="text-sm font-medium text-gray-400 block text-center">
                Código de 6 dígitos
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

            {error && <p className="text-red-500 text-xs text-center">{error}</p>}

            <div className="space-y-3">
              <Button
                type="submit"
                className="w-full"
                loading={loading}
              >
                Verificar y Registrarse
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-xs"
                onClick={() => setStep(1)}
              >
                Cambiar número de teléfono
              </Button>
            </div>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <p className="text-gray-400 text-sm">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-[#25D366] font-bold hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
