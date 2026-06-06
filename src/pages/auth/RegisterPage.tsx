import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { MessageSquare, ShieldCheck, ArrowRight, Phone, Lock, User } from 'lucide-react';
import { COUNTRIES } from '../../constants/countries';

export const RegisterPage = () => {
  const [form, setForm] = useState({ nombre: '', phone: '', password: '' });
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES.find(c => c.code === '53') || COUNTRIES[0]); // Cuba por defecto
  const { register, loading, error, setError } = useAuthStore();
  const navigate = useNavigate();

  React.useEffect(() => {
    // Limpiar errores previos al montar el componente
    setError(null);
  }, [setError]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cleanPhone = form.phone.replace(/\D/g, '');
      const fullPhone = `${selectedCountry.code}${cleanPhone}`;
      await register({ ...form, phone: fullPhone });
      navigate('/catalogs');
    } catch (err) {}
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="card w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)] mb-4">
            <MessageSquare size={32} />
          </div>
          <h1 className="text-3xl font-bold text-white">
            Crear cuenta
          </h1>
          <p className="text-gray-400 mt-2">
            Únete a la mejor plataforma de catálogos
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <Input
            label="Nombre completo"
            placeholder="Juan Pérez"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            icon={User}
            required
          />
          <div className="space-y-2">
            <label className="text-sm font-medium text-secondary ml-1 block">Teléfono WhatsApp</label>
            <div className="flex gap-3">
              <div className="w-[110px]">
                <Select
                  value={selectedCountry.name}
                  onChange={(e) => {
                    const country = COUNTRIES.find(c => c.name === e.target.value);
                    if (country) setSelectedCountry(country);
                  }}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.name} value={c.name} className="bg-surface text-primary">
                      {c.flag} +{c.code}
                    </option>
                  ))}
                </Select>
              </div>
                
              <div className="flex-1">
                <Input
                  placeholder={selectedCountry.placeholder}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })}
                  required
                  icon={Phone}
                />
              </div>
            </div>
            <p className="text-xs text-secondary ml-1">Ingresa tu número de WhatsApp para tu catálogo</p>
          </div>

          <Input
            label="Contraseña"
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            icon={Lock}
            required
          />

          {error && <p className="text-red-500 text-xs text-center">{error}</p>}

          <Button
            type="submit"
            className="w-full"
            loading={loading}
            icon={ArrowRight}
          >
            Registrarse y Comenzar
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <p className="text-gray-400 text-sm">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-[var(--accent)] font-bold hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};


