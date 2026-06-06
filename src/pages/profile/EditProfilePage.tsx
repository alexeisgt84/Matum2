import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useProfile } from '../../hooks/useProfile';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Camera, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const EditProfilePage = () => {
  const { user } = useAuthStore();
  const { profile, loading, updateProfile } = useProfile();
  
  const [nombre, setNombre] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | undefined>();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
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
    if (!nombre.trim()) {
      toast.error('El nombre no puede estar vacío');
      return;
    }
    const success = await updateProfile(nombre, avatarFile);
    if (success) {
      toast.success('Perfil actualizado correctamente');
    } else {
      toast.error('Error al actualizar el perfil');
    }
  };

  return (
    <div className="p-4 max-w-lg mx-auto pb-20">
      <PageHeader 
        title="Editar Perfil" 
        subtitle="Información Personal"
      />
      
      <div className="card">
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
      </div>
    </div>
  );
};
