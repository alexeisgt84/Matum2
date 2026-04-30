import { useState } from 'react';
import { usePlanStore } from '../../store/planStore';
import { Button } from '../ui/Button';
import { 
  Save, 
  X, 
  LayoutGrid, 
  ShoppingBag, 
  Users, 
  Info,
  DollarSign
} from 'lucide-react';
import type { SubscriptionPlan } from '../../types/plan';

interface PlanFormProps {
  plan?: SubscriptionPlan;
  onSuccess: () => void;
  onCancel: () => void;
}

export const PlanForm = ({ plan, onSuccess, onCancel }: PlanFormProps) => {
  const { createPlan, updatePlan, loading, error } = usePlanStore();
  const [formData, setFormData] = useState({
    name: plan?.name || '',
    description: plan?.description || '',
    price_cup: plan?.price_cup || 0,
    price_usd: plan?.price_usd || 0,
    catalogs_limit: plan?.catalogs_limit || 1,
    products_limit: plan?.products_limit || 10,
    groups_limit: plan?.groups_limit || 1,
    is_active: plan?.is_active ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (plan) {
        await updatePlan(plan.id, formData);
      } else {
        await createPlan(formData);
      }
      onSuccess();
    } catch (err) {
      console.error('Error saving plan:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-in slide-in-from-bottom duration-500">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500">
          <Info size={18} />
          <p className="text-xs font-bold">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Información Básica */}
        <section className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-widest text-secondary flex items-center gap-2 px-1">
            <Info size={12} /> Información General
          </label>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Nombre del Plan (ej: Gold)"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-surface-hover border border-border rounded-2xl px-4 py-3 placeholder:text-secondary text-primary font-bold focus:border-accent transition-colors"
              required
            />
            <textarea
              placeholder="Descripción"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-surface-hover border border-border rounded-2xl px-4 py-3 placeholder:text-secondary text-primary text-sm focus:border-accent transition-colors min-h-[80px]"
            />
          </div>
        </section>

        {/* Precios */}
        <section className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-widest text-secondary flex items-center gap-2 px-1">
            <DollarSign size={12} /> Precios
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary font-bold">$</span>
              <input
                type="number"
                placeholder="CUP"
                value={formData.price_cup}
                onChange={(e) => setFormData({ ...formData, price_cup: Number(e.target.value) })}
                className="w-full bg-surface-hover border border-border rounded-2xl pl-8 pr-4 py-3 text-primary font-bold focus:border-accent transition-colors"
                required
              />
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary font-bold">$</span>
              <input
                type="number"
                placeholder="USD"
                value={formData.price_usd}
                onChange={(e) => setFormData({ ...formData, price_usd: Number(e.target.value) })}
                className="w-full bg-surface-hover border border-border rounded-2xl pl-8 pr-4 py-3 text-primary font-bold focus:border-accent transition-colors"
                required
              />
            </div>
          </div>
        </section>

        {/* Límites */}
        <section className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-widest text-secondary flex items-center gap-2 px-1">
            Límites del Paquete
          </label>
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center gap-4 bg-surface-hover p-4 rounded-2xl border border-border">
              <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                <LayoutGrid size={20} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-primary">Catálogos</p>
                <p className="text-[10px] text-secondary">Cantidad máxima permitida</p>
              </div>
              <input
                type="number"
                value={formData.catalogs_limit}
                onChange={(e) => setFormData({ ...formData, catalogs_limit: Number(e.target.value) })}
                className="w-20 bg-background border border-border rounded-lg px-3 py-1 text-center font-black text-primary"
                min="1"
              />
            </div>

            <div className="flex items-center gap-4 bg-surface-hover p-4 rounded-2xl border border-border">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                <ShoppingBag size={20} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-primary">Productos</p>
                <p className="text-[10px] text-secondary">Productos totales permitidos</p>
              </div>
              <input
                type="number"
                value={formData.products_limit}
                onChange={(e) => setFormData({ ...formData, products_limit: Number(e.target.value) })}
                className="w-20 bg-background border border-border rounded-lg px-3 py-1 text-center font-black text-primary"
                min="1"
              />
            </div>

            <div className="flex items-center gap-4 bg-surface-hover p-4 rounded-2xl border border-border">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <Users size={20} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-primary">Grupos WA</p>
                <p className="text-[10px] text-secondary">Grupos de WhatsApp conectables</p>
              </div>
              <input
                type="number"
                value={formData.groups_limit}
                onChange={(e) => setFormData({ ...formData, groups_limit: Number(e.target.value) })}
                className="w-20 bg-background border border-border rounded-lg px-3 py-1 text-center font-black text-primary"
                min="1"
              />
            </div>
          </div>
        </section>

        {/* Estado */}
        <section className="flex items-center justify-between bg-surface-hover p-4 rounded-2xl border border-border">
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-primary">Estado del Plan</p>
            <p className="text-[10px] text-secondary">Activar o desactivar para nuevos usuarios</p>
          </div>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
            className={`w-12 h-6 rounded-full transition-colors relative ${formData.is_active ? 'bg-accent' : 'bg-secondary'}`}
          >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-black transition-all ${formData.is_active ? 'left-7' : 'left-1'}`} />
          </button>
        </section>
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          className="flex-1 rounded-2xl font-bold"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="primary"
          icon={Save}
          loading={loading}
          className="flex-2 rounded-2xl font-bold"
        >
          Guardar Plan
        </Button>
      </div>
    </form>
  );
};
