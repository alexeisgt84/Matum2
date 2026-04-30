import { useEffect, useState } from 'react';
import { usePlanStore } from '../../store/planStore';
import { 
  Plus, 
  CreditCard, 
  Edit2, 
  Trash2, 
  Check,
  X,
  LayoutGrid,
  ShoppingBag,
  Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { PlanForm } from '../../components/admin/PlanForm';
import { PageHeader } from '../../components/ui/PageHeader';
import type { SubscriptionPlan } from '../../types/plan';

export const PlansPage = () => {
  const { plans, loading, getPlans, deletePlan } = usePlanStore();
  const [showForm, setShowForm] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | undefined>();
  const navigate = useNavigate();

  useEffect(() => {
    getPlans();
  }, [getPlans]);

  const handleEdit = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setShowForm(true);
  };

  const handleCreate = () => {
    setSelectedPlan(undefined);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este plan?')) {
      await deletePlan(id);
    }
  };

  if (showForm) {
    return (
      <div className="p-4 max-w-lg mx-auto pb-24 space-y-6">
        <PageHeader 
          title={selectedPlan ? 'Editar Plan' : 'Nuevo Plan'} 
          subtitle="Formulario de Producto"
        />
        <PlanForm 
          plan={selectedPlan} 
          onSuccess={() => setShowForm(false)} 
          onCancel={() => setShowForm(false)} 
        />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto pb-24 space-y-6 animate-in fade-in duration-500">
      <PageHeader 
        title="Planes" 
        subtitle="Suscripciones"
        rightAction={
          <Button
            size="sm"
            icon={Plus}
            onClick={handleCreate}
            className="rounded-xl px-4"
          >
            Nuevo
          </Button>
        }
      />

      <div className="space-y-4">
        {loading && plans.length === 0 ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="card p-5 space-y-4">
              <div className="flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-2xl" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Skeleton className="h-10 rounded-xl" />
                <Skeleton className="h-10 rounded-xl" />
                <Skeleton className="h-10 rounded-xl" />
              </div>
            </div>
          ))
        ) : (
          plans.map((plan) => (
            <div key={plan.id} className="card p-5 space-y-4 border-border hover:border-accent/40 transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-12 h-12 rounded-2xl ${plan.is_active ? 'bg-accent/10 text-accent' : 'bg-surface-hover text-secondary'} flex items-center justify-center border border-current/10`}>
                    <CreditCard size={24} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-primary truncate">{plan.name}</h3>
                      {plan.is_active ? (
                        <Check size={12} className="text-green-500" />
                      ) : (
                        <X size={12} className="text-red-500" />
                      )}
                    </div>
                    <p className="text-xs text-secondary truncate">{plan.description || 'Sin descripción'}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm font-black text-primary">${plan.price_cup} CUP</span>
                  <span className="text-[10px] font-bold text-secondary uppercase tracking-tighter">${plan.price_usd} USD</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 py-1">
                <div className="bg-surface-hover/50 p-2 rounded-xl border border-border/50 flex flex-col items-center">
                  <LayoutGrid size={14} className="text-accent mb-1" />
                  <span className="text-xs font-black text-primary">{plan.catalogs_limit}</span>
                  <span className="text-[8px] font-bold text-secondary uppercase">Cats</span>
                </div>
                <div className="bg-surface-hover/50 p-2 rounded-xl border border-border/50 flex flex-col items-center">
                  <ShoppingBag size={14} className="text-purple-500 mb-1" />
                  <span className="text-xs font-black text-primary">{plan.products_limit}</span>
                  <span className="text-[8px] font-bold text-secondary uppercase">Prods</span>
                </div>
                <div className="bg-surface-hover/50 p-2 rounded-xl border border-border/50 flex flex-col items-center">
                  <Users size={14} className="text-blue-500 mb-1" />
                  <span className="text-xs font-black text-primary">{plan.groups_limit}</span>
                  <span className="text-[8px] font-bold text-secondary uppercase">Grupos</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Edit2}
                  onClick={() => handleEdit(plan)}
                  className="h-9 w-9 p-0 rounded-lg text-secondary hover:text-accent"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Trash2}
                  onClick={() => handleDelete(plan.id)}
                  className="h-9 w-9 p-0 rounded-lg text-secondary hover:text-red-500"
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
