import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  CreditCard, 
  ChevronRight, 
  Settings,
  Server 
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';

interface MenuItemProps {
  icon: React.ComponentType<{ className?: string; size?: number }>;
  label: string;
  value?: string;
  onClick: () => void;
  showArrow?: boolean;
  iconBgColorClass?: string;
  isLast?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({
  icon: Icon,
  label,
  value,
  onClick,
  showArrow = true,
  iconBgColorClass = 'bg-accent/10 text-accent',
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
          <span className="block font-medium text-sm leading-tight text-primary truncate">
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

export const AdminDashboard = () => {
  const navigate = useNavigate();

  const adminModules = [
    {
      title: 'Paquetes de Planes',
      description: 'Gestionar límites, precios y visibilidad de planes',
      icon: CreditCard,
      path: '/admin/plans',
      color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
    },
    {
      title: 'Validación de Pagos',
      description: 'Aprobar o rechazar comprobantes de suscripción',
      icon: CreditCard,
      path: '/admin/payments',
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
    },
    {
      title: 'Usuarios y Roles',
      description: 'Ver usuarios registrados y cambiar sus privilegios',
      icon: Users,
      path: '/admin/users',
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
    },
    {
      title: 'Configuración Global',
      description: 'Ajustes del sistema y mantenimiento',
      icon: Settings,
      path: '/admin/settings',
      color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
    },
    {
      title: 'Servidores Evolution',
      description: 'Configurar credenciales, URLs y límites de capacidad',
      icon: Server,
      path: '/admin/servers',
      color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
    }
  ];

  return (
    <div className="p-4 max-w-lg mx-auto pb-24 space-y-6 animate-in fade-in duration-700">
      <PageHeader 
        title="Admin" 
        subtitle="Gestión del Sistema" 
      />

      <div>
        <h3 className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-2 ml-1">
          Módulos de Control
        </h3>
        <div className="card p-0 overflow-hidden">
          {adminModules.map((module, index) => (
            <MenuItem
              key={module.path}
              icon={module.icon}
              label={module.title}
              value={module.description}
              onClick={() => navigate(module.path)}
              iconBgColorClass={module.color}
              isLast={index === adminModules.length - 1}
            />
          ))}
        </div>
      </div>

      <div className="p-6 card border-dashed border-border flex flex-col items-center text-center gap-4">
        <div className="w-12 h-12 rounded-full bg-surface-hover flex items-center justify-center text-secondary">
          <Settings size={24} />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-bold text-primary">Más funciones próximamente</p>
          <p className="text-[10px] text-secondary">Estamos trabajando en herramientas de análisis avanzadas.</p>
        </div>
      </div>
    </div>
  );
};
