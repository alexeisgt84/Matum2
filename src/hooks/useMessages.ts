import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { WhatsAppMessage, MessageForm } from '../types/message';
import { toast } from 'react-hot-toast';
import { optimizeImage, blobToFile } from '../lib/imageOptimizer';
import { isOffline, isNetworkError, saveCachedList, getCachedList, cacheImageUrls } from '../lib/offlineCache';

export const useMessages = (catalogId?: string) => {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const getMessages = useCallback(async () => {
    if (!catalogId) return;
    const cacheKey = `messages_${catalogId}`;
    const cached = await getCachedList<WhatsAppMessage[]>(cacheKey);

    if (cached && cached.length > 0) {
      setMessages(cached);
    }

    if (isOffline()) {
      setLoading(false);
      return;
    }

    setLoading(!cached || cached.length === 0);
    try {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('catalog_id', catalogId)
        .order('sequence_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;
      const msgs = data || [];
      setMessages(msgs);
      await saveCachedList(cacheKey, msgs);
      cacheImageUrls(msgs.map((m: any) => m.image_url));
    } catch (err: any) {
      if (cached) {
        setMessages(cached);
      }
      if (!isNetworkError(err)) {
        toast.error('Error al cargar mensajes: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [catalogId]);

  const saveMessage = async (form: MessageForm, id?: string, file?: File) => {
    if (!catalogId) return;
    setLoading(true);
    try {
      let image_url = form.image_url;

      if (file) {
        const optimizedBlob = await optimizeImage(file, {
          maxWidth: 1000,
          maxHeight: 1000,
          quality: 0.8,
        });

        const fileName = `messages/${catalogId}/${Date.now()}.jpg`;
        const optimizedFile = blobToFile(optimizedBlob, fileName);

        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(fileName, optimizedFile, {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(fileName);
        image_url = publicUrl;
      }

      if (id) {
        const { error } = await supabase
          .from('whatsapp_messages')
          .update({ ...form, image_url, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('whatsapp_messages')
          .insert([{ ...form, catalog_id: catalogId, image_url, updated_at: new Date().toISOString() }]);
        if (error) throw error;
      }

      toast.success(id ? 'Mensaje actualizado' : 'Mensaje creado');
      getMessages();
      return true;
    } catch (err: any) {
      toast.error('Error al guardar: ' + err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteMessage = async (id: string) => {
    try {
      const { error } = await supabase.from('whatsapp_messages').delete().eq('id', id);
      if (error) throw error;
      const updated = messages.filter((m) => m.id !== id);
      setMessages(updated);
      if (catalogId) {
        await saveCachedList(`messages_${catalogId}`, updated);
      }
      toast.success('Mensaje eliminado');
    } catch (err: any) {
      toast.error('Error al eliminar');
    }
  };

  const updateMessagesOrder = async (orderedMessages: WhatsAppMessage[]) => {
    const previousMessages = [...messages];

    const updatedIds = new Set(orderedMessages.map((m) => m.id));
    const newMessages = [
      ...messages.filter((m) => !updatedIds.has(m.id)),
      ...orderedMessages.map((msg, index) => ({ ...msg, sequence_order: index })),
    ].sort((a, b) => {
      if ((a.sequence_order || 0) !== (b.sequence_order || 0)) {
        return (a.sequence_order || 0) - (b.sequence_order || 0);
      }
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    setMessages(newMessages);

    try {
      const updates = orderedMessages.map((msg, index) => ({
        ...msg,
        sequence_order: index,
      }));

      const { error } = await supabase.from('whatsapp_messages').upsert(updates);

      if (error) {
        console.error('Error in upsert:', error);
        throw error;
      }

      if (catalogId) {
        await saveCachedList(`messages_${catalogId}`, newMessages);
      }
      toast.success('Orden actualizado');
    } catch (err: any) {
      console.error('Update Order Error:', err);
      setMessages(previousMessages);
      toast.error('Error al actualizar el orden: ' + (err.message || 'Error desconocido'));
    }
  };

  const toggleMessageSequence = async (message: WhatsAppMessage) => {
    const newIsSequence = !message.is_sequence;

    setMessages((msgs) =>
      msgs.map((m) => (m.id === message.id ? { ...m, is_sequence: newIsSequence } : m))
    );

    try {
      const { error } = await supabase
        .from('whatsapp_messages')
        .update({ is_sequence: newIsSequence })
        .eq('id', message.id);

      if (error) throw error;

      toast.success(newIsSequence ? 'Agregado a secuencia' : 'Quitado de secuencia');
    } catch (err: any) {
      setMessages((msgs) =>
        msgs.map((m) => (m.id === message.id ? { ...m, is_sequence: !newIsSequence } : m))
      );
      toast.error('Error al actualizar secuencia');
    }
  };

  return {
    messages,
    loading,
    getMessages,
    saveMessage,
    deleteMessage,
    updateMessagesOrder,
    toggleMessageSequence,
  };
};
