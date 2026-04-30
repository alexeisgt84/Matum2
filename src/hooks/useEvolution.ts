import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { EvolutionInstance } from '../types/evolution';
import { toast } from 'react-hot-toast';

import { callEvolutionProxy } from '../lib/api';

export const useEvolution = (catalogId?: string) => {
  const { user } = useAuthStore();
  const [instance, setInstance] = useState<EvolutionInstance & { server_id?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [availableServers, setAvailableServers] = useState<any[]>([]);
  
  // Ref para evitar ciclos de renderizado con checkStatus
  const isCheckingStatus = useRef(false);

  const fetchServers = useCallback(async () => {
    try {
      const { data } = await supabase.from('available_evolution_servers').select('*');
      if (data) setAvailableServers(data);
    } catch (err) {
      console.error('Error fetching servers:', err);
    }
  }, []);

  const fetchLocalInstance = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      let query = supabase
        .from('evolution_instances')
        .select('*')
        .eq('user_id', user.id);
      
      if (catalogId) {
        query = query.eq('catalog_id', catalogId);
      } else {
        query = query.is('catalog_id', null);
      }

      const { data, error } = await query.maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      
      setInstance(data || null);
    } catch (err) {
      console.error('Error fetching local instance:', err);
    }
  }, [user?.id, catalogId]);

  const callProxy = useCallback(async (serverId: string, endpoint: string, method: string = 'GET', body: any = null, instanceName: string | null = null) => {
    return callEvolutionProxy(serverId, endpoint, method, body, instanceName);
  }, []);

  const createInstance = async (name: string, serverId: string) => {
    if (!user || !serverId) return;
    setLoading(true);
    try {
      const cleanName = name.trim().replace(/\s+/g, '_');
      const instanceToken = catalogId ? `${user.id.slice(0, 8)}_${catalogId.slice(0, 8)}` : user.id;

      let data;
      try {
        data = await callProxy(serverId, '/instance/create', 'POST', {
          instanceName: cleanName,
          token: instanceToken,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS'
        });
      } catch (err: any) {
        console.warn('Intento de recreación por error:', err);
        await callProxy(serverId, `/instance/delete`, 'DELETE', null, cleanName).catch(() => {});
        data = await callProxy(serverId, '/instance/create', 'POST', {
          instanceName: cleanName,
          token: instanceToken,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS'
        });
      }

      const apiKey = data?.hash || data?.instance?.token || data?.apikey;
      if (!apiKey) throw new Error('No se recibió la API Key del servidor');

      const upsertData: any = {
        user_id: user.id,
        catalog_id: catalogId || null,
        name: cleanName,
        instance_key: typeof apiKey === 'string' ? apiKey : apiKey.apikey,
        status: 'pending',
        server_id: serverId
      };

      if (instance?.id) upsertData.id = instance.id;

      const { data: dbData, error: dbError } = await supabase
        .from('evolution_instances')
        .upsert([upsertData], { onConflict: 'instance_key' })
        .select()
        .single();

      if (dbError) throw dbError;
      setInstance(dbData);
      toast.success('Instancia lista');
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getQR = async () => {
    if (!instance?.server_id || !instance?.name) return;
    try {
      const data = await callProxy(instance.server_id, '/instance/connect', 'GET', null, instance.name);
      if (data.base64) {
        setInstance(prev => prev ? { ...prev, qrcode: data.base64 } : null);
      }
    } catch (err) {
      console.error('QR Error:', err);
    }
  };

  const getPairingCode = async (phoneNumber: string) => {
    if (!instance?.server_id || !instance?.name) return;
    setLoading(true);
    try {
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      await callProxy(instance.server_id, `/instance/logout`, 'DELETE', null, instance.name).catch(() => {});
      await new Promise(r => setTimeout(r, 1000));

      const data = await callProxy(instance.server_id, `/instance/connect`, 'GET', null, `${instance.name}?number=${cleanPhone}`);
      const code = data.pairingCode || data.code;
      if (code) {
        setInstance(prev => prev ? { ...prev, pairing_code: code, qrcode: null } : null);
        toast.success('Código generado');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const disconnectInstance = async () => {
    if (!instance?.server_id || !instance?.id) return;
    setLoading(true);
    try {
      await callProxy(instance.server_id, `/instance/logout`, 'DELETE', null, instance.name).catch(() => {});
      await callProxy(instance.server_id, `/instance/delete`, 'DELETE', null, instance.name).catch(() => {});
      await supabase.from('evolution_instances').delete().eq('id', instance.id);
      setInstance(null);
      toast.success('Desconectado');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = useCallback(async () => {
    if (!instance?.server_id || !instance?.name || isCheckingStatus.current) return;
    isCheckingStatus.current = true;
    try {
      const data = await callProxy(instance.server_id, '/instance/connectionState', 'GET', null, instance.name);
      const newStatus = data.instance?.state === 'open' ? 'connected' : 'pending';
      
      if (newStatus !== instance.status) {
        await supabase.from('evolution_instances').update({ status: newStatus }).eq('id', instance.id);
        setInstance(prev => prev ? { ...prev, status: newStatus as any } : null);
      }
    } catch (err) {
      console.error('Status Error:', err);
    } finally {
      isCheckingStatus.current = false;
    }
  }, [instance?.id, instance?.status, instance?.server_id, instance?.name, callProxy]);

  useEffect(() => {
    fetchLocalInstance();
    fetchServers();
  }, [fetchLocalInstance, fetchServers]);

  return { instance, loading, availableServers, createInstance, getQR, getPairingCode, disconnectInstance, checkStatus, refresh: fetchLocalInstance };
};
