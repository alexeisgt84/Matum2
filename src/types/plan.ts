export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  price_cup: number;
  price_usd: number;
  catalogs_limit: number;
  products_limit: number;
  groups_limit: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}
