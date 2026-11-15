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
  Key,
  Trash2,
  Lock,
  Store
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Switch } from '../../components/ui/Switch';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import { toast } from 'react-hot-toast';
import type { AuthRole, AuthUser } from '../../types/auth';

export const UsersPage = () => {
  const { users, loading, getUsers, updateUserRole, updateUserPlan, toggleUserCatalogCreation, deleteUser, changePassword } = useAdminUserStore();
  const { plans, getPlans } = usePlanStore();
  const {
    isGlobalCatalogCreationEnabled,
    setGlobalCatalogCreation,
    refresh: refreshSettings,
    loading: settingsLoading,
  } = useSystemSettings();
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'user' | 'admin'>('all');
  const [updatingGlobal, setUpdatingGlobal] = useState(false);
  const [updatingUsers, setUpdatingUsers] = useState<Record<string, boolean>>({});
  const [passwordTargetUser, setPasswordTargetUser] = useState<AuthUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

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

  const handleRoleChange = async (userId: string, currentRole: AuthRole) => {
    const newRole: AuthRole = currentRole === 'admin' ? 'user' : 'admin';
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

  const openChangePasswordModal = (user: AuthUser) => {
    setPasswordTargetUser(user);
    setNewPassword('');
    setConfirmNewPassword('');
  };

  const closeChangePasswordModal = () => {
    if (changingPassword) return;
    setPasswordTargetUser(null);
    setNewPassword('');
    setConfirmNewPassword('');
  };

  const handleChangePasswordSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!passwordTargetUser) return;

    if (newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    setChangingPassword(true);
    const toastId = toast.loading('Actualizando contraseña...');
    try {
      await changePassword(passwordTargetUser.id, newPassword);
      toast.success('Contraseña actualizada correctamente', { id: toastId });
      setPasswordTargetUser(null);
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      toast.error('Error al actualizar contraseña: ' + (err?.message || 'Intente de nuevo'), { id: toastId });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleToggleGlobalCatalogCreation = async (enabled: boolean) => {
    setUpdatingGlobal(true);
    const res = await setGlobalCatalogCreation(enabled);
    if (res.success) {
      toast.success(
        enabled
          ? 'Creación global de catálogos activada'
          : 'Creación global de catálogos desactivada'
      );
    } else {
      toast.error('Error al actualizar permiso global: ' + (res.error || 'Intente de nuevo'));
    }
    setUpdatingGlobal(false);
  };

  const handleToggleUserCatalogCreation = async (userId: string, canCreate: boolean) => {
    setUpdatingUsers((prev) => ({ ...prev, [userId]: true }));
    try {
      await toggleUserCatalogCreation(userId, canCreate);
      await refreshSettings();
      toast.success(
        canCreate
          ? 'Creación de catálogos activada para este usuario'
          : 'Creación de catálogos desactivada para este usuario'
      );
    } catch (err: any) {
      toast.error('Error al actualizar permiso del usuario: ' + (err?.message || 'Intente de nuevo'));
    } finally {
      setUpdatingUsers((prev) => ({ ...prev, [userId]: false }));
    }
  };

  return (
    <div className="p-4 max-w-lg mx-auto pb-24 space-y-6 animate-in fade-in duration-500">
      <PageHeader 
        title="Usuarios" 
        subtitle="Gestión de Roles y Planes" 
      />

      {/* Control Global de Creación de Catálogos */}
      <div
        className={`card p-3.5 border transition-all ${
          isGlobalCatalogCreationEnabled
            ? 'bg-emerald-500/5 border-emerald-500/20'
            : 'bg-red-500/5 border-red-500/30'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`p-2 rounded-xl flex-shrink-0 ${
                isGlobalCatalogCreationEnabled
                  ? 'bg-emerald-500/15 text-emerald-500'
                  : 'bg-red-500/15 text-red-500'
              }`}
            >
              {isGlobalCatalogCreationEnabled ? <Store size={16} /> : <Lock size={16} />}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-primary leading-tight">
                Creación global de catálogos: {isGlobalCatalogCreationEnabled ? 'Activada' : 'Desactivada'}
              </p>
              <p className="text-[11px] text-secondary mt-0.5 leading-snug">
                {isGlobalCatalogCreationEnabled
                  ? 'Aplica a todos los usuarios salvo los bloqueados individualmente abajo.'
                  : 'Todos los usuarios (excepto admins) tienen la creación desactivada.'}
              </p>
            </div>
          </div>
          <Switch
            checked={isGlobalCatalogCreationEnabled}
            onChange={handleToggleGlobalCatalogCreation}
            disabled={settingsLoading || updatingGlobal}
          />
        </div>
      </div>

      {/* Filtros y Búsqueda */}
      <div className="flex flex-col gap-4">
        <Input
          type="text"
          placeholder="Buscar por nombre o teléfono..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={Search}
        />

        <div className="flex gap-2 p-1 bg-surface/50 border border-border rounded-xl w-fit">
          <button
            onClick={() => setFilterRole('all')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterRole === 'all' ? 'bg-accent text-accent-text shadow-lg shadow-accent/20' : 'text-secondary hover:text-primary'}`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterRole('user')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterRole === 'user' ? 'bg-accent text-accent-text shadow-lg shadow-accent/20' : 'text-secondary hover:text-primary'}`}
          >
            Usuarios
          </button>
          <button
            onClick={() => setFilterRole('admin')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterRole === 'admin' ? 'bg-accent text-accent-text shadow-lg shadow-accent/20' : 'text-secondary hover:text-primary'}`}
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
                    onClick={() => openChangePasswordModal(user)}
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
                  <Select
                    value={user.plan}
                    onChange={(e) => handlePlanChange(user.id, e.target.value)}
                    icon={CreditCard}
                  >
                    {plans.map(plan => (
                      <option key={plan.id} value={plan.id} className="bg-surface text-primary">
                        Plan {plan.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="flex items-end pb-1 px-1">
                   <div className="flex items-center gap-2 text-[10px] text-secondary font-bold">
                     <CheckCircle2 size={12} className={user.plan !== 'free' ? 'text-green-500' : 'text-secondary/50'} />
                     <span>Estado: {user.plan !== 'free' ? 'Suscrito' : 'Gratuito'}</span>
                   </div>
                </div>
              </div>

              {/* Control individual de creación de catálogos */}
              <div className="pt-3 border-t border-border/50">
                {user.role === 'admin' ? (
                  <div className="flex items-center gap-2 text-[11px] text-blue-500 font-semibold">
                    <Shield size={13} />
                    <span>Admin: Creación siempre habilitada</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-primary">
                          Creación de Catálogos
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${
                            user.can_create_catalogs !== false
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                              : 'bg-red-500/10 text-red-500 border-red-500/20'
                          }`}
                        >
                          {user.can_create_catalogs !== false ? 'Permitido' : 'Desactivado'}
                        </span>
                      </div>
                      <p className="text-[10px] text-secondary mt-0.5">
                        {user.can_create_catalogs === false
                          ? 'El usuario no podrá crear nuevos catálogos.'
                          : !isGlobalCatalogCreationEnabled
                          ? 'Permitido individualmente, pero el ajuste global está desactivado.'
                          : 'El usuario puede crear catálogos dentro de su plan.'}
                      </p>
                    </div>
                    <Switch
                      checked={user.can_create_catalogs !== false}
                      onChange={(checked) => handleToggleUserCatalogCreation(user.id, checked)}
                      disabled={Boolean(updatingUsers[user.id])}
                    />
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <Modal
        isOpen={Boolean(passwordTargetUser)}
        onClose={closeChangePasswordModal}
        title="Cambiar Contraseña"
        footer={
          <>
            <Button variant="secondary" onClick={closeChangePasswordModal} disabled={changingPassword}>
              Cancelar
            </Button>
            <Button onClick={() => handleChangePasswordSubmit()} loading={changingPassword} icon={Key}>
              Actualizar
            </Button>
          </>
        }
      >
        <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
          <p className="text-secondary text-sm">
            Establece una nueva contraseña para{' '}
            <span className="font-semibold text-primary">
              {passwordTargetUser?.nombre || passwordTargetUser?.phone || 'este usuario'}
            </span>
            {passwordTargetUser?.nombre && passwordTargetUser?.phone ? ` (${passwordTargetUser.phone})` : ''}.
          </p>

          <Input
            type="password"
            label="Nueva Contraseña"
            placeholder="Mínimo 6 caracteres"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            icon={Lock}
            autoFocus
            required
          />

          <Input
            type="password"
            label="Confirmar Contraseña"
            placeholder="Repite la nueva contraseña"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            icon={Lock}
            required
          />
        </form>
      </Modal>
    </div>
  );
};
