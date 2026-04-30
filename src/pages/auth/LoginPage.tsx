import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { LogIn, Phone, Lock } from 'lucide-react';

export const LoginPage = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ phone, password });
      navigate('/catalogs');
    } catch (err) {}
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="card w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)] mb-4">
            <LogIn size={32} />
          </div>
          <h1 className="text-3xl font-bold text-white">Bienvenido</h1>
          <p className="text-gray-400 mt-2">Inicia sesión para gestionar tus catálogos</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Teléfono"
            placeholder="Ej: 54911..."
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Contraseña"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <p className="text-red-500 text-xs text-center font-medium">{error}</p>
            </div>
          )}

          <div className="pt-2">
            <Button
              type="submit"
              className="w-full"
              loading={loading}
              size="lg"
            >
              Iniciar sesión
            </Button>
          </div>
        </form>

        <div className="mt-8 space-y-4 text-center">
          <Link 
            to="/forgot-password" 
            className="text-sm text-gray-400 hover:text-white transition-colors block"
          >
            ¿Olvidaste tu contraseña?
          </Link>
          
          <div className="pt-6 border-t border-white/5">
            <p className="text-gray-400 text-sm">
              ¿No tienes cuenta?{' '}
              <Link to="/register" className="text-[var(--accent)] font-bold hover:underline">
                Regístrate ahora
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
