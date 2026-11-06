import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useProfileStore } from '../store/profileStore';
import { optimizeImage, blobToFile } from '../lib/imageOptimizer';
import { isOffline } from '../lib/offlineCache';

export const useProfile = () => {
  const { user } = useAuthStore();
  const { profile, loading, error, setProfile, setLoading, setError } = useProfileStore();

  const getProfile = async (force = false) => {
    if (!user) return;
    if (profile && profile.id === user.id && !force) {
      setLoading(false);
      return;
    }

    const cacheKey = `matum_cached_profile_${user.id}`;
    let fallbackProfile: any = null;
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) fallbackProfile = JSON.parse(raw);
    } catch {}

    if (!fallbackProfile) {
      fallbackProfile = {
        id: user.id,
        phone: user.phone,
        full_name: user.nombre,
        avatar_url: user.avatar_url,
        plan: user.plan,
        role: user.role,
        referral_code: user.referral_code,
        payout_info: user.payout_info,
      };
    }

    if (!profile || profile.id !== user.id) {
      setProfile(fallbackProfile);
    }

    if (isOffline()) {
      setLoading(false);
      return;
    }

    setLoading(false);
    try {
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError) throw fetchError;
      if (data) {
        setProfile(data);
        try {
          localStorage.setItem(cacheKey, JSON.stringify(data));
        } catch {}
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (nombre: string, avatarFile?: File, geminiApiKey?: string, geminiModel?: string) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      let avatar_url = profile?.avatar_url;

      if (avatarFile) {
        // Optimizar avatar (Tamaño cuadrado 400x400, calidad 0.7)
        const optimizedBlob = await optimizeImage(avatarFile, {
          maxWidth: 400,
          maxHeight: 400,
          quality: 0.7
        });

        // Usar una carpeta por usuario para mejor organización y control de RLS
        const fileName = `${user.id}/${Date.now()}.jpg`;
        const optimizedFile = blobToFile(optimizedBlob, fileName);

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, optimizedFile, { 
            contentType: 'image/jpeg',
            upsert: true 
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);
        
        avatar_url = publicUrl;
      }

      const updateData: any = { 
        full_name: nombre, 
        avatar_url,
        updated_at: new Date().toISOString()
      };

      if (geminiApiKey !== undefined) {
        updateData.gemini_api_key = geminiApiKey;
      }

      if (geminiModel !== undefined) {
        updateData.gemini_model = geminiModel;
      }

      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id);

      if (updateError) throw updateError;
      
      setProfile({ 
        ...profile, 
        full_name: nombre, 
        avatar_url, 
        ...(geminiApiKey !== undefined ? { gemini_api_key: geminiApiKey } : {}),
        ...(geminiModel !== undefined ? { gemini_model: geminiModel } : {})
      });
      return true;
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      // Limpiar perfil anterior de inmediato si cambió de usuario para evitar mostrar datos viejos
      if (profile && profile.id !== user.id) {
        setProfile(null);
      }
      getProfile();
    } else {
      // Limpiar el perfil si no hay usuario logueado
      if (profile !== null) {
        setProfile(null);
      }
    }
  }, [user?.id]);

  return { profile, loading, error, updateProfile, refresh: () => getProfile(true) };
};
