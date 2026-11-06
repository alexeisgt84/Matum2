export type CommissionStatus = 'pending' | 'approved' | 'paid' | 'cancelled';
export type AffiliateApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface CatalogAffiliate {
  id: string;
  catalog_id: string;
  user_id: string;
  status: AffiliateApplicationStatus;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    full_name: string | null;
    phone: string | null;
    payout_info: any | null;
    referral_code?: string | null;
  };
}

export interface Commission {
  id: string;
  catalog_id: string;
  affiliate_id: string;
  order_ref: string | null;
  sale_total: number;
  commission_total: number;
  currency: string;
  commission_cup?: number;
  commission_usd?: number;
  status: CommissionStatus;
  buyer_name: string | null;
  buyer_phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
  // Joins opcionales
  affiliate?: {
    id: string;
    full_name: string | null;
    phone: string | null;
    payout_info: any | null;
  };
  catalog?: {
    id: string;
    name: string;
    slug: string | null;
  };
}
