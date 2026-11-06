import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import {
  getPlanLimits,
  type PlanLimits,
} from '../lib/planLimits';
import { isOffline, saveCachedList, getCachedList } from '../lib/offlineCache';

export const usePlanLimits = () => {
  const { user } = useAuthStore();
  const [counts, setCounts] = useState({
    catalogs: 0,
    products: 0,
    groups: 0,
  });
  const [dbLimits, setDbLimits] = useState<PlanLimits | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCounts = async () => {
    if (!user) return;
    const cacheKey = `plan_limits_${user.id}`;
    const cached = await getCachedList<{ counts: typeof counts; dbLimits: PlanLimits | null }>(cacheKey);

    if (cached) {
      setCounts(cached.counts);
      if (cached.dbLimits) setDbLimits(cached.dbLimits);
    }

    if (isOffline()) {
      setLoading(false);
      return;
    }

    setLoading(!cached);
    try {
      // 1. Obtener IDs de catálogos del usuario
      const { data: userCatalogs } = await supabase
        .from('catalogs')
        .select('id')
        .eq('user_id', user.id);

      const catalogIds = userCatalogs?.map((c) => c.id) || [];
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

      const nextCounts = {
        catalogs: catCount,
        products: prodCount,
        groups: groupCount || 0,
      };
      setCounts(nextCounts);

      // 4. Obtener límites del plan desde la DB
      const { data: planData } = await supabase
        .from('subscription_plans')
        .select('catalogs_limit, products_limit, groups_limit')
        .eq('id', user.plan)
        .single();

      let nextLimits: PlanLimits | null = null;
      if (planData) {
        nextLimits = {
          catalogs: planData.catalogs_limit,
          products: planData.products_limit,
          groups: planData.groups_limit,
        };
        setDbLimits(nextLimits);
      }

      await saveCachedList(cacheKey, { counts: nextCounts, dbLimits: nextLimits });
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
    refresh: fetchCounts,
  };
};
