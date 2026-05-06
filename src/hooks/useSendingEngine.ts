import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useEvolution } from './useEvolution';
import { toast } from 'react-hot-toast';

const EVOLUTION_URL = import.meta.env.VITE_EVOLUTION_DEFAULT_URL;
const EVOLUTION_KEY = import.meta.env.VITE_EVOLUTION_API_KEY;

export const useSendingEngine = (catalogId?: string) => {
  const { instance } = useEvolution(catalogId);
  // Set de IDs en proceso — permite enviar productos distintos en paralelo
  // pero bloquea doble clic en el mismo ítem
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  const sendingIdsRef = useRef<Set<string>>(new Set());

  const markSending = (id: string) => {
    sendingIdsRef.current.add(id);
    setSendingIds(new Set(sendingIdsRef.current));
  };

  const unmarkSending = (id: string) => {
    sendingIdsRef.current.delete(id);
    setSendingIds(new Set(sendingIdsRef.current));
  };

  const isSendingItem = (id: string) => sendingIdsRef.current.has(id);

  const logSending = async (groupName: string, status: 'success' | 'failed', errorMessage?: string) => {
    if (!catalogId) return;
    try {
      await supabase.from('sending_logs').insert({
        catalog_id: catalogId,
        group_name: groupName,
        status,
        error_message: errorMessage
      });
    } catch (err) {
      console.error('Error recording log:', err);
    }
  };

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

  /**
   * Filtra items duplicados antes de insertar en la cola.
   * Verifica si ya existe un mensaje con el mismo catalog_id, group_id, endpoint
   * y contenido similar (texto o media) creado en los últimos DEDUP_WINDOW_MINUTES minutos.
   */
  const DEDUP_WINDOW_MINUTES = 5;

  const deduplicateQueueItems = async (items: any[]): Promise<any[]> => {
    if (items.length === 0) return items;

    const fiveMinAgo = new Date(Date.now() - DEDUP_WINDOW_MINUTES * 60 * 1000).toISOString();
    
    // Obtener mensajes recientes de la cola para el mismo catálogo
    const catalogId = items[0].catalog_id;
    const { data: existingItems } = await supabase
      .from('wa_message_queue')
      .select('group_id, endpoint, payload, created_at')
      .eq('catalog_id', catalogId)
      .in('status', ['pending', 'sent'])
      .gte('created_at', fiveMinAgo);

    if (!existingItems || existingItems.length === 0) return items;

    // Crear un Set de huellas de los items existentes para búsqueda O(1)
    const existingFingerprints = new Set<string>();
    for (const existing of existingItems) {
      const payload = existing.payload as any;
      // La huella es: group_id + endpoint + texto o media del payload
      const contentKey = payload?.text || payload?.caption || payload?.media || '';
      const fp = `${existing.group_id}|${existing.endpoint}|${contentKey}`;
      existingFingerprints.add(fp);
    }

    // Filtrar los items nuevos, excluyendo los que ya tienen huella en la cola
    const filtered = items.filter(item => {
      const payload = item.payload as any;
      const contentKey = payload?.text || payload?.caption || payload?.media || '';
      const fp = `${item.group_id}|${item.endpoint}|${contentKey}`;
      return !existingFingerprints.has(fp);
    });

    const skipped = items.length - filtered.length;
    if (skipped > 0) {
      console.log(`[Dedup] Se omitieron ${skipped} mensajes duplicados (ventana de ${DEDUP_WINDOW_MINUTES} min).`);
    }

    return filtered;
  };

  const sendCatalogToGroups = async (catalogId: string) => {
    const guardKey = `catalog_${catalogId}`;
    if (isSendingItem(guardKey)) {
      console.log('[Guard] sendCatalogToGroups bloqueado: ya hay un envío en curso para este catálogo.');
      return;
    }
    if (!instance || instance.status !== 'connected') {
      toast.error('WhatsApp no está conectado');
      return;
    }

    markSending(guardKey);
    const toastId = toast.loading('Preparando envío en segundo plano...');

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
        .neq('is_out_of_stock', true)
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

      const queueItems: any[] = [];
      let totalToWait = 0;
      const now = new Date();

      for (const group of groups) {
        for (const item of messages) {
          if (item.type === 'catalog_products') {
            if (products && products.length > 0) {
              for (const product of products) {
                const productCaption = (catalog.template || '')
                  .replace(/\\n/g, '\n')
                  .replace(/{product_name}/g, (product.name || '').trim())
                  .replace(/{product_description}/g, (product.description || '').trim())
                  .replace(/{product_price}/g, product.price ? `${product.price}`.trim() : 'Consultar')
                  .replace(/{product_currency}/g, (product.currency || '$').trim())
                  .replace(/{catalog_name}/g, (catalog.name || '').trim())
                  .replace(/{{nombre_catalogo}}/g, (catalog.name || '').trim());

                const scheduledDate = new Date(now.getTime() + totalToWait);
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
                  scheduled_at: scheduledDate.toISOString(),
                  status: 'pending'
                });
                
                // Añadir un pequeño retraso entre mensajes en la cola para no saturar
                totalToWait += 5000 + Math.random() * 5000;
              }
            }
          } else {
            const processedContent = (item.content || '')
              .replace(/\\n/g, '\n')
              .replace(/{catalog_name}/g, (catalog.name || '').trim())
              .replace(/{{nombre_catalogo}}/g, (catalog.name || '').trim());

            const scheduledDate = new Date(now.getTime() + totalToWait);
            queueItems.push({
              catalog_id: catalogId,
              group_id: group.group_id,
              instance_name: instance.name,
              endpoint: item.image_url ? '/message/sendMedia' : '/message/sendText',
              payload: item.image_url ? {
                number: group.group_id,
                media: item.image_url,
                mediatype: 'image',
                caption: processedContent,
                delay: 1000
              } : {
                number: group.group_id,
                text: processedContent
              },
              scheduled_at: scheduledDate.toISOString(),
              status: 'pending'
            });
            
            totalToWait += 5000 + Math.random() * 5000;
          }
        }
      }

      // Deduplicar y luego insertar en la cola
      const uniqueItems = await deduplicateQueueItems(queueItems);
      if (uniqueItems.length === 0) {
        toast('Estos mensajes ya están en cola (duplicado detectado).', { id: toastId, icon: '⚠️' });
        return;
      }
      const { error: queueError } = await supabase.from('wa_message_queue').insert(uniqueItems);
      if (queueError) throw queueError;

      const skippedCount = queueItems.length - uniqueItems.length;
      const skippedMsg = skippedCount > 0 ? ` (${skippedCount} duplicados omitidos)` : '';
      toast.success(`Se han encolado ${uniqueItems.length} mensajes${skippedMsg}. El envío comenzará en breve.`, { id: toastId });

      // Opcional: Disparar el procesador de inmediato
      const { data: { session } } = await supabase.auth.getSession();
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cron-message-sender`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      }).catch(e => console.warn('Error disparando sender manual:', e));

    } catch (err: any) {
      toast.error('Error al programar envío: ' + err.message, { id: toastId });
    } finally {
      unmarkSending(`catalog_${catalogId}`);
    }
  };

  const sendSingleMessage = async (message: any) => {
    const guardKey = `msg_${message.id}`;
    if (isSendingItem(guardKey)) {
      console.log('[Guard] sendSingleMessage bloqueado: este mensaje ya se está enviando.');
      return;
    }
    if (!instance || instance.status !== 'connected') {
      toast.error('WhatsApp no está conectado');
      return;
    }

    markSending(guardKey);
    const toastId = toast.loading('Encolando mensaje...');

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

      const queueItems: any[] = [];
      let totalToWait = 0;
      const now = new Date();

      for (const group of groups) {
        if (message.type === 'catalog_products') {
          const { data: products } = await supabase
            .from('products')
            .select('*')
            .eq('catalog_id', catalogId)
            .eq('is_active', true)
            .neq('is_out_of_stock', true)
            .order('position', { ascending: true });

          if (products && products.length > 0) {
            for (const product of products) {
              const productCaption = (catalog.template || '')
                .replace(/\\n/g, '\n')
                .replace(/{product_name}/g, (product.name || '').trim())
                .replace(/{product_description}/g, (product.description || '').trim())
                .replace(/{product_price}/g, product.price ? `${product.price}`.trim() : 'Consultar')
                .replace(/{product_currency}/g, (product.currency || '$').trim())
                .replace(/{catalog_name}/g, (catalog.name || '').trim())
                .replace(/{{nombre_catalogo}}/g, (catalog.name || '').trim());

              const scheduledDate = new Date(now.getTime() + totalToWait);
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
                scheduled_at: scheduledDate.toISOString(),
                status: 'pending'
              });
              totalToWait += 5000 + Math.random() * 5000;
            }
          }
        } else {
          const processedContent = (message.content || '')
            .replace(/\\n/g, '\n')
            .replace(/{catalog_name}/g, (catalog.name || '').trim())
            .replace(/{{nombre_catalogo}}/g, (catalog.name || '').trim());

          const scheduledDate = new Date(now.getTime() + totalToWait);
          queueItems.push({
            catalog_id: catalogId,
            group_id: group.group_id,
            instance_name: instance.name,
            endpoint: message.image_url ? '/message/sendMedia' : '/message/sendText',
            payload: message.image_url ? {
              number: group.group_id,
              media: message.image_url,
              mediatype: 'image',
              caption: processedContent,
              delay: 1000
            } : {
              number: group.group_id,
              text: processedContent
            },
            scheduled_at: scheduledDate.toISOString(),
            status: 'pending'
          });
          totalToWait += 5000 + Math.random() * 5000;
        }
      }

      const uniqueItems = await deduplicateQueueItems(queueItems);
      if (uniqueItems.length === 0) {
        toast('Este mensaje ya está en cola (duplicado detectado).', { id: toastId, icon: '⚠️' });
        return;
      }
      const { error: queueError } = await supabase.from('wa_message_queue').insert(uniqueItems);
      if (queueError) throw queueError;

      toast.success(`Mensaje programado para ${uniqueItems.length} grupos.`, { id: toastId });

      // El cron-message-sender programado se encargará de procesar la cola

    } catch (err: any) {
      toast.error('Error al programar: ' + err.message, { id: toastId });
    } finally {
      unmarkSending(`msg_${message.id}`);
    }
  };

  const sendSingleProduct = async (product: any) => {
    const guardKey = `prod_${product.id}`;
    if (isSendingItem(guardKey)) {
      console.log('[Guard] sendSingleProduct bloqueado: este producto ya se está enviando.');
      return;
    }
    if (!instance || instance.status !== 'connected') {
      toast.error('WhatsApp no está conectado');
      return;
    }

    markSending(guardKey);
    const toastId = toast.loading('Encolando producto...');

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

      const queueItems: any[] = [];
      let totalToWait = 0;
      const now = new Date();

      for (const group of groups) {
        const productCaption = (catalog.template || '')
          .replace(/\\n/g, '\n')
          .replace(/{product_name}/g, (product.name || '').trim())
          .replace(/{product_description}/g, (product.description || '').trim())
          .replace(/{product_price}/g, product.price ? `${product.price}`.trim() : 'Consultar')
          .replace(/{product_currency}/g, (product.currency || '$').trim())
          .replace(/{catalog_name}/g, (catalog.name || '').trim())
          .replace(/{{nombre_catalogo}}/g, (catalog.name || '').trim());

        const scheduledDate = new Date(now.getTime() + totalToWait);
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
          scheduled_at: scheduledDate.toISOString(),
          status: 'pending'
        });
        totalToWait += 5000 + Math.random() * 5000;
      }

      const uniqueItems = await deduplicateQueueItems(queueItems);
      if (uniqueItems.length === 0) {
        toast('Este producto ya está en cola (duplicado detectado).', { id: toastId, icon: '⚠️' });
        return;
      }
      const { error: queueError } = await supabase.from('wa_message_queue').insert(uniqueItems);
      if (queueError) throw queueError;

      toast.success(`Producto programado para ${uniqueItems.length} grupos.`, { id: toastId });

      // El cron-message-sender programado se encargará de procesar la cola

    } catch (err: any) {
      toast.error('Error al programar: ' + err.message, { id: toastId });
    } finally {
      unmarkSending(`prod_${product.id}`);
    }
  };

  const sendProductOutOfStock = async (product: any) => {
    const guardKey = `oos_${product.id}`;
    if (isSendingItem(guardKey)) {
      console.log('[Guard] sendProductOutOfStock bloqueado: este aviso ya se está enviando.');
      return;
    }
    if (!instance || instance.status !== 'connected') {
      toast.error('WhatsApp no está conectado');
      return;
    }

    markSending(guardKey);
    const toastId = toast.loading('Encolando aviso de agotado...');

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

      const queueItems: any[] = [];
      let totalToWait = 0;
      const now = new Date();

      for (const group of groups) {
        const template = catalog.out_of_stock_template || '*AGOTADO*\n{product_name}';
        const productCaption = template
          .replace(/\\n/g, '\n')
          .replace(/{product_name}/g, (product.name || '').trim())
          .replace(/{product_description}/g, (product.description || '').trim())
          .replace(/{catalog_name}/g, (catalog.name || '').trim())
          .replace(/{{nombre_catalogo}}/g, (catalog.name || '').trim());

        const scheduledDate = new Date(now.getTime() + totalToWait);
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
          scheduled_at: scheduledDate.toISOString(),
          status: 'pending'
        });
        totalToWait += 5000 + Math.random() * 5000;
      }

      const uniqueItems = await deduplicateQueueItems(queueItems);
      if (uniqueItems.length === 0) {
        toast('Este aviso ya está en cola (duplicado detectado).', { id: toastId, icon: '⚠️' });
        return;
      }
      const { error: queueError } = await supabase.from('wa_message_queue').insert(uniqueItems);
      if (queueError) throw queueError;

      toast.success(`Aviso de agotado encolado para ${uniqueItems.length} grupos.`, { id: toastId });

      // El cron-message-sender programado se encargará de procesar la cola

    } catch (err: any) {
      toast.error('Error al programar: ' + err.message, { id: toastId });
    } finally {
      unmarkSending(`oos_${product.id}`);
    }
  };

  const sendProductAvailable = async (product: any) => {
    const guardKey = `avail_${product.id}`;
    if (isSendingItem(guardKey)) {
      console.log('[Guard] sendProductAvailable bloqueado: este aviso ya se está enviando.');
      return;
    }
    if (!instance || instance.status !== 'connected') {
      toast.error('WhatsApp no está conectado');
      return;
    }

    markSending(guardKey);
    const toastId = toast.loading('Encolando aviso de disponibilidad...');

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

      const queueItems: any[] = [];
      let totalToWait = 0;
      const now = new Date();

      for (const group of groups) {
        const template = catalog.available_template || catalog.new_product_template || '*PRODUCTO DISPONIBLE*\n{product_name}\nPrecio: {product_price}';
        const productCaption = template
          .replace(/\\n/g, '\n')
          .replace(/{product_name}/g, (product.name || '').trim())
          .replace(/{product_description}/g, (product.description || '').trim())
          .replace(/{product_price}/g, product.price ? `${product.price}`.trim() : 'Consultar')
          .replace(/{product_currency}/g, (product.currency || '$').trim())
          .replace(/{catalog_name}/g, (catalog.name || '').trim())
          .replace(/{{nombre_catalogo}}/g, (catalog.name || '').trim());

        const scheduledDate = new Date(now.getTime() + totalToWait);
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
          scheduled_at: scheduledDate.toISOString(),
          status: 'pending'
        });
        totalToWait += 5000 + Math.random() * 5000;
      }

      const uniqueItems = await deduplicateQueueItems(queueItems);
      if (uniqueItems.length === 0) {
        toast('Este aviso ya está en cola (duplicado detectado).', { id: toastId, icon: '⚠️' });
        return;
      }
      const { error: queueError } = await supabase.from('wa_message_queue').insert(uniqueItems);
      if (queueError) throw queueError;

      toast.success(`Aviso de disponibilidad encolado para ${uniqueItems.length} grupos.`, { id: toastId });

      // El cron-message-sender programado se encargará de procesar la cola

    } catch (err: any) {
      toast.error('Error al programar: ' + err.message, { id: toastId });
    } finally {
      unmarkSending(`avail_${product.id}`);
    }
  };

  return { sendCatalogToGroups, sendSingleMessage, sendSingleProduct, sendProductOutOfStock, sendProductAvailable, sendingIds };
};


