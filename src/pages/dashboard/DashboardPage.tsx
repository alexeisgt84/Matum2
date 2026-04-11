import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCatalogs } from '../../hooks/useCatalogs';
import { usePlanLimits } from '../../hooks/usePlanLimits';
import { useAuthStore } from '../../store/authStore';
import { 
  LayoutGrid, 
  ShoppingBag, 
  Users, 
  Plus, 
  ChevronRight, 
  Rocket,
  Settings,
  History,
  MessageCircle
} from 'lucide-react';
import { Skeleton } from '../../components/ui/Skeleton';

export const DashboardPage = () => {
  const { user } = useAuthStore();
  const { catalogs, loading, getCatalogs } = useCatalogs();
  const { counts, loading: limitsLoading } = usePlanLimits();
  const navigate = useNavigate();

  useEffect(() => {
    getCatalogs();
  }, [getCatalogs]);

  const stats = [
    { label: 'Catálogos', value: counts.catalogs, icon: LayoutGrid, color: 'text-[#25D366]', bg: 'bg-[#25D366]/10' },
    { label: 'Productos', value: counts.products, icon: ShoppingBag, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Grupos WA', value: counts.groups, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  ];

  const quickActions = [
    { label: 'Nuevo Catálogo', icon: Plus, path: '/catalogs/new', color: 'bg-[#25D366]' },
    { label: 'Ver Historial', icon: History, path: '/history', color: 'bg-white/5' },
    { label: 'Mi Perfil', icon: Settings, path: '/profile', color: 'bg-white/5' },
  ];

  return (
    <div className="p-4 max-w-lg mx-auto pb-24 space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-[#25D366]">
          <Rocket size={16} className="animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Panel de Control</span>
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">
          Hola, <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/40">{user?.full_name?.split(' ')[0] || 'Capi'}</span>
        </h1>
        <p className="text-gray-500 text-sm">Gestiona tus ventas y automatizaciones hoy.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-3 flex flex-col items-center gap-2 text-center border-white/5 hover:border-white/10 transition-colors">
            <div className={`p-2 rounded-xl ${stat.bg} ${stat.color}`}>
              <stat.icon size={20} />
            </div>
            <div className="space-y-0.5 w-full flex flex-col items-center">
              {limitsLoading ? (
                <Skeleton className="h-7 w-8 mb-1" />
              ) : (
                <span className="text-xl font-black text-white block">
                  {stat.value}
                </span>
              )}
              <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500">
                {stat.label}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* WhatsApp Physical Section */}
      <section 
        onClick={() => navigate('/catalogs')}
        className={`card p-4 flex items-center gap-4 cursor-pointer transition-all border-white/5 hover:border-white/10 relative overflow-hidden group`}
      >
        <div className="absolute top-0 right-0 w-24 h-24 blur-3xl -mr-12 -mt-12 bg-[#25D366]/10 transition-colors" />
        
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center relative bg-[#25D366]/20 text-[#25D366]">
          <MessageCircle size={24} />
        </div>
        
        <div className="flex-1">
          <h3 className="font-bold text-white text-sm">WhatsApp por Catálogo</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Ahora gestionas la conexión de WhatsApp independientemente en cada catálogo.
          </p>
        </div>
        
        <ChevronRight size={18} className="text-gray-700 group-hover:text-white transition-colors" />
      </section>

      {/* Quick Actions */}
      <section className="space-y-4">
        <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2 px-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[#25D366]" />
          Accesos Rápidos
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className={`flex items-center gap-3 p-4 rounded-2xl transition-all active:scale-95 group relative overflow-hidden ${
                action.color === 'bg-[#25D366]' 
                ? 'bg-[#25D366] text-black shadow-lg shadow-[#25D366]/20' 
                : 'bg-white/5 text-white hover:bg-white/10'
              }`}
            >
              <div className={`${action.color === 'bg-[#25D366]' ? 'bg-black/10' : 'bg-white/10'} p-2 rounded-lg`}>
                <action.icon size={18} />
              </div>
              <span className="font-bold text-sm tracking-tight">{action.label}</span>
              <ChevronRight size={14} className="ml-auto opacity-30 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      </section>

      {/* Recent Catalogs */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Tus Catálogos</h2>
          <button 
            onClick={() => navigate('/catalogs')}
            className="text-[10px] font-bold text-[#25D366] uppercase tracking-wider hover:opacity-70 transition-opacity"
          >
            Ver todos
          </button>
        </div>

        <div className="space-y-3">
          {loading && catalogs.length === 0 ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="card p-4 flex items-center gap-4 border-white/5">
                <Skeleton className="w-12 h-12 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-5 w-5 rounded-md" />
              </div>
            ))
          ) : (
            <>
              {catalogs.slice(0, 3).map((catalog) => (
                <div
                  key={catalog.id}
                  onClick={() => navigate(`/catalogs/${catalog.id}`)}
                  className="card p-4 group hover:bg-white/[0.02] cursor-pointer transition-all border-white/5 active:scale-[0.98]"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#25D366]/20 to-transparent flex items-center justify-center text-[#25D366] border border-[#25D366]/10">
                      <LayoutGrid size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white truncate group-hover:text-[#25D366] transition-colors">{catalog.name}</h3>
                      <p className="text-xs text-gray-500 truncate">{catalog.description || 'Sin descripción'}</p>
                    </div>
                    <ChevronRight size={18} className="text-gray-700 group-hover:text-white transition-colors" />
                  </div>
                </div>
              ))}
              {catalogs.length === 0 && (
                <div className="card p-8 border-dashed border-white/10 text-center space-y-3">
                  <p className="text-gray-500 text-sm">No tienes catálogos creados</p>
                  <button 
                    onClick={() => navigate('/catalogs/new')}
                    className="text-xs font-bold text-[#25D366] uppercase tracking-widest border border-[#25D366]/20 px-4 py-2 rounded-full hover:bg-[#25D366]/5 transition-colors"
                  >
                    Crear el primero
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
};
