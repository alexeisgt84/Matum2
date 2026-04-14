import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useEvolution } from './useEvolution';
import { toast } from 'react-hot-toast';

const EVOLUTION_URL = import.meta.env.VITE_EVOLUTION_DEFAULT_URL;
const EVOLUTION_KEY = import.meta.env.VITE_EVOLUTION_API_KEY;

export const useSendingEngine = (catalogId?: string) => {
  const { instance } = useEvolution(catalogId);
  const [sending, setSending] = useState(false);

  const dispatchToEvolution = async (endpoint: string, payload: any, instanceName: string) => {
    try {
      const response = await fetch(`${EVOLUTION_URL}${endpoint}/${instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_KEY
        },
        body: JSON.stringify(payload)
      });
      return await response.json();
    } catch (err) {
      console.error('Error dispatching to Evolution:', err);
      throw err;
    }
  };

  const sendCatalogToGroups = async (catalogId: string) => {
    if (!instance || instance.status !== 'connected') {
      toast.error('WhatsApp no está conectado');
      return;
    }

    setSending(true);
    const toastId = toast.loading('Iniciando envío directo...');

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

      let sentCount = 0;
      const totalMessages = groups.length * (messages.length + (messages.some(m => m.type === 'catalog_products') ? (products?.length || 0) - 1 : 0));

      for (const group of groups) {
        for (const item of messages) {
          if (item.type === 'catalog_products') {
            if (products && products.length > 0) {
              for (const product of products) {
                const productCaption = catalog.template
                  .replace(/{product_name}/g, (product.name || '').trim())
                  .replace(/{product_description}/g, (product.description || '').trim())
                  .replace(/{product_price}/g, product.price ? `${product.price}`.trim() : 'Consultar')
                  .replace(/{product_currency}/g, (product.currency || '$').trim())
                  .replace(/{catalog_name}/g, (catalog.name || '').trim())
                  .replace(/{{nombre_catalogo}}/g, (catalog.name || '').trim());

                const endpoint = product.imagen_url ? '/message/sendMedia' : '/message/sendText';
                const payload = product.imagen_url ? {
                  number: group.group_id,
                  media: product.imagen_url,
                  mediatype: 'image',
                  caption: productCaption,
                  delay: 1000
                } : {
                  number: group.group_id,
                  text: productCaption
                };

                await dispatchToEvolution(endpoint, payload, instance.name);
                sentCount++;
                toast.loading(`Enviando: ${sentCount} mensajes...`, { id: toastId });
                
                // Pequeño retardo de seguridad pero mucho más rápido que antes
                await new Promise(r => setTimeout(r, 2000));
              }
            }
          } else {
            const processedContent = (item.content || '')
              .replace(/{catalog_name}/g, (catalog.name || '').trim())
              .replace(/{{nombre_catalogo}}/g, (catalog.name || '').trim());

            const endpoint = item.image_url ? '/message/sendMedia' : '/message/sendText';
            const payload = item.image_url ? {
              number: group.group_id,
              media: item.image_url,
              mediatype: 'image',
              caption: processedContent,
              delay: 1000
            } : {
              number: group.group_id,
              text: processedContent
            };

            await dispatchToEvolution(endpoint, payload, instance.name);
            sentCount++;
            toast.loading(`Enviando: ${sentCount} mensajes...`, { id: toastId });
            
            await new Promise(r => setTimeout(r, 2000));
          }
        }
      }

      toast.success(`¡Envío completado! Se enviaron ${sentCount} mensajes directamente.`, { id: toastId });

    } catch (err: any) {
      toast.error('Error durante el envío: ' + err.message, { id: toastId });
    } finally {
      setSending(false);
    }
  };

  const sendSingleMessage = async (message: any) => {
    if (!instance || instance.status !== 'connected') {
      toast.error('WhatsApp no está conectado');
      return;
    }

    setSending(true);
    const toastId = toast.loading('Enviando mensaje directamente...');

    try {
      const { data: catalog } = await supabase
        .from('catalogs')
        .select('*')
        .eq('id', catalogId)
        .single();
      
      if (!catalog) throw new Error('Catálogo no encontrado');

      const { data: groups } = await supabase
        .from('whatsapp_groups')
        .select('*')
        .eq('catalog_id', catalogId)
        .eq('is_active', true);

      if (!groups || groups.length === 0) {
        throw new Error('No hay grupos vinculados o activos');
      }

      let sentCount = 0;

      for (const group of groups) {
        if (message.type === 'catalog_products') {
          const { data: products } = await supabase
            .from('products')
            .select('*')
            .eq('catalog_id', catalogId)
            .eq('is_active', true)
            .order('position', { ascending: true });

          if (products && products.length > 0) {
            for (const product of products) {
              const productCaption = catalog.template
                .replace(/{product_name}/g, (product.name || '').trim())
                .replace(/{product_description}/g, (product.description || '').trim())
                .replace(/{product_price}/g, product.price ? `${product.price}`.trim() : 'Consultar')
                .replace(/{product_currency}/g, (product.currency || '$').trim())
                .replace(/{catalog_name}/g, (catalog.name || '').trim())
                .replace(/{{nombre_catalogo}}/g, (catalog.name || '').trim());

              const endpoint = product.imagen_url ? '/message/sendMedia' : '/message/sendText';
              const payload = product.imagen_url ? {
                number: group.group_id,
                media: product.imagen_url,
                mediatype: 'image',
                caption: productCaption,
                delay: 1000
              } : {
                number: group.group_id,
                text: productCaption
              };

              await dispatchToEvolution(endpoint, payload, instance.name);
              sentCount++;
              toast.loading(`Enviando: ${sentCount} mensajes...`, { id: toastId });
              await new Promise(r => setTimeout(r, 2000));
            }
          }
        } else {
          const processedContent = (message.content || '')
            .replace(/{catalog_name}/g, (catalog.name || '').trim())
            .replace(/{{nombre_catalogo}}/g, (catalog.name || '').trim());

          const endpoint = message.image_url ? '/message/sendMedia' : '/message/sendText';
          const payload = message.image_url ? {
            number: group.group_id,
            media: message.image_url,
            mediatype: 'image',
            caption: processedContent,
            delay: 1000
          } : {
            number: group.group_id,
            text: processedContent
          };

          await dispatchToEvolution(endpoint, payload, instance.name);
          sentCount++;
          toast.loading(`Enviando: ${sentCount} mensajes...`, { id: toastId });
          await new Promise(r => setTimeout(r, 2000));
        }
      }

      toast.success(`Mensaje enviado a ${groups.length} grupos directamente.`, { id: toastId });

    } catch (err: any) {
      toast.error('Error al enviar: ' + err.message, { id: toastId });
    } finally {
      setSending(false);
    }
  };

  const sendSingleProduct = async (product: any) => {
    if (!instance || instance.status !== 'connected') {
      toast.error('WhatsApp no está conectado');
      return;
    }

    setSending(true);
    const toastId = toast.loading('Enviando producto directamente...');

    try {
      const { data: catalog } = await supabase
        .from('catalogs')
        .select('*')
        .eq('id', catalogId)
        .single();
      
      if (!catalog) throw new Error('Catálogo no encontrado');

      const { data: groups } = await supabase
        .from('whatsapp_groups')
        .select('*')
        .eq('catalog_id', catalogId)
        .eq('is_active', true);

      if (!groups || groups.length === 0) {
        throw new Error('No hay grupos vinculados o activos');
      }

      let sentCount = 0;

      for (const group of groups) {
        const productCaption = catalog.template
          .replace(/{product_name}/g, (product.name || '').trim())
          .replace(/{product_description}/g, (product.description || '').trim())
          .replace(/{product_price}/g, product.price ? `${product.price}`.trim() : 'Consultar')
          .replace(/{product_currency}/g, (product.currency || '$').trim())
          .replace(/{catalog_name}/g, (catalog.name || '').trim())
          .replace(/{{nombre_catalogo}}/g, (catalog.name || '').trim());

        const endpoint = product.imagen_url ? '/message/sendMedia' : '/message/sendText';
        const payload = product.imagen_url ? {
          number: group.group_id,
          media: product.imagen_url,
          mediatype: 'image',
          caption: productCaption,
          delay: 1000
        } : {
          number: group.group_id,
          text: productCaption
        };

        await dispatchToEvolution(endpoint, payload, instance.name);
        sentCount++;
        toast.loading(`Enviando a grupos: ${sentCount}/${groups.length}`, { id: toastId });
        await new Promise(r => setTimeout(r, 2000));
      }

      toast.success(`Producto enviado a ${groups.length} grupos directamente.`, { id: toastId });

    } catch (err: any) {
      toast.error('Error al enviar: ' + err.message, { id: toastId });
    } finally {
      setSending(false);
    }
  };

  return { sendCatalogToGroups, sendSingleMessage, sendSingleProduct, sending };
};


