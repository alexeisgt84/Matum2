export type PlanType = 'free' | 'basic' | 'pro' | 'premium';

export interface PlanLimits {
  catalogs: number;
  products: number;
  groups: number;
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    catalogs: 1,
    products: 8,
    groups: 1,
  },
  basic: {
    catalogs: 2,
    products: 50,
    groups: 2,
  },
  pro: {
    catalogs: 3,
    products: 200,
    groups: 3,
  },
  premium: {
    catalogs: 4,
    products: 500,
    groups: 5,
  },
};

export const getPlanLimits = (plan: string = 'free'): PlanLimits => {
  return PLAN_LIMITS[plan as PlanType] || PLAN_LIMITS.free;
};

export const canCreateCatalog = (plan: string, currentCount: number): boolean => {
  const limits = getPlanLimits(plan);
  return currentCount < limits.catalogs;
};

export const canAddProduct = (plan: string, currentCount: number): boolean => {
  const limits = getPlanLimits(plan);
  return currentCount < limits.products;
};

export const canAddGroup = (plan: string, currentCount: number): boolean => {
  const limits = getPlanLimits(plan);
  return currentCount < limits.groups;
};
