import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { WhatsAppGroup, EvolutionGroup } from '../types/whatsappGroup';
import { useEvolution } from './useEvolution';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-hot-toast';

const EVOLUTION_URL = import.meta.env.VITE_EVOLUTION_DEFAULT_URL;
const EVOLUTION_KEY = import.meta.env.VITE_EVOLUTION_API_KEY;

let groupsCache: EvolutionGroup[] | null = null;
let lastFetch = 0;
const CACHE_TIME = 2 * 60 * 1000; // 2 minutos

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
    if (!instance || instance.status !== 'connected') {
      toast.error('WhatsApp no está conectado');
      return [];
    }

    const now = Date.now();
    if (!forceRefresh && groupsCache && (now - lastFetch < CACHE_TIME)) {
      console.log('Usando grupos desde caché');
      return groupsCache;
    }

    setLoading(true);
    try {
      console.log('Fetching groups from Evolution API...');
      const response = await fetch(`${EVOLUTION_URL}/group/fetchAllGroups/${instance.name}?getParticipants=false`, {
        headers: { 'apikey': EVOLUTION_KEY }
      });
      
      if (!response.ok) throw new Error('Error en API de Evolution');
      
      const data = await response.json();
      console.log('Respuesta de Grupos API:', data);
      
      // Evolution API puede devolver el array directo o dentro de un objeto { groups: [...] }
      const groups = Array.isArray(data) ? data : (data.groups || []);
      
      // Actualizar caché
      groupsCache = groups;
      lastFetch = now;
      
      return groups;
    } catch (err) {
      console.error('Error fetchAvailableGroups:', err);
      toast.error('Error al obtener grupos de WhatsApp');
      return groupsCache || []; // Devolver caché si falla el refresh
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
