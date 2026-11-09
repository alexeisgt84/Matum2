import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  CreditCard, 
  ChevronRight, 
  Settings,
  Server,
  Eye,
  Store,
  ShoppingBag,
  Share2,
  TrendingUp,
  ArrowRight
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { fetchViewsAnalytics, type OverallAnalyticsSummary } from '../../lib/analytics';

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
  const [summary, setSummary] = useState<OverallAnalyticsSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  useEffect(() => {
    fetchViewsAnalytics('all')
      .then(res => setSummary(res.summary))
      .catch(err => console.warn('Error fetching quick analytics for admin:', err))
      .finally(() => setLoadingSummary(false));
  }, []);

  const adminModules = [
    {
      title: 'Contador de Vistas y Tráfico',
      description: 'Vistas de tiendas y productos por tienda, usuarios y referidos',
      icon: Eye,
      path: '/admin/views',
      color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
    },
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

      {/* Espacio destacado de Vistas de Tiendas, Productos y Referidos */}
      <div className="card p-4 space-y-3 bg-gradient-to-br from-indigo-500/5 via-surface to-accent/5 border-indigo-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <TrendingUp size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-primary leading-tight">
                Contador de Vistas y Tráfico
              </h3>
              <p className="text-[11px] text-secondary">
                Métricas globales del sistema
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/admin/views')}
            className="flex items-center gap-1 text-xs font-bold text-accent hover:underline"
          >
            <span>Ver detalle</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Indicadores rápidos */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="bg-surface p-2.5 rounded-xl border border-border text-center">
            <span className="block text-[10px] text-secondary uppercase font-bold flex items-center justify-center gap-1">
              <Store size={11} className="text-blue-500" /> Tiendas
            </span>
            <span className="text-base font-black text-primary mt-0.5 block">
              {loadingSummary ? '...' : (summary?.totalStoreViews.toLocaleString() || '0')}
            </span>
          </div>

          <div className="bg-surface p-2.5 rounded-xl border border-border text-center">
            <span className="block text-[10px] text-secondary uppercase font-bold flex items-center justify-center gap-1">
              <ShoppingBag size={11} className="text-purple-500" /> Productos
            </span>
            <span className="text-base font-black text-primary mt-0.5 block">
              {loadingSummary ? '...' : (summary?.totalProductViews.toLocaleString() || '0')}
            </span>
          </div>

          <div className="bg-surface p-2.5 rounded-xl border border-border text-center">
            <span className="block text-[10px] text-secondary uppercase font-bold flex items-center justify-center gap-1">
              <Share2 size={11} className="text-emerald-500" /> Referidos
            </span>
            <span className="text-base font-black text-primary mt-0.5 block">
              {loadingSummary ? '...' : (summary?.totalReferralViews.toLocaleString() || '0')}
            </span>
          </div>
        </div>

        <button
          onClick={() => navigate('/admin/views')}
          className="w-full mt-2 py-2 px-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-98"
        >
          <span>Organizar por tiendas, usuarios y referidos</span>
          <ChevronRight size={14} />
        </button>
      </div>

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
    </div>
  );
};
