import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-hot-toast';
import type { Catalog } from '../types/catalog';

export interface CatalogMember {
  id: string;
  catalog_id: string;
  user_id: string | null;
  invited_phone: string;
  role: 'owner' | 'collaborator';
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  user_profile?: {
    full_name: string;
  } | null;
}

export interface FollowRequest {
  id: string;
  catalog_id: string;
  user_id: string | null;
  invited_phone: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  catalog: Catalog;
}

export const useCollaboration = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<CatalogMember[]>([]);
  const [pendingFollowRequests, setPendingFollowRequests] = useState<FollowRequest[]>([]);
  const [pendingMemberInvitations, setPendingMemberInvitations] = useState<CatalogMember[]>([]);

  // 1. Obtener miembros colaboradores de un catálogo
  const getCatalogMembers = useCallback(async (catalogId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('catalog_members')
        .select(`
          *,
          user_profile:users(full_name)
        `)
        .eq('catalog_id', catalogId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMembers(data || []);
    } catch (err: any) {
      toast.error('Error al obtener miembros: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. Invitar a un miembro colaborador por número de teléfono
  const inviteMember = async (catalogId: string, rawPhone: string) => {
    if (!user) return false;
    let cleanPhone = rawPhone.replace(/\D/g, '');
    if (cleanPhone.length === 8) {
      cleanPhone = '53' + cleanPhone;
    }
    if (!cleanPhone) {
      toast.error('Número de teléfono inválido');
      return false;
    }

    setLoading(true);
    try {
      // Intentar buscar si el usuario ya está registrado por número de teléfono
      const { data: registeredUser } = await supabase
        .from('users')
        .select('id, phone')
        .eq('phone', cleanPhone)
        .maybeSingle();

      const insertData = {
        catalog_id: catalogId,
        invited_phone: cleanPhone,
        user_id: registeredUser?.id || null,
        status: 'pending',
        role: 'collaborator'
      };

      const { error } = await supabase
        .from('catalog_members')
        .insert([insertData]);

      if (error) {
        if (error.code === '23505') {
          throw new Error('Este número de teléfono ya ha sido invitado a este catálogo');
        }
        throw error;
      }

      toast.success('Invitación enviada al colaborador');
      getCatalogMembers(catalogId);
      return true;
    } catch (err: any) {
      toast.error('Error al invitar: ' + err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 3. Eliminar o cancelar membresía/invitación
  const removeMember = async (catalogId: string, membershipId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('catalog_members')
        .delete()
        .eq('id', membershipId);

      if (error) throw error;
      toast.success('Miembro eliminado');
      getCatalogMembers(catalogId);
      return true;
    } catch (err: any) {
      toast.error('Error al eliminar miembro: ' + err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 4. Obtener invitaciones de colaboración recibidas y pendientes
  const getPendingMemberInvitations = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const cleanPhone = user.phone.replace(/\D/g, '');
      const { data, error } = await supabase
        .from('catalog_members')
        .select(`
          *,
          catalog:catalogs(*)
        `)
        .or(`user_id.eq.${user.id},invited_phone.eq.${cleanPhone}`)
        .eq('status', 'pending');

      if (error) throw error;
      setPendingMemberInvitations(data || []);
    } catch (err: any) {
      console.error('Error al cargar invitaciones de membresía:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 5. Aceptar/Rechazar invitación de colaboración
  const respondToMemberInvitation = async (membershipId: string, status: 'accepted' | 'rejected') => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('catalog_members')
        .update({ status, user_id: user?.id })
        .eq('id', membershipId);

      if (error) throw error;
      
      if (status === 'accepted') {
        toast.success('Colaboración aceptada');
      } else {
        toast.success('Invitación rechazada');
      }
      getPendingMemberInvitations();
      return true;
    } catch (err: any) {
      toast.error('Error al responder: ' + err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 6. Invitar a un seguidor por teléfono
  const inviteFollower = async (catalogId: string, rawPhone: string) => {
    if (!user) return false;
    let cleanPhone = rawPhone.replace(/\D/g, '');
    if (cleanPhone.length === 8) {
      cleanPhone = '53' + cleanPhone;
    }
    if (!cleanPhone) {
      toast.error('Número de teléfono inválido');
      return false;
    }

    setLoading(true);
    try {
      // Buscar si el seguidor ya existe
      const { data: registeredUser } = await supabase
        .from('users')
        .select('id')
        .eq('phone', cleanPhone)
        .maybeSingle();

      const { error } = await supabase
        .from('followed_catalogs')
        .insert([{
          catalog_id: catalogId,
          invited_phone: cleanPhone,
          user_id: registeredUser?.id || null,
          status: 'pending'
        }]);

      if (error) {
        if (error.code === '23505') {
          throw new Error('Ya se ha enviado una solicitud a este número de teléfono');
        }
        throw error;
      }

      toast.success('Solicitud de seguimiento enviada');
      return true;
    } catch (err: any) {
      toast.error('Error al invitar seguidor: ' + err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 7. Obtener solicitudes de seguimiento recibidas pendientes
  const getPendingFollowRequests = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const cleanPhone = user.phone.replace(/\D/g, '');
      const { data, error } = await supabase
        .from('followed_catalogs')
        .select(`
          id,
          catalog_id,
          user_id,
          invited_phone,
          status,
          created_at,
          catalog:catalogs(*)
        `)
        .or(`user_id.eq.${user.id},invited_phone.eq.${cleanPhone}`)
        .eq('status', 'pending');

      if (error) throw error;
      
      // Filtrar y estructurar solicitudes válidas
      const requests = (data || []).map((item: any) => ({
        id: item.id,
        catalog_id: item.catalog_id,
        user_id: item.user_id,
        invited_phone: item.invited_phone,
        status: item.status,
        created_at: item.created_at,
        catalog: item.catalog
      })) as FollowRequest[];

      setPendingFollowRequests(requests);
    } catch (err: any) {
      console.error('Error al obtener solicitudes de seguimiento:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 8. Aceptar/Rechazar solicitud de seguimiento
  const respondToFollowRequest = async (followId: string, status: 'accepted' | 'rejected') => {
    setLoading(true);
    try {
      if (status === 'accepted') {
        const { error } = await supabase
          .from('followed_catalogs')
          .update({ status, user_id: user?.id })
          .eq('id', followId);

        if (error) throw error;
        toast.success('Solicitud de seguimiento aceptada');
      } else {
        // En lugar de guardar "rejected", eliminamos para liberar el espacio o actualizamos
        const { error } = await supabase
          .from('followed_catalogs')
          .delete()
          .eq('id', followId);

        if (error) throw error;
        toast.success('Solicitud rechazada');
      }
      getPendingFollowRequests();
      return true;
    } catch (err: any) {
      toast.error('Error al procesar solicitud: ' + err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    members,
    pendingFollowRequests,
    pendingMemberInvitations,
    getCatalogMembers,
    inviteMember,
    removeMember,
    getPendingMemberInvitations,
    respondToMemberInvitation,
    inviteFollower,
    getPendingFollowRequests,
    respondToFollowRequest
  };
};
