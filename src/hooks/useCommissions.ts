import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Commission, CommissionStatus, CatalogAffiliate, AffiliateApplicationStatus } from '../types/commission';
import { toast } from 'react-hot-toast';

export const useCommissions = () => {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [catalogAffiliates, setCatalogAffiliates] = useState<CatalogAffiliate[]>([]);
  const [myAffiliation, setMyAffiliation] = useState<CatalogAffiliate | null>(null);
  const [loading, setLoading] = useState(false);

  // Obtener comisiones de un catálogo (para el dueño)
  const getCatalogCommissions = useCallback(async (catalogId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('commissions')
        .select(`
          *,
          affiliate:users!commissions_affiliate_id_fkey (
            id,
            full_name,
            phone,
            payout_info
          )
        `)
        .eq('catalog_id', catalogId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCommissions(data || []);
      return data || [];
    } catch (err: any) {
      console.error('Error fetching catalog commissions:', err);
      toast.error('Error al cargar comisiones: ' + err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Obtener comisiones propias (para el promotor / afiliado)
  const getMyCommissions = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('commissions')
        .select(`
          *,
          catalog:catalogs!commissions_catalog_id_fkey (
            id,
            name,
            slug
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCommissions(data || []);
      return data || [];
    } catch (err: any) {
      console.error('Error fetching my commissions:', err);
      toast.error('Error al cargar tus comisiones: ' + err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Cambiar estado de una comisión (aprobar, pagar, cancelar)
  const updateCommissionStatus = async (
    commissionId: string,
    status: CommissionStatus,
    notes?: string
  ) => {
    setLoading(true);
    try {
      const updatePayload: any = { status };
      if (status === 'paid') {
        updatePayload.paid_at = new Date().toISOString();
      }
      if (notes !== undefined) {
        updatePayload.notes = notes;
      }

      const { error } = await supabase
        .from('commissions')
        .update(updatePayload)
        .eq('id', commissionId);

      if (error) throw error;

      setCommissions((prev) =>
        prev.map((c) =>
          c.id === commissionId
            ? { ...c, status, notes: notes ?? c.notes, paid_at: updatePayload.paid_at ?? c.paid_at }
            : c
        )
      );

      const statusLabels: Record<CommissionStatus, string> = {
        approved: 'Comisión aprobada',
        paid: 'Comisión marcada como pagada',
        cancelled: 'Comisión cancelada',
        pending: 'Comisión restablecida a pendiente',
      };

      toast.success(statusLabels[status] || 'Estado actualizado');
      return true;
    } catch (err: any) {
      console.error('Error updating commission status:', err);
      toast.error('Error al actualizar estado: ' + err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Registrar una nueva comisión pendiente desde el checkout
  const registerPendingCommission = async (params: {
    catalogId: string;
    referralCode: string;
    orderRef: string;
    saleTotal: number;
    currency: string;
    buyerName?: string;
    buyerPhone?: string;
    commissionCup?: number;
    commissionUsd?: number;
  }) => {
    try {
      // 1. Buscar el usuario correspondiente al referral_code
      const { data: affiliateUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('referral_code', params.referralCode)
        .maybeSingle();

      if (userError || !affiliateUser) {
        console.warn('Affiliate user not found for code:', params.referralCode);
        return null;
      }

      // 2. Obtener la configuración del catálogo
      const { data: catalog, error: catError } = await supabase
        .from('catalogs')
        .select('enable_affiliates')
        .eq('id', params.catalogId)
        .single();

      if (catError || !catalog || !catalog.enable_affiliates) {
        console.log('Affiliates not enabled for this catalog');
        return null;
      }

      // 2b. Verificar que el promotor sea un afiliado APROBADO por el dueño del catálogo
      const { data: approvedAffiliate, error: affCheckError } = await supabase
        .from('catalog_affiliates')
        .select('id, status')
        .eq('catalog_id', params.catalogId)
        .eq('user_id', affiliateUser.id)
        .eq('status', 'approved')
        .maybeSingle();

      if (affCheckError || !approvedAffiliate) {
        console.warn('El usuario no es un afiliado aprobado en este catálogo:', params.referralCode);
        return null;
      }

      const commissionCup = Math.round((params.commissionCup || 0) * 100) / 100;
      const commissionUsd = Math.round((params.commissionUsd || 0) * 100) / 100;
      const totalAmount = commissionCup > 0 ? commissionCup : commissionUsd;
      const primaryCurr = commissionCup > 0 ? 'CUP' : 'USD';

      // 3. Insertar en la tabla commissions
      const { data: newCommission, error: insertError } = await supabase
        .from('commissions')
        .insert({
          catalog_id: params.catalogId,
          affiliate_id: affiliateUser.id,
          order_ref: params.orderRef,
          sale_total: params.saleTotal,
          commission_total: totalAmount,
          currency: primaryCurr,
          commission_cup: commissionCup,
          commission_usd: commissionUsd,
          status: 'pending',
          buyer_name: params.buyerName || null,
          buyer_phone: params.buyerPhone || null,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting pending commission:', insertError);
        return null;
      }

      return newCommission;
    } catch (err) {
      console.error('Unexpected error in registerPendingCommission:', err);
      return null;
    }
  };

  // Consultar estado de afiliación de un usuario en un catálogo (para la vista tienda)
  const checkAffiliateStatus = useCallback(async (catalogId: string, userId?: string) => {
    if (!catalogId || !userId) {
      setMyAffiliation(null);
      return null;
    }
    try {
      const { data, error } = await supabase
        .from('catalog_affiliates')
        .select(`
          id,
          catalog_id,
          user_id,
          status,
          created_at,
          updated_at
        `)
        .eq('catalog_id', catalogId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking affiliate status:', error);
      }
      setMyAffiliation(data || null);
      return data || null;
    } catch (err) {
      console.error('Error checking affiliate status:', err);
      setMyAffiliation(null);
      return null;
    }
  }, []);

  // Postularse para ser afiliado desde la tienda
  const applyForAffiliation = async (catalogId: string, fallbackUserId?: string) => {
    setLoading(true);
    try {
      // 1. Verificar si hay sesión activa en Supabase Auth
      let { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (!session?.user || sessionError) {
        // Intentar refrescar la sesión si hay token guardado
        try {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError && refreshData?.session?.user) {
            session = refreshData.session;
          }
        } catch {
          // fallo al refrescar
        }
      }

      if (!session?.user) {
        toast.error('Debes iniciar sesión con tu cuenta para ser afiliado');
        return { requireLogin: true };
      }

      const activeUserId = session.user.id;

      // 2. Intentar llamar a la RPC segura apply_for_affiliation
      try {
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('apply_for_affiliation', { p_catalog_id: catalogId });

        if (!rpcError && rpcData) {
          const formatted = (typeof rpcData === 'object' ? rpcData : JSON.parse(rpcData)) as CatalogAffiliate;
          setMyAffiliation(formatted);
          toast.success('¡Solicitud de afiliado enviada con éxito! Espera la aprobación del dueño de la tienda.');
          return formatted;
        }

        // Si la RPC devolvió un error de negocio legible
        if (rpcError && rpcError.message && !rpcError.message.includes('function') && !rpcError.message.includes('schema cache')) {
          toast.error(rpcError.message);
          return null;
        }
      } catch (rpcErr) {
        // Continuar con fallback directo
      }

      // 3. Fallback: Inserción directa en catalog_affiliates usando el ID real de Supabase Auth
      const { data, error } = await supabase
        .from('catalog_affiliates')
        .insert({
          catalog_id: catalogId,
          user_id: activeUserId,
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('Ya has enviado una solicitud para este catálogo');
        } else if (error.code === '42501' || error.message?.toLowerCase().includes('row-level')) {
          toast.error('Tu sesión ha expirado o no tienes permisos. Por favor inicia sesión nuevamente.');
          return { requireLogin: true };
        } else {
          throw error;
        }
        return null;
      }

      setMyAffiliation(data);
      toast.success('¡Solicitud de afiliado enviada con éxito! Espera la aprobación del dueño de la tienda.');
      return data;
    } catch (err: any) {
      console.error('Error applying for affiliation:', err);
      const msg = err.message || '';
      if (msg.toLowerCase().includes('row-level')) {
        toast.error('Tu sesión ha expirado o no tienes permisos. Por favor inicia sesión.');
        return { requireLogin: true };
      }
      toast.error('Error al enviar solicitud: ' + (msg || 'Error inesperado'));
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Obtener todos los afiliados y postulaciones de un catálogo (para el dueño)
  const getCatalogAffiliates = useCallback(async (catalogId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('catalog_affiliates')
        .select(`
          *,
          user:users (
            id,
            full_name,
            phone,
            payout_info,
            referral_code
          )
        `)
        .eq('catalog_id', catalogId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCatalogAffiliates(data || []);
      return data || [];
    } catch (err: any) {
      console.error('Error fetching catalog affiliates:', err);
      toast.error('Error al cargar afiliados: ' + err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Actualizar estado de una postulación (aprobar o rechazar)
  const updateAffiliateStatus = async (
    affiliateRecordId: string,
    status: AffiliateApplicationStatus
  ) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('catalog_affiliates')
        .update({ status })
        .eq('id', affiliateRecordId);

      if (error) throw error;

      setCatalogAffiliates((prev) =>
        prev.map((item) =>
          item.id === affiliateRecordId ? { ...item, status } : item
        )
      );

      const msg = status === 'approved' ? 'Afiliado aprobado' : 'Solicitud rechazada';
      toast.success(msg);
      return true;
    } catch (err: any) {
      console.error('Error updating affiliate status:', err);
      toast.error('Error al actualizar estado: ' + err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Agregar un afiliado directamente por teléfono
  const addAffiliateByPhone = async (catalogId: string, phone: string) => {
    setLoading(true);
    try {
      const cleanPhone = phone.trim();
      const { data: targetUser, error: userErr } = await supabase
        .from('users')
        .select('id, full_name, phone')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (userErr || !targetUser) {
        toast.error('No se encontró ningún usuario registrado con ese número de teléfono');
        return false;
      }

      const { data, error } = await supabase
        .from('catalog_affiliates')
        .upsert(
          {
            catalog_id: catalogId,
            user_id: targetUser.id,
            status: 'approved'
          },
          { onConflict: 'catalog_id,user_id' }
        )
        .select(`
          *,
          user:users (
            id,
            full_name,
            phone,
            payout_info,
            referral_code
          )
        `)
        .single();

      if (error) throw error;

      setCatalogAffiliates((prev) => {
        const filtered = prev.filter((a) => a.user_id !== targetUser.id);
        return [data, ...filtered];
      });

      toast.success(`¡${targetUser.full_name || cleanPhone} agregado como afiliado aprobado!`);
      return true;
    } catch (err: any) {
      console.error('Error adding affiliate by phone:', err);
      toast.error('Error al agregar afiliado: ' + err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Eliminar o desvincular a un afiliado
  const removeAffiliate = async (affiliateRecordId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('catalog_affiliates')
        .delete()
        .eq('id', affiliateRecordId);

      if (error) throw error;

      setCatalogAffiliates((prev) => prev.filter((a) => a.id !== affiliateRecordId));
      toast.success('Afiliado desvinculado');
      return true;
    } catch (err: any) {
      console.error('Error removing affiliate:', err);
      toast.error('Error al desvincular afiliado: ' + err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    commissions,
    catalogAffiliates,
    myAffiliation,
    loading,
    getCatalogCommissions,
    getMyCommissions,
    updateCommissionStatus,
    registerPendingCommission,
    checkAffiliateStatus,
    applyForAffiliation,
    getCatalogAffiliates,
    updateAffiliateStatus,
    addAffiliateByPhone,
    removeAffiliate,
  };
};
