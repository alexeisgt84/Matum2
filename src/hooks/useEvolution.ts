import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { EvolutionInstance } from '../types/evolution';
import { toast } from 'react-hot-toast';

const EVOLUTION_URL = import.meta.env.VITE_EVOLUTION_DEFAULT_URL;
const EVOLUTION_KEY = import.meta.env.VITE_EVOLUTION_API_KEY;

export const useEvolution = (catalogId?: string) => {
  const { user } = useAuthStore();
  const [instance, setInstance] = useState<EvolutionInstance | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchLocalInstance = useCallback(async () => {
    if (!user) return;
    
    let query = supabase
      .from('evolution_instances')
      .select('*')
      .eq('user_id', user.id);
    
    if (catalogId) {
      query = query.eq('catalog_id', catalogId);
    } else {
      query = query.is('catalog_id', null);
    }

    const { data } = await query.maybeSingle();
    
    if (data) setInstance(data);
    else setInstance(null);
  }, [user, catalogId]);

  const createInstance = async (name: string) => {
    if (!user) return;
    setLoading(true);
    try {
      const cleanName = name.trim().replace(/\s+/g, '_');
      
      // Crear un token único para esta instancia específica
      // Usamos el ID del catálogo para asegurar que sea único por catálogo
      const instanceToken = catalogId ? `${user.id.slice(0, 8)}_${catalogId.slice(0, 8)}` : user.id;

      // 1. Intentar crear en Evolution API
      let response = await fetch(`${EVOLUTION_URL}/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_KEY
        },
        body: JSON.stringify({
          instanceName: cleanName,
          token: instanceToken,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS'
        })
      });

      let data = await response.json();

      // SI YA EXISTE (Efecto NEMU): Borrar y recrear
      if (response.status === 403 || (data.message && data.message.includes('already in use'))) {
        toast.loading('La instancia ya existe. Reiniciando...', { duration: 2000 });
        await fetch(`${EVOLUTION_URL}/instance/delete/${cleanName}`, {
          method: 'DELETE',
          headers: { 'apikey': EVOLUTION_KEY }
        });
        
        // Reintentar creación
        response = await fetch(`${EVOLUTION_URL}/instance/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': EVOLUTION_KEY
          },
          body: JSON.stringify({
            instanceName: cleanName,
            token: instanceToken,
            qrcode: true,
            integration: 'WHATSAPP-BAILEYS'
          })
        });
        data = await response.json();
      }

      if (!response.ok) throw new Error(data.message || 'Error al crear instancia');

      // Detectar la llave en diferentes versiones de la API
      const apiKey = (typeof data.hash === 'string' ? data.hash : data.hash?.apikey) 
                     || data.instance?.token 
                     || data.apikey 
                     || data.instance?.apikey;

      if (!apiKey) {
        throw new Error('La API no devolvió una llave (apikey) reconocida para la instancia');
      }

      // 2. Guardar en Supabase
      const upsertData: any = {
        user_id: user.id,
        catalog_id: catalogId || null,
        name: cleanName,
        instance_key: apiKey,
        status: 'pending'
      };

      // Si ya tenemos una instancia local cargada, usamos su ID para forzar el update del mismo registro
      if (instance?.id) {
        upsertData.id = instance.id;
      }

      const { data: dbData, error: dbError } = await supabase
        .from('evolution_instances')
        .upsert([upsertData], { onConflict: 'instance_key' })
        .select()
        .single();

      if (dbError) throw dbError;
      setInstance(dbData);
      toast.success('Instancia lista. Selecciona un método.');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getQR = async () => {
    if (!instance) return;
    try {
      const response = await fetch(`${EVOLUTION_URL}/instance/connect/${instance.name}`, {
        headers: { 'apikey': EVOLUTION_KEY }
      });
      const data = await response.json();
      if (data.base64) {
        setInstance({ ...instance, qrcode: data.base64 });
      }
    } catch (err) {
      console.error('Error fetching QR:', err);
    }
  };

  const getPairingCode = async (phoneNumber: string) => {
    if (!instance) return;
    setLoading(true);
    try {
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      
      // Efecto NEMU: Logout previo para limpiar el estado del QR y forzar el código
      await fetch(`${EVOLUTION_URL}/instance/logout/${instance.name}`, {
        method: 'DELETE',
        headers: { 'apikey': EVOLUTION_KEY }
      }).catch(() => {});
      
      // Delay recreando el estado
      await new Promise(r => setTimeout(r, 1000));

      const response = await fetch(`${EVOLUTION_URL}/instance/connect/${instance.name}?number=${cleanPhone}`, {
        headers: { 'apikey': EVOLUTION_KEY }
      });
      const data = await response.json();
      
      const code = data.pairingCode || data.code;
      if (code) {
        setInstance({ ...instance, pairing_code: code, qrcode: null });
        toast.success('Código generado con éxito');
      } else {
        throw new Error('No se pudo generar el código. Intenta de nuevo.');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const disconnectInstance = async () => {
    if (!instance) return;
    setLoading(true);
    try {
      // 1. Evolution API Logout & Delete
      await fetch(`${EVOLUTION_URL}/instance/logout/${instance.name}`, {
        method: 'DELETE',
        headers: { 'apikey': EVOLUTION_KEY }
      }).catch(() => {});
      
      await fetch(`${EVOLUTION_URL}/instance/delete/${instance.name}`, {
        method: 'DELETE',
        headers: { 'apikey': EVOLUTION_KEY }
      }).catch(() => {});

      // 2. Supabase Delete
      const { error } = await supabase
        .from('evolution_instances')
        .delete()
        .eq('id', instance.id);

      if (error) throw error;
      setInstance(null);
      toast.success('Instancia desconectada y eliminada');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async () => {
    if (!instance) return;
    try {
      const response = await fetch(`${EVOLUTION_URL}/instance/connectionState/${instance.name}`, {
        headers: { 'apikey': EVOLUTION_KEY }
      });
      const data = await response.json();
      const newStatus = data.instance?.state === 'open' ? 'connected' : 'pending';
      
      if (newStatus !== instance.status) {
        await supabase
          .from('evolution_instances')
          .update({ status: newStatus })
          .eq('id', instance.id);
        
        setInstance({ 
          ...instance, 
          status: newStatus as any, 
          qrcode: newStatus === 'connected' ? null : instance.qrcode,
          pairing_code: newStatus === 'connected' ? null : instance.pairing_code
        });
      }
    } catch (err) {
      console.error('Error checking status:', err);
    }
  };

  useEffect(() => {
    fetchLocalInstance();
  }, [fetchLocalInstance]);

  return { instance, loading, createInstance, getQR, getPairingCode, disconnectInstance, checkStatus, refresh: fetchLocalInstance };
};
