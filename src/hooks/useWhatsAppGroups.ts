import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { WhatsAppGroup, EvolutionGroup } from '../types/whatsappGroup';
import { useEvolution } from './useEvolution';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-hot-toast';
import { callEvolutionProxy } from '../lib/api';

const CACHE_TIME = 2 * 60 * 1000; // 2 minutos
const groupsCache: Record<string, { groups: EvolutionGroup[], timestamp: number }> = {};

export const useWhatsAppGroups = (catalogId?: string) => {
  const { user } = useAuthStore();
  const { instance } = useEvolution(catalogId);
  const [linkedGroups, setLinkedGroups] = useState<WhatsAppGroup[]>([]);
  const [loading, setLoading] = useState(false);

  const getLinkedGroups = useCallback(async () => {
    if (!catalogId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('whatsapp_groups')
        .select('*')
        .eq('catalog_id', catalogId);
      
      if (error) throw error;
      setLinkedGroups(data || []);
    } catch (err: any) {
      toast.error('Error al cargar grupos vinculados');
    } finally {
      setLoading(false);
    }
  }, [catalogId]);

  const fetchAvailableGroups = async (forceRefresh = false): Promise<EvolutionGroup[]> => {
    if (!instance || instance.status !== 'connected' || !instance.server_id) {
      toast.error('WhatsApp no está conectado');
      return [];
    }

    const now = Date.now();
    const cache = groupsCache[instance.name];
    
    if (!forceRefresh && cache && (now - cache.timestamp < CACHE_TIME)) {
      console.log('Usando grupos desde caché para:', instance.name);
      return cache.groups;
    }

    setLoading(true);
    try {
      console.log('Fetching groups from Evolution Proxy for:', instance.name);
      
      const data = await callEvolutionProxy(
        instance.server_id,
        `/group/fetchAllGroups/${instance.name}?getParticipants=false`,
        'GET',
        null,
        null
      );
      
      console.log('Respuesta de Grupos API (Proxy):', data);
      
      // Evolution API puede devolver el array directo o dentro de un objeto { groups: [...] }
      const groups = Array.isArray(data) ? data : (data.groups || []);
      
      // Actualizar caché
      groupsCache[instance.name] = {
        groups,
        timestamp: now
      };
      
      return groups;
    } catch (err) {
      console.error('Error fetchAvailableGroups:', err);
      toast.error('Error al obtener grupos de WhatsApp');
      return groupsCache[instance.name]?.groups || []; // Devolver caché si falla el refresh
    } finally {
      setLoading(false);
    }
  };

  const linkGroup = async (group: EvolutionGroup) => {
    if (!catalogId) return;
    try {
      const { error } = await supabase
        .from('whatsapp_groups')
        .upsert([{
          user_id: user?.id, 
          catalog_id: catalogId,
          group_id: group.id,
          group_jid: group.id,
          name: group.subject,
          is_active: true
        }], { onConflict: 'user_id,group_jid' });
      
      if (error) throw error;
      toast.success(`Grupo "${group.subject}" vinculado`);
      getLinkedGroups();
    } catch (err: any) {
      console.error('Error linking group:', err);
      toast.error('Error al vincular grupo: ' + (err.message || 'Error desconocido'));
    }
  };

  const unlinkGroup = async (id: string) => {
    try {
      const { error } = await supabase.from('whatsapp_groups').delete().eq('id', id);
      if (error) throw error;
      setLinkedGroups(linkedGroups.filter(g => g.id !== id));
      toast.success('Grupo desvinculado');
    } catch (err) {
      toast.error('Error al desvincular');
    }
  };

  return { linkedGroups, loading, getLinkedGroups, fetchAvailableGroups, linkGroup, unlinkGroup };
};
