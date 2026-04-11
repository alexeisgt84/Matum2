import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useEvolution } from './useEvolution';
import { toast } from 'react-hot-toast';

export const useSendingEngine = (catalogId?: string) => {
  const { instance } = useEvolution(catalogId);
  const [sending, setSending] = useState(false);

  const sendCatalogToGroups = async (catalogId: string) => {
    if (!instance || instance.status !== 'connected') {
      toast.error('WhatsApp no está conectado');
      return;
    }

    setSending(true);
    const toastId = toast.loading('Calculando y encolando envío...');

    try {
      // 1. Obtener Datos del Catálogo
      const { data: catalog } = await supabase
        .from('catalogs')
        .select('*')
        .eq('id', catalogId)
        .single();
      
      if (!catalog) throw new Error('Catálogo no encontrado');

      // 2. Obtener Productos
      const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('catalog_id', catalogId)
        .eq('is_active', true)
        .order('position', { ascending: true });

      // 3. Obtener Mensajes de Secuencia
      const { data: messages } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('catalog_id', catalogId)
        .eq('is_sequence', true)
        .order('sequence_order', { ascending: true });

      if (!messages || messages.length === 0) {
        throw new Error('No hay mensajes configurados en la secuencia');
      }

      // 4. Obtener Grupos Vinculados
      const { data: groups } = await supabase
        .from('whatsapp_groups')
        .select('*')
        .eq('catalog_id', catalogId)
        .eq('is_active', true);

      if (!groups || groups.length === 0) {
        throw new Error('No hay grupos vinculados o activos');
      }

      // 5. Preparar Cola Masiva
      const queueItems = [];
      const now = new Date();
      let cumulativeDelayMs = 0;

      for (const group of groups) {
        for (const item of messages) {
          if (item.type === 'catalog_products') {
            if (products && products.length > 0) {
              for (const product of products) {
                cumulativeDelayMs += Math.floor(Math.random() * (35000 - 15000 + 1)) + 15000;
                
                const productCaption = catalog.template
                  .replace(/{product_name}/g, product.name)
                  .replace(/{product_description}/g, product.description || '')
                  .replace(/{product_price}/g, product.price ? `${product.price}` : 'Consultar')
                  .replace(/{product_currency}/g, product.currency || '$')
                  .replace(/{catalog_name}/g, catalog.name);

                const scheduleDate = new Date(now.getTime() + cumulativeDelayMs);

                queueItems.push({
                  catalog_id: catalogId,
                  group_id: group.group_id,
                  instance_name: instance.name,
                  endpoint: product.imagen_url ? '/message/sendMedia' : '/message/sendText',
                  payload: product.imagen_url ? {
                    number: group.group_id,
                    media: product.imagen_url,
                    mediatype: 'image',
                    caption: productCaption,
                    delay: 1000
                  } : {
                    number: group.group_id,
                    text: productCaption
                  },
                  scheduled_at: scheduleDate.toISOString()
                });
              }
            }
          } else {
            // Mensaje normal
            cumulativeDelayMs += Math.floor(Math.random() * (35000 - 15000 + 1)) + 15000;
            const scheduleDate = new Date(now.getTime() + cumulativeDelayMs);

            queueItems.push({
              catalog_id: catalogId,
              group_id: group.group_id,
              instance_name: instance.name,
              endpoint: item.image_url ? '/message/sendMedia' : '/message/sendText',
              payload: item.image_url ? {
                number: group.group_id,
                media: item.image_url,
                mediatype: 'image',
                caption: item.content || '',
                delay: 1000
              } : {
                number: group.group_id,
                text: item.content
              },
              scheduled_at: scheduleDate.toISOString()
            });
          }
        }
      }

      // 6. Insertar en cola de base de datos
      if (queueItems.length > 0) {
        const { error: insertError } = await supabase.from('wa_message_queue').insert(queueItems);
        if (insertError) throw insertError;
        
        toast.success(`¡Encolado con éxito! Se enviarán ${queueItems.length} mensajes en segundo plano.`, { id: toastId });
      } else {
        toast.error('No se generaron mensajes para envío.', { id: toastId });
      }

    } catch (err: any) {
      toast.error(err.message, { id: toastId });
    } finally {
      setSending(false);
    }
  };

  return { sendCatalogToGroups, sending };
};
