import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useProfile } from '../../hooks/useProfile';
import { Avatar } from '../../components/ui/Avatar';
import { PageHeader } from '../../components/ui/PageHeader';
import { 
  User, 
  Sparkles, 
  CreditCard, 
  Key, 
  Sun, 
  Moon, 
  ShieldCheck, 
  LogOut, 
  ChevronRight 
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { ChangePasswordModal } from '../../components/profile/ChangePasswordModal';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '../../components/ui/Skeleton';

interface MenuItemProps {
  icon: React.ComponentType<{ className?: string; size?: number }>;
  label: string;
  value?: string;
  onClick: () => void;
  showArrow?: boolean;
  iconBgColorClass?: string;
  textColorClass?: string;
  isLast?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({
  icon: Icon,
  label,
  value,
  onClick,
  showArrow = true,
  iconBgColorClass = 'bg-accent/10 text-accent',
  textColorClass = 'text-primary',
  isLast = false,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center justify-between p-4 transition-all hover:bg-[var(--surface-hover)] active:bg-[var(--border)] outline-none text-left ${
        !isLast ? 'border-b border-[var(--border)]' : ''
      }`}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div className={`p-2.5 rounded-xl flex-shrink-0 flex items-center justify-center transition-transform active:scale-95 ${iconBgColorClass}`}>
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <span className={`block font-medium text-sm leading-tight truncate ${textColorClass}`}>
            {label}
          </span>
          {value && (
            <span className="block text-secondary text-[11px] font-semibold mt-0.5 leading-none">
              {value}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 text-secondary">
        {showArrow && (
          <ChevronRight size={16} className="opacity-50" />
        )}
      </div>
    </button>
  );
};

export const ProfilePage = () => {
  const { user, logout } = useAuthStore();
  const { profile, loading } = useProfile();
  const { theme, toggleTheme } = useStore();
  const navigate = useNavigate();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'premium': return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'pro': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'basic': return 'bg-accent/10 text-accent border-accent/30';
      default: return 'bg-secondary/10 text-secondary border-secondary/30';
    }
  };

  const hasGeminiApiKey = !!(profile?.gemini_api_key && profile.gemini_api_key.trim() !== '');

  return (
    <div className="p-4 max-w-lg mx-auto pb-20">
      <PageHeader 
        title="Mi Perfil" 
        subtitle="Configuración de Usuario"
      />

      {loading && !profile ? (
        <div className="space-y-6">
          <div className="flex flex-col items-center py-6">
            <Skeleton className="w-24 h-24 rounded-full" />
            <Skeleton className="h-5 w-32 mt-4 rounded" />
            <Skeleton className="h-4 w-24 mt-2 rounded" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-12 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-12 w-full rounded-2xl" />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header Unificado de Perfil */}
          <div className="flex flex-col items-center py-4">
            <div className="relative group">
              <Avatar 
                src={profile?.avatar_url} 
                nombre={profile?.full_name || user?.nombre || 'U'} 
                size="xl" 
              />
            </div>
            
            <h2 className="mt-4 text-base font-bold text-primary tracking-wide">
              {profile?.full_name || 'Usuario'}
            </h2>
            
            <p className="text-xs text-secondary mt-1">
              {profile?.phone || user?.phone || 'Sin teléfono'}
            </p>

            <div className={`mt-3 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${getPlanColor(profile?.plan || 'free')}`}>
              Plan {profile?.plan || 'free'}
            </div>
          </div>

          {/* Sección: Cuenta */}
          <div>
            <h3 className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-2 ml-1">
              Cuenta
            </h3>
            <div className="card p-0 overflow-hidden">
              <MenuItem
                icon={User}
                label="Editar Datos Personales"
                onClick={() => navigate('/profile/edit')}
                iconBgColorClass="bg-blue-500/10 text-blue-500 dark:text-blue-400"
              />
              <MenuItem
                icon={Sparkles}
                label="Asistente de IA (Gemini)"
                value={hasGeminiApiKey ? 'Activo' : 'Inactivo'}
                onClick={() => navigate('/profile/ai-settings')}
                iconBgColorClass="bg-purple-500/10 text-purple-500 dark:text-purple-400"
              />
              <MenuItem
                icon={CreditCard}
                label="Gestionar Suscripción"
                onClick={() => navigate('/profile/subscription')}
                iconBgColorClass="bg-emerald-500/10 text-emerald-500 dark:text-emerald-400"
              />
              <MenuItem
                icon={Key}
                label="Cambiar Contraseña"
                onClick={() => setIsPasswordModalOpen(true)}
                iconBgColorClass="bg-amber-500/10 text-amber-500 dark:text-amber-400"
                isLast
              />
            </div>
          </div>

          {/* Sección: Apariencia */}
          <div>
            <h3 className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-2 ml-1">
              Apariencia
            </h3>
            <div className="card p-0 overflow-hidden">
              <MenuItem
                icon={theme === 'dark' ? Sun : Moon}
                label="Modo Oscuro"
                value={theme === 'dark' ? 'Activado' : 'Desactivado'}
                onClick={toggleTheme}
                showArrow={false}
                iconBgColorClass="bg-orange-500/10 text-orange-500 dark:text-orange-400"
                isLast
              />
            </div>
          </div>

          {/* Sección: Administración */}
          {user?.role === 'admin' && (
            <div>
              <h3 className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-2 ml-1">
                Administración
              </h3>
              <div className="card p-0 overflow-hidden">
                <MenuItem
                  icon={ShieldCheck}
                  label="Panel de Administrador"
                  onClick={() => navigate('/admin')}
                  iconBgColorClass="bg-rose-500/10 text-rose-500 dark:text-rose-400"
                  isLast
                />
              </div>
            </div>
          )}

          {/* Sección: Sesión */}
          <div>
            <div className="card p-0 overflow-hidden border-danger/10">
              <MenuItem
                icon={LogOut}
                label="Cerrar Sesión"
                onClick={logout}
                showArrow={false}
                iconBgColorClass="bg-red-500/10 text-red-500"
                textColorClass="text-danger font-semibold"
                isLast
              />
            </div>
          </div>

          {/* Footer */}
          <div className="pt-8 text-center text-secondary text-[9px] uppercase tracking-widest font-medium opacity-60">
            Matum v1.0.0
          </div>
        </div>
      )}

      <ChangePasswordModal 
        isOpen={isPasswordModalOpen} 
        onClose={() => setIsPasswordModalOpen(false)} 
      />
    </div>
  );
};
