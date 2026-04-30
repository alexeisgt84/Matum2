import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { SubscriptionPlan } from '../types/plan';

interface PlanState {
  plans: SubscriptionPlan[];
  loading: boolean;
  error: string | null;
  getPlans: () => Promise<void>;
  createPlan: (plan: Omit<SubscriptionPlan, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updatePlan: (id: string, plan: Partial<SubscriptionPlan>) => Promise<void>;
  deletePlan: (id: string) => Promise<void>;
}

export const usePlanStore = create<PlanState>((set, get) => ({
  plans: [],
  loading: false,
  error: null,

  getPlans: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price_cup', { ascending: true });

      if (error) throw error;
      set({ plans: data || [], loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  createPlan: async (plan) => {
    set({ loading: true, error: null });
    try {
      // Usar el nombre como base para el id si no se proporciona uno
      const id = plan.name.toLowerCase().replace(/\s+/g, '-');
      const { error } = await supabase
        .from('subscription_plans')
        .insert([{ ...plan, id }]);

      if (error) throw error;
      await get().getPlans();
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  updatePlan: async (id, plan) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('subscription_plans')
        .update(plan)
        .eq('id', id);

      if (error) throw error;
      await get().getPlans();
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  deletePlan: async (id) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await get().getPlans();
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },
}));
