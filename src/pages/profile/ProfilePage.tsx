import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useProfile } from '../../hooks/useProfile';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { LogOut, Save, Camera, CreditCard, Sun, Moon, ShieldCheck, Key } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Skeleton } from '../../components/ui/Skeleton';
import { useStore } from '../../store/useStore';
import { ChangePasswordModal } from '../../components/profile/ChangePasswordModal';
import { useNavigate } from 'react-router-dom';

export const ProfilePage = () => {
  const { user, logout } = useAuthStore();
  const { profile, loading, updateProfile } = useProfile();
  const { theme, toggleTheme } = useStore();
  const navigate = useNavigate();
  
  const [nombre, setNombre] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | undefined>();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setNombre(profile.full_name || '');
      setAvatarPreview(profile.avatar_url);
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
    const success = await updateProfile(nombre, avatarFile);
    if (success) {
      toast.success('Perfil actualizado correctamente');
    } else {
      toast.error('Error al actualizar el perfil');
    }
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

            <div className="space-y-4">
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
