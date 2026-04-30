import { useEffect, useState } from 'react';
import { useAdminUserStore } from '../../store/adminUserStore';
import { usePlanStore } from '../../store/planStore';
import { 
  Users, 
  Search, 
  Shield, 
  CreditCard, 
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Key,
  Trash2,
  Lock
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { toast } from 'react-hot-toast';

export const UsersPage = () => {
  const { users, loading, getUsers, updateUserRole, updateUserPlan, deleteUser, changePassword } = useAdminUserStore();
  const { plans, getPlans } = usePlanStore();
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'user' | 'admin'>('all');

  useEffect(() => {
    getUsers();
    getPlans();
  }, [getUsers, getPlans]);

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.nombre?.toLowerCase() || '').includes(search.toLowerCase()) ||
      user.phone.includes(search);
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const handleRoleChange = async (userId: string, currentRole: 'user' | 'admin') => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    const confirmMsg = `¿Cambiar el rol de este usuario a ${newRole === 'admin' ? 'Administrador' : 'Usuario'}?`;
    
    if (confirm(confirmMsg)) {
      try {
        await updateUserRole(userId, newRole);
        toast.success('Rol actualizado');
      } catch (err) {
        toast.error('Error al actualizar rol');
      }
    }
  };

  const handlePlanChange = async (userId: string, planId: string) => {
    try {
      await updateUserPlan(userId, planId);
      toast.success('Plan actualizado');
    } catch (err) {
      toast.error('Error al actualizar plan');
    }
  };
  const handleDeleteUser = async (userId: string, userName: string) => {
    if (confirm(`¿Estás seguro de que deseas eliminar permanentemente al usuario "${userName}"? Esta acción no se puede deshacer.`)) {
      const toastId = toast.loading('Eliminando usuario...');
      try {
        await deleteUser(userId);
        toast.success('Usuario eliminado correctamente', { id: toastId });
      } catch (err: any) {
        console.error('Error detallado al eliminar:', err);
        toast.error('Error al eliminar usuario: ' + err.message, { id: toastId });
      }
    }
  };

  const handleChangePassword = async (userId: string) => {
    const newPassword = prompt('Ingresa la nueva contraseña para el usuario:');
    if (newPassword) {
      if (newPassword.length < 6) {
        return toast.error('La contraseña debe tener al menos 6 caracteres');
      }
      
      const toastId = toast.loading('Actualizando contraseña...');
      try {
        await changePassword(userId, newPassword);
        toast.success('Contraseña actualizada correctamente', { id: toastId });
      } catch (err: any) {
        toast.error('Error al actualizar contraseña: ' + err.message, { id: toastId });
      }
    }
  };

  return (
    <div className="p-4 max-w-lg mx-auto pb-24 space-y-6 animate-in fade-in duration-500">
      <PageHeader 
        title="Usuarios" 
        subtitle="Gestión de Roles y Planes" 
      />

      {/* Filtros y Búsqueda */}
      <div className="flex flex-col gap-4">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary group-focus-within:text-accent transition-colors" size={18} />
          <input
            type="text"
            placeholder="Buscar por nombre o teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface border border-border rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:border-accent/50 focus:ring-4 focus:ring-accent/5 transition-all"
          />
        </div>

        <div className="flex gap-2 p-1 bg-surface/50 border border-border rounded-xl w-fit">
          <button
            onClick={() => setFilterRole('all')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterRole === 'all' ? 'bg-accent text-black shadow-lg shadow-accent/20' : 'text-secondary hover:text-primary'}`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterRole('user')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterRole === 'user' ? 'bg-accent text-black shadow-lg shadow-accent/20' : 'text-secondary hover:text-primary'}`}
          >
            Usuarios
          </button>
          <button
            onClick={() => setFilterRole('admin')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterRole === 'admin' ? 'bg-accent text-black shadow-lg shadow-accent/20' : 'text-secondary hover:text-primary'}`}
          >
            Admins
          </button>
        </div>
      </div>

      {/* Lista de Usuarios */}
      <div className="space-y-3">
        {loading && users.length === 0 ? (
          [1, 2, 3, 4].map(i => (
            <div key={i} className="card p-4 flex items-center gap-4">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))
        ) : filteredUsers.length === 0 ? (
          <div className="py-20 text-center space-y-4 bg-surface/30 rounded-3xl border border-dashed border-border mt-4">
            <div className="w-16 h-16 bg-surface-hover rounded-full flex items-center justify-center mx-auto text-secondary/30">
               <Users size={32} />
            </div>
            <p className="text-secondary font-medium italic">No se encontraron usuarios</p>
          </div>
        ) : (
          filteredUsers.map((user) => (
            <div key={user.id} className="card p-4 flex flex-col gap-4 border-border hover:border-accent/30 transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <Users size={24} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-primary truncate">{user.nombre || 'Sin nombre'}</h3>
                    {user.role === 'admin' && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase tracking-wider rounded-md border border-blue-500/20">
                        <Shield size={10} />
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-secondary">{user.phone}</p>
                </div>
                <div className="flex gap-2">
                   <button 
                    onClick={() => handleRoleChange(user.id, user.role)}
                    className={`p-2 rounded-xl transition-all ${user.role === 'admin' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-sm' : 'bg-surface-hover text-secondary border border-transparent hover:border-border'}`}
                    title="Alternar Rol Admin"
                   >
                     <Shield size={18} />
                   </button>
                   
                   <button 
                    onClick={() => handleChangePassword(user.id)}
                    className="p-2 rounded-xl bg-surface-hover text-secondary border border-transparent hover:border-border hover:text-accent transition-all"
                    title="Cambiar Contraseña"
                   >
                     <Key size={18} />
                   </button>

                   <button 
                    onClick={() => handleDeleteUser(user.id, user.nombre || user.phone)}
                    className="p-2 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                    title="Eliminar Usuario"
                   >
                     <Trash2 size={18} />
                   </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-border/50">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-secondary uppercase tracking-widest pl-1">Plan de Suscripción</label>
                  <div className="relative group/select">
                    <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary group-focus-within/select:text-accent transition-colors" size={14} />
                    <select
                      value={user.plan}
                      onChange={(e) => handlePlanChange(user.id, e.target.value)}
                      className="w-full bg-surface-hover/50 border border-border rounded-xl py-2 pl-10 pr-8 text-xs font-bold text-primary appearance-none focus:outline-none focus:border-accent/40 focus:bg-surface-hover transition-all cursor-pointer"
                    >
                      {plans.map(plan => (
                        <option key={plan.id} value={plan.id}>
                          Plan {plan.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none group-hover/select:text-primary transition-colors" size={12} />
                  </div>
                </div>

                <div className="flex items-end pb-1 px-1">
                   <div className="flex items-center gap-2 text-[10px] text-secondary font-bold">
                     <CheckCircle2 size={12} className={user.plan !== 'free' ? 'text-green-500' : 'text-secondary/50'} />
                     <span>Estado: {user.plan !== 'free' ? 'Suscrito' : 'Gratuito'}</span>
                   </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
