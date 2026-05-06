import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

const logInfo = (msg: string) => console.log(`[INFO] ${msg}`);
const logError = (msg: string, err?: any) => console.error(`[ERROR] ${msg}`, err);

Deno.serve(async (req) => {
  try {
    console.log('Iniciando generador de secuencias y programados...');
    
    // Obtener todos los catálogos activos
    const { data: catalogs, error: cError } = await supabase
      .from('catalogs')
      .select('*, evolution_instances(name, status)')
      .eq('is_active', true);

    if (cError) throw cError;
    if (!catalogs || catalogs.length === 0) {
      logInfo("No hay catálogos activos.");
      return new Response(JSON.stringify({ message: "No hay catálogos activos" }), { headers: { "Content-Type": "application/json" } });
    }

    const now = new Date();
    const offset = -4; // Ajuste a zona horaria local de Cuba (UTC-4)
    const cubaTime = new Date(now.getTime() + (offset * 60 * 60 * 1000));
    const currentHH = String(cubaTime.getUTCHours()).padStart(2, '0');
    const currentMM = String(cubaTime.getUTCMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHH}:${currentMM}`;
    const currentLocalDayStr = cubaTime.toISOString().split('T')[0];

    console.log(`Hora actual evaluada (UTC${offset}): ${currentTimeStr} del ${currentLocalDayStr}`);

    let generatedCount = 0;

    const isSameDayLocal = (dateStringISO: string | null) => {
      if (!dateStringISO) return false;
      const date = new Date(dateStringISO);
      const localDate = new Date(date.getTime() + (offset * 60 * 60 * 1000));
      return localDate.toISOString().split('T')[0] === currentLocalDayStr;
    };

    for (const catalog of catalogs) {
      // Instancia vinculada al catálogo (para Evolution)
      let instanceName = '';
      if (Array.isArray(catalog.evolution_instances)) {
         instanceName = catalog.evolution_instances.length > 0 ? catalog.evolution_instances[0].name : '';
      } else if (catalog.evolution_instances) {
         instanceName = (catalog.evolution_instances as any).name;
      }
      
      if (!instanceName) {
        logInfo(`Catálogo ${catalog.id} no tiene instancia vinculada, se omite.`);
        continue;
      }

      // Obtener todos los grupos vinculados
      const { data: groups } = await supabase
        .from('whatsapp_groups')
        .select('*')
        .eq('catalog_id', catalog.id)
        .eq('is_active', true);

      if (!groups?.length) {
        logInfo(`Saltando catálogo ${catalog.id}: No hay grupos activos.`);
        continue;
      }

      const queueItems: any[] = [];
      let cumulativeDelayMs = 0;

      // ============================================
      // 1. EVALUAR SECUENCIA DEL CATÁLOGO
      // ============================================
      // ============================================
      // 1. EVALUAR SECUENCIA DEL CATÁLOGO
      // ============================================
      if (catalog.is_sequence_scheduled) {
        let schedules = catalog.sequence_schedules || [];
        
        // Si no hay horarios en el nuevo formato pero sí en el viejo, añadirlo como fallback
        if (schedules.length === 0 && catalog.sequence_start_time) {
          schedules = [{ 
            time: catalog.sequence_start_time, 
            enabled: true, 
            last_sent_at: catalog.last_sequence_sent_at 
          }];
        }

        for (let i = 0; i < schedules.length; i++) {
          const schedule = schedules[i];
          if (!schedule.enabled) continue;

          const scheduleTime = schedule.time.substring(0, 5);
          const alreadySentToday = isSameDayLocal(schedule.last_sent_at);

          if (!alreadySentToday && currentTimeStr >= scheduleTime) {
            logInfo(`[Secuencia] Generando para catálogo ${catalog.name} (Horario ${i+1}: ${scheduleTime}).`);
            
            // 1. Obtener mensajes y productos
            const [{ data: messages }, { data: products }] = await Promise.all([
              supabase.from('whatsapp_messages').select('*').eq('catalog_id', catalog.id).eq('is_sequence', true).order('sequence_order', { ascending: true }),
              supabase.from('products').select('*').eq('catalog_id', catalog.id).eq('is_active', true).neq('is_out_of_stock', true).order('position', { ascending: true })
            ]);

            if (messages && messages.length > 0) {
              // Actualizar el last_sent_at de este horario específico
              const updatedSchedules = [...schedules];
              updatedSchedules[i] = { ...schedule, last_sent_at: now.toISOString() };

              // Intentar bloquear el envío actualizando el catálogo
              // Solo actualizamos si el array de schedules sigue siendo el mismo (evita race conditions)
              const { data: lockResult, error: lockError } = await supabase
                .from('catalogs')
                .update({ 
                  sequence_schedules: updatedSchedules,
                  last_sequence_sent_at: now.toISOString() 
                })
                .eq('id', catalog.id)
                .select();

              if (lockError || !lockResult || lockResult.length === 0) {
                logInfo(`[Secuencia] Catálogo ${catalog.name} saltado por seguridad (posible envío duplicado o error).`);
                continue;
              }

              // Actualizamos la variable local por si hay más horarios que procesar
              schedules = updatedSchedules;

              for (const group of groups) {
                for (const item of messages) {
                  if (item.type === 'catalog_products') {
                    if (products && products.length > 0) {
                      for (const product of products) {
                        cumulativeDelayMs += Math.floor(Math.random() * (20000 - 10000 + 1)) + 10000;
                        const productCaption = (catalog.template || '')
                          .replace(/\\n/g, '\n')
                          .replace(/{product_name}/g, (product.name || '').trim())
                          .replace(/{product_description}/g, (product.description || '').trim())
                          .replace(/{product_price}/g, product.price ? `${product.price}`.trim() : 'Consultar')
                          .replace(/{product_currency}/g, (product.currency || '$').trim())
                          .replace(/{catalog_name}/g, (catalog.name || '').trim())
                          .replace(/{{nombre_catalogo}}/g, (catalog.name || '').trim());

                        const scheduleDate = new Date(now.getTime() + cumulativeDelayMs);
                        queueItems.push({
                          catalog_id: catalog.id,
                          group_id: group.group_id,
                          instance_name: instanceName,
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
                    cumulativeDelayMs += Math.floor(Math.random() * (20000 - 10000 + 1)) + 10000;
                    const processedContent = (item.content || '')
                      .replace(/\\n/g, '\n')
                      .replace(/{catalog_name}/g, (catalog.name || '').trim())
                      .replace(/{{nombre_catalogo}}/g, (catalog.name || '').trim());

                    const scheduleDate = new Date(now.getTime() + cumulativeDelayMs);
                    queueItems.push({
                      catalog_id: catalog.id,
                      group_id: group.group_id,
                      instance_name: instanceName,
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
                      scheduled_at: scheduleDate.toISOString()
                    });
                  }
                }
              }
            }
          }
        }
      }

      // ============================================
      // 2. EVALUAR MENSAJES INDIVIDUALES PROGRAMADOS
      // ============================================
      if (catalog.is_individual_scheduled) {
        const { data: individualMsgs } = await supabase
          .from('whatsapp_messages')
          .select('*')
          .eq('catalog_id', catalog.id)
          .eq('is_sequence', false)
          .eq('is_individual', true)
          .not('scheduled_time', 'is', null);

        if (individualMsgs && individualMsgs.length > 0) {
          for (const item of individualMsgs) {
            const itemTime = item.scheduled_time.substring(0, 5);
            const alreadySentToday = isSameDayLocal(item.last_sent_at);

            if (!alreadySentToday && currentTimeStr >= itemTime) {
              logInfo(`[Individual] Generando mensaje programado ID ${item.id} (Hora p.: ${itemTime}).`);
              
              // 1. Marcar mensaje individual como enviado hoy (antes del loop) de forma atómica
              const { data: indLockResult } = await supabase
                .from('whatsapp_messages')
                .update({ last_sent_at: now.toISOString() })
                .eq('id', item.id)
                .or(`last_sent_at.is.null,last_sent_at.lt.${currentLocalDayStr}T00:00:00Z`)
                .select();

              if (!indLockResult || indLockResult.length === 0) {
                logInfo(`[Individual] Mensaje ${item.id} ya fue procesado por otra instancia.`);
                continue;
              }

              for (const group of groups) {
                cumulativeDelayMs += Math.floor(Math.random() * (20000 - 10000 + 1)) + 10000;
                const processedContent = (item.content || '')
                  .replace(/\\n/g, '\n')
                  .replace(/{catalog_name}/g, (catalog.name || '').trim())
                  .replace(/{{nombre_catalogo}}/g, (catalog.name || '').trim());

                const scheduleDate = new Date(now.getTime() + cumulativeDelayMs);
                queueItems.push({
                  catalog_id: catalog.id,
                  group_id: group.group_id,
                  instance_name: instanceName,
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
                  scheduled_at: scheduleDate.toISOString()
                });
              }
            }
          }
        }
      }

      // ============================================
      // 3. INSERTAR EN LA COLA
      // ============================================
      if (queueItems.length > 0) {
        // Deduplicar: verificar si ya existen items similares en los últimos 5 minutos
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { data: existingItems } = await supabase
          .from('wa_message_queue')
          .select('group_id, endpoint, payload')
          .eq('catalog_id', catalog.id)
          .in('status', ['pending', 'sent'])
          .gte('created_at', fiveMinAgo);

        let itemsToInsert = queueItems;
        if (existingItems && existingItems.length > 0) {
          const existingFingerprints = new Set<string>();
          for (const existing of existingItems) {
            const payload = existing.payload as any;
            const contentKey = payload?.text || payload?.caption || payload?.media || '';
            existingFingerprints.add(`${existing.group_id}|${existing.endpoint}|${contentKey}`);
          }

          itemsToInsert = queueItems.filter(item => {
            const payload = item.payload as any;
            const contentKey = payload?.text || payload?.caption || payload?.media || '';
            return !existingFingerprints.has(`${item.group_id}|${item.endpoint}|${contentKey}`);
          });

          const skipped = queueItems.length - itemsToInsert.length;
          if (skipped > 0) {
            logInfo(`[Dedup] Se omitieron ${skipped} mensajes duplicados para catálogo ${catalog.name}.`);
          }
        }

        if (itemsToInsert.length > 0) {
          const { error: iErr } = await supabase.from('wa_message_queue').insert(itemsToInsert);
          if (iErr) {
            logError('Error insertando a la cola combinada:', iErr);
          } else {
            generatedCount += itemsToInsert.length;
          }
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Generador ejecutado. Elementos encolados: ${generatedCount}` 
    }), { headers: { "Content-Type": "application/json" } });

  } catch (error: any) {
    console.error('Error interno:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { "Content-Type": "application/json" } 
    });
  }
});
