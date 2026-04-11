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
  const [loading, setLoading] = useState(true);

  const fetchCounts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Contar catálogos
      const { count: catCount } = await supabase
        .from('catalogs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Contar productos totales (de todos los catálogos)
      const { count: prodCount } = await supabase
        .from('products')
        .select('id, store_id', { count: 'exact', head: true })
        // Nota: en el futuro esto podría filtrarse por catálogo
        .eq('store_id', user.id); // Reutilizando store_id como user_id para productos por ahora

      // Contar grupos totales
      const { count: groupCount } = await supabase
        .from('whatsapp_groups')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      setCounts({
        catalogs: catCount || 0,
        products: prodCount || 0,
        groups: groupCount || 0
      });
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
  const limits = getPlanLimits(plan);

  return {
    limits,
    counts,
    loading,
    canCreateCatalog: checkCatalog(plan, counts.catalogs),
    canAddProduct: checkProduct(plan, counts.products),
    canAddGroup: checkGroup(plan, counts.groups),
    refresh: fetchCounts
  };
};
