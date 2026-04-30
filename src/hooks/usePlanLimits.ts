import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { 
  getPlanLimits, 
  type PlanLimits, 
  canCreateCatalog as checkCatalog,
  canAddProduct as checkProduct,
  canAddGroup as checkGroup
} from '../lib/planLimits';

export const usePlanLimits = () => {
  const { user } = useAuthStore();
  const [counts, setCounts] = useState({
    catalogs: 0,
    products: 0,
    groups: 0
  });
  const [dbLimits, setDbLimits] = useState<PlanLimits | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCounts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Obtener IDs de catálogos del usuario
      const { data: userCatalogs } = await supabase
        .from('catalogs')
        .select('id')
        .eq('user_id', user.id);
      
      const catalogIds = userCatalogs?.map(c => c.id) || [];
      const catCount = catalogIds.length;

      // 2. Contar productos totales (de todos los catálogos del usuario)
      let prodCount = 0;
      if (catalogIds.length > 0) {
        const { count } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .in('catalog_id', catalogIds);
        prodCount = count || 0;
      }

      // 3. Contar grupos totales
      const { count: groupCount } = await supabase
        .from('whatsapp_groups')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      setCounts({
        catalogs: catCount,
        products: prodCount,
        groups: groupCount || 0
      });

      // 4. Obtener límites del plan desde la DB
      const { data: planData } = await supabase
        .from('subscription_plans')
        .select('catalogs_limit, products_limit, groups_limit')
        .eq('id', user.plan)
        .single();

      if (planData) {
        setDbLimits({
          catalogs: planData.catalogs_limit,
          products: planData.products_limit,
          groups: planData.groups_limit
        });
      }
    } catch (err) {
      console.error('Error fetching limits:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCounts();
  }, [user?.id]);

  const plan = user?.plan || 'free';
  const limits = dbLimits || getPlanLimits(plan);

  return {
    limits,
    counts,
    loading,
    canCreateCatalog: counts.catalogs < limits.catalogs,
    canAddProduct: counts.products < limits.products,
    canAddGroup: counts.groups < limits.groups,
    refresh: fetchCounts
  };
};
