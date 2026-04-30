import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  CreditCard, 
  ChevronRight, 
  Settings
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';

export const AdminDashboard = () => {
  const navigate = useNavigate();

  const adminModules = [
    {
      title: 'Paquetes de Planes',
      description: 'Gestionar límites, precios y visibilidad de planes',
      icon: CreditCard,
      path: '/admin/plans',
      color: 'bg-purple-500/10 text-purple-500'
    },
    {
      title: 'Usuarios y Roles',
      description: 'Ver usuarios registrados y cambiar sus privilegios',
      icon: Users,
      path: '/admin/users',
      color: 'bg-blue-500/10 text-blue-500'
    },
    {
      title: 'Configuración Global',
      description: 'Ajustes del sistema y mantenimiento',
      icon: Settings,
      path: '/admin/settings',
      color: 'bg-orange-500/10 text-orange-500'
    }
  ];

  return (
    <div className="p-4 max-w-lg mx-auto pb-24 space-y-8 animate-in fade-in duration-700">
      <PageHeader 
        title="Admin" 
        subtitle="Gestión del Sistema" 
      />

      <div className="space-y-3">
        {adminModules.map((module) => (
          <button
            key={module.path}
            onClick={() => navigate(module.path)}
            className="w-full card p-5 flex items-center gap-5 hover:bg-surface-hover transition-all active:scale-[0.98] text-left border-border group"
          >
            <div className={`w-14 h-14 rounded-2xl ${module.color} flex items-center justify-center border border-current/10`}>
              <module.icon size={28} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-primary group-hover:text-accent transition-colors">{module.title}</h3>
              <p className="text-xs text-secondary leading-relaxed">{module.description}</p>
            </div>
            <ChevronRight size={18} className="text-secondary" />
          </button>
        ))}
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
