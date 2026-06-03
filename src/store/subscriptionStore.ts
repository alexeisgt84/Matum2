import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { UserSubscription, PaymentTransaction } from '../types/subscription';

interface SubscriptionState {
  subscription: UserSubscription | null;
  transactions: PaymentTransaction[];
  pendingTransactions: PaymentTransaction[];
  loading: boolean;
  error: string | null;
  fetchSubscription: (userId: string) => Promise<void>;
  fetchTransactions: (userId: string) => Promise<void>;
  createTransaction: (
    userId: string,
    data: {
      plan_id: string;
      billing_cycle: 'monthly' | 'semesterly' | 'annually';
      amount: number;
      currency: 'CUP' | 'USD';
      payment_method: string;
      transaction_reference?: string;
    },
    receiptFile: File
  ) => Promise<void>;
  
  // Admin functions
  fetchPendingTransactions: () => Promise<void>;
  approveTransaction: (transactionId: string, adminId: string) => Promise<void>;
  rejectTransaction: (transactionId: string, adminId: string, reason: string) => Promise<void>;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  subscription: null,
  transactions: [],
  pendingTransactions: [],
  loading: false,
  error: null,

  fetchSubscription: async (userId) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      set({ subscription: data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  fetchTransactions: async (userId) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ transactions: data || [], loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  createTransaction: async (userId, data, receiptFile) => {
    set({ loading: true, error: null });
    try {
      // 1. Cargar el comprobante a Supabase Storage
      const fileExt = receiptFile.name.split('.').pop();
      const fileName = `receipts/${userId}/${Date.now()}_receipt.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, receiptFile);

      if (uploadError) throw uploadError;

      // 2. Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);

      const receiptUrl = urlData.publicUrl;

      // 3. Crear la transacción en la base de datos
      const { error: insertError } = await supabase
        .from('payment_transactions')
        .insert([{
          user_id: userId,
          plan_id: data.plan_id,
          billing_cycle: data.billing_cycle,
          amount: data.amount,
          currency: data.currency,
          payment_method: data.payment_method,
          transaction_reference: data.transaction_reference || null,
          receipt_url: receiptUrl,
          status: 'pending'
        }]);

      if (insertError) throw insertError;
      
      // Refrescar transacciones del usuario
      await get().fetchTransactions(userId);
      set({ loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  fetchPendingTransactions: async () => {
    set({ loading: true, error: null });
    try {
      // Obtener transacciones pendientes con datos del usuario
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*, users!payment_transactions_user_id_fkey(full_name, phone)')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;
      set({ pendingTransactions: data || [], loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  approveTransaction: async (transactionId, adminId) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.rpc('approve_payment_transaction', {
        target_transaction_id: transactionId,
        admin_id: adminId
      });

      if (error) throw error;
      if (!data) throw new Error('No se pudo aprobar la transacción (posiblemente ya procesada).');

      // Refrescar transacciones pendientes
      await get().fetchPendingTransactions();
      set({ loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  rejectTransaction: async (transactionId, adminId, reason) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.rpc('reject_payment_transaction', {
        target_transaction_id: transactionId,
        admin_id: adminId,
        reason: reason
      });

      if (error) throw error;
      if (!data) throw new Error('No se pudo rechazar la transacción (posiblemente ya procesada).');

      // Refrescar transacciones pendientes
      await get().fetchPendingTransactions();
      set({ loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  }
}));
