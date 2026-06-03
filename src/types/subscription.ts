export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'expired' | 'past_due' | 'canceled';
  billing_cycle: 'monthly' | 'semesterly' | 'annually';
  starts_at: string;
  expires_at: string;
  canceled_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PaymentTransaction {
  id: string;
  user_id: string;
  plan_id: string;
  billing_cycle: 'monthly' | 'semesterly' | 'annually';
  amount: number;
  currency: 'CUP' | 'USD';
  payment_method: string;
  transaction_reference?: string | null;
  receipt_url?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string | null;
  validated_by?: string | null;
  validated_at?: string | null;
  created_at?: string;
  users?: {
    nombre: string;
    phone: string;
  } | null;
}
