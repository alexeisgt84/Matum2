import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { WhatsAppGroup, EvolutionGroup } from '../types/whatsappGroup';
import { useEvolution } from './useEvolution';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-hot-toast';
import { callEvolutionProxy } from '../lib/api';

const STORAGE_KEY = 'matum_available_groups_cache';

const getGroupsCache = (): Record<string, { groups: EvolutionGroup[], timestamp: number }> => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    return {};
  }
};

const setGroupsCache = (cache: Record<string, { groups: EvolutionGroup[], timestamp: number }>) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.error('Error saving groups cache', e);
  }
};


export const useWhatsAppGroups = (catalogId?: string) => {
  const { user } = useAuthStore();
  const { instance } = useEvolution(catalogId);
  const [linkedGroups, setLinkedGroups] = useState<WhatsAppGroup[]>([]);
  const [availableGroups, setAvailableGroups] = useState<EvolutionGroup[]>([]);
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

    const cache = getGroupsCache();
    const instanceCache = cache[instance.name];
    
    // Si no es un refresco forzado y tenemos caché, la usamos
    if (!forceRefresh && instanceCache && instanceCache.groups.length > 0) {
      console.log('Usando grupos desde caché persistente para:', instance.name);
      setAvailableGroups(instanceCache.groups);
      return instanceCache.groups;
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
      
      const groups = Array.isArray(data) ? data : (data.groups || []);
      
      // Actualizar caché persistente
      const newCache = { ...cache, [instance.name]: { groups, timestamp: Date.now() } };
      setGroupsCache(newCache);
      
      setAvailableGroups(groups);
      return groups;
    } catch (err) {
      console.error('Error fetchAvailableGroups:', err);
      toast.error('Error al obtener grupos de WhatsApp');
      const cachedGroups = instanceCache?.groups || [];
      setAvailableGroups(cachedGroups);
      return cachedGroups; 
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

  return { 
    linkedGroups, 
    availableGroups, 
    loading, 
    getLinkedGroups, 
    fetchAvailableGroups, 
    linkGroup, 
    unlinkGroup 
  };
};
