import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { optimizeImage, blobToFile } from '../lib/imageOptimizer';

export const useProfile = () => {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError) throw fetchError;
      setProfile(data);
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
    getProfile();
  }, [user?.id]);

  return { profile, loading, error, updateProfile, refresh: getProfile };
};
