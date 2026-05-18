import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useProfile } from '../../hooks/useProfile';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { LogOut, Save, Camera, CreditCard, Sun, Moon, ShieldCheck, Key, Sparkles, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Skeleton } from '../../components/ui/Skeleton';
import { useStore } from '../../store/useStore';
import { ChangePasswordModal } from '../../components/profile/ChangePasswordModal';
import { useNavigate } from 'react-router-dom';
import { validateGeminiConfiguration } from '../../lib/aiService';

export const ProfilePage = () => {
  const { user, logout } = useAuthStore();
  const { profile, loading, updateProfile } = useProfile();
  const { theme, toggleTheme } = useStore();
  const navigate = useNavigate();
  
  const [nombre, setNombre] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | undefined>();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-2.5-flash');
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setNombre(profile.full_name || '');
      setAvatarPreview(profile.avatar_url);
      setGeminiApiKey(profile.gemini_api_key || '');
      setGeminiModel(profile.gemini_model || 'gemini-2.5-flash');
    }
  }, [profile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestingConnection(true);
    const success = await updateProfile(nombre, avatarFile, geminiApiKey, geminiModel);
    if (success) {
      if (geminiApiKey && geminiApiKey.trim() !== '') {
        toast.loading('Validando conexión con Gemini...', { id: 'gemini-test' });
        const testResult = await validateGeminiConfiguration();
        if (testResult.success) {
          toast.success('Perfil guardado y conexión con Gemini validada con éxito ✨', { id: 'gemini-test' });
        } else {
          toast.error(`Perfil guardado, pero falló la prueba de Gemini: ${testResult.error || 'Verifica la clave API'}`, { id: 'gemini-test', duration: 7000 });
        }
      } else {
        toast.success('Perfil actualizado correctamente');
      }
    } else {
      toast.error('Error al actualizar el perfil');
    }
    setTestingConnection(false);
  };

  const handleTestConnection = async () => {
    if (!geminiApiKey || geminiApiKey.trim() === '') {
      toast.error('Ingresa una Clave API de Gemini para poder realizar la prueba.');
      return;
    }

    setTestingConnection(true);
    toast.loading('Guardando configuración y probando conexión...', { id: 'gemini-manual-test' });
    const saveSuccess = await updateProfile(nombre, avatarFile, geminiApiKey, geminiModel);
    
    if (!saveSuccess) {
      toast.error('Error al guardar la configuración antes de la prueba.', { id: 'gemini-manual-test' });
      setTestingConnection(false);
      return;
    }

    const testResult = await validateGeminiConfiguration();
    if (testResult.success) {
      toast.success('¡Conexión exitosa! El modelo responde correctamente ✨', { id: 'gemini-manual-test', duration: 4000 });
    } else {
      toast.error(`Fallo de conexión: ${testResult.error || 'Verifica tu API Key o modelo.'}`, { id: 'gemini-manual-test', duration: 7000 });
    }
    setTestingConnection(false);
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'premium': return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'pro': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'basic': return 'bg-accent/10 text-accent border-accent/30';
      default: return 'bg-secondary/10 text-secondary border-secondary/30';
    }
  };

  return (
    <div className="p-4 max-w-lg mx-auto pb-20">
      <PageHeader 
        title="Mi Perfil" 
        subtitle="Configuración de Usuario"
      />
      <div className="card mb-6">
        {loading && !profile ? (
          <div className="space-y-8 animate-pulse">
            <div className="flex flex-col items-center">
              <Skeleton className="w-32 h-32 rounded-full" />
              <Skeleton className="h-6 w-24 mt-6 rounded-full" />
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-12 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
            <Skeleton className="h-14 w-full" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-8">
            {/* Avatar Edit Section */}
            <div className="flex flex-col items-center">
              <div className="relative group">
                <Avatar 
                  src={avatarPreview} 
                  nombre={nombre || user?.nombre || 'U'} 
                  size="xl" 
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-3 bg-accent text-black rounded-2xl shadow-lg hover:scale-110 transition-transform"
                >
                  <Camera size={20} />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/jpeg,image/jpg,image/png,image/*"
                  onChange={handleFileChange}
                />
              </div>
              
              <div className={`mt-6 px-4 py-1.5 rounded-full border text-xs font-bold uppercase tracking-widest ${getPlanColor(profile?.plan || 'free')}`}>
                Plan {profile?.plan || 'free'}
              </div>
            </div>

            <div className="space-y-5">
              <Input
                label="Nombre Completo"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
              
              <Input
                label="Teléfono (No editable)"
                value={profile?.phone || user?.phone || ''}
                disabled
              />

              {/* Sección Premium de Asistente de IA */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-500/5 to-indigo-500/5 border border-purple-500/10 space-y-4 mt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-wide">Asistente de IA (Gemini)</h3>
                      <p className="text-[11px] text-gray-400">Autocompleta tus productos con análisis de fotos</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${
                    geminiApiKey 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>
                    {geminiApiKey ? 'Activo ✨' : 'Inactivo'}
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <Input
                      label="Clave API de Gemini"
                      placeholder="AIzaSy..."
                      type={showApiKey ? 'text' : 'password'}
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                      className="pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-[34px] p-1.5 text-gray-400 hover:text-white transition-colors"
                    >
                      {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-secondary ml-1">Modelo de IA (Gemini)</label>
                    <div className="relative">
                      <select
                        value={geminiModel}
                        onChange={(e) => setGeminiModel(e.target.value)}
                        className="w-full bg-surface border border-border rounded-xl p-4 pr-10 text-primary outline-none transition-all duration-200 focus:border-accent focus:bg-surface-hover appearance-none cursor-pointer"
                      >
                        {/* Gemini 3 Series */}
                        <option value="gemini-3-flash-preview" className="bg-surface text-primary">Gemini 3 Flash (Última generación - Ultra rápido y potente)</option>
                        <option value="gemini-3.1-pro-preview" className="bg-surface text-primary">Gemini 3.1 Pro (Razonamiento y agentes avanzados)</option>
                        <option value="gemini-3.1-flash-lite" className="bg-surface text-primary">Gemini 3.1 Flash-Lite (Eficiencia a gran escala)</option>
                        
                        {/* Gemini 2.5 Series */}
                        <option value="gemini-2.5-flash" className="bg-surface text-primary">Gemini 2.5 Flash (Equilibrado y veloz)</option>
                        <option value="gemini-2.5-pro" className="bg-surface text-primary">Gemini 2.5 Pro (Precisión y desarrollo)</option>
                        <option value="gemini-2.5-flash-lite" className="bg-surface text-primary">Gemini 2.5 Flash-Lite (Bajo consumo)</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-secondary">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-down"><path d="m6 9 6 6 6-6"/></svg>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testingConnection}
                    className="w-full mt-2 flex items-center justify-center gap-2 py-3.5 px-4 border border-purple-500/20 hover:border-purple-500/40 bg-purple-500/5 hover:bg-purple-500/10 text-purple-300 rounded-xl text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {testingConnection ? (
                      <>
                        <RefreshCw size={14} className="animate-spin text-purple-400" />
                        <span>Probando Conexión con Gemini...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} className="text-purple-400" />
                        <span>Probar Conexión en Caliente</span>
                      </>
                    )}
                  </button>

                  <a
                    href="https://aistudio.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors font-medium mt-1 ml-1 hover:underline"
                  >
                    <Key size={12} />
                    Obtener clave de API gratuita en Google AI Studio →
                  </a>
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              loading={loading}
              icon={Save}
              size="lg"
            >
              Guardar Cambios
            </Button>
          </form>
        )}
      </div>

      <div className="card space-y-4 border-danger/10">
        <h3 className="text-sm font-bold text-secondary uppercase tracking-widest mb-2">Más acciones</h3>
        
        <Button 
          variant="secondary" 
          className="w-full justify-between" 
          icon={theme === 'dark' ? Sun : Moon}
          onClick={toggleTheme}
        >
          Modo {theme === 'dark' ? 'Claro' : 'Oscuro'}
        </Button>

        <Button 
          variant="secondary" 
          className="w-full justify-between" 
          icon={Key}
          onClick={() => setIsPasswordModalOpen(true)}
        >
          Cambiar Contraseña
        </Button>

        {user?.role === 'admin' && (
          <Button 
            variant="secondary" 
            className="w-full justify-between text-accent border-accent/10" 
            icon={ShieldCheck}
            onClick={() => navigate('/admin')}
          >
            Panel de Administrador
          </Button>
        )}

        <Button 
          variant="secondary" 
          className="w-full justify-between" 
          icon={CreditCard}
          onClick={() => toast.success('Próximamente')}
        >
          Gestionar Suscripción
        </Button>

        <Button 
          variant="danger" 
          className="w-full border-danger/10" 
          icon={LogOut} 
          onClick={logout}
        >
          Cerrar Sesión
        </Button>
      </div>


      <p className="text-center text-secondary text-[10px] mt-12 uppercase tracking-widest">
        WA Catalog v1.0.0
      </p>

      <ChangePasswordModal 
        isOpen={isPasswordModalOpen} 
        onClose={() => setIsPasswordModalOpen(false)} 
      />
    </div>
  );
};
