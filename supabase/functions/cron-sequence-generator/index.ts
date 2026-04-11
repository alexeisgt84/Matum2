import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const EVOLUTION_URL = Deno.env.get('VITE_EVOLUTION_DEFAULT_URL') || '';
const EVOLUTION_KEY = Deno.env.get('VITE_EVOLUTION_API_KEY') || '';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

const logInfo = (msg: string) => console.log(`[INFO] ${msg}`);
const logError = (msg: string, err?: any) => console.error(`[ERROR] ${msg}`, err);

serve(async (req) => {
  try {
    console.log('Iniciando generador de secuencias...');
    // 1. Obtener catálogos programados
    const { data: catalogs, error: cError } = await supabase
      .from('catalogs')
      .select('*, evolution_instances(name, status)')
      .eq('is_active', true)
      .eq('is_sequence_scheduled', true);

    if (cError) throw cError;
    if (!catalogs || catalogs.length === 0) {
      logInfo("No hay catálogos con 'is_active=true' y 'is_sequence_scheduled=true'.");
      return new Response(JSON.stringify({ message: "No hay catálogos programados" }), { headers: { "Content-Type": "application/json" } });
    }

    logInfo(`Encontrados ${catalogs.length} catálogos programados para evaluar.`);

    const now = new Date();
    // Ajuste a zona horaria local (Cuba/EST es UTC-4 normalmente, pero esto lo hace más explícito)
    const offset = -4; 
    const cubaTime = new Date(now.getTime() + (offset * 60 * 60 * 1000));
    const currentHH = String(cubaTime.getUTCHours()).padStart(2, '0');
    const currentMM = String(cubaTime.getUTCMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHH}:${currentMM}`;

    console.log(`Hora actual evaluada (UTC${offset}): ${currentTimeStr}`);

    let generatedCount = 0;

    for (const catalog of catalogs) {
      if (!catalog.sequence_start_time) continue;

      // Normalizar sequence_start_time a HH:mm (puede venir como HH:mm:ss desde PostgreSQL)
      const rawTime = catalog.sequence_start_time;
      const catalogTime = rawTime.substring(0, 5); // "15:47:00" → "15:47"
      logInfo(`Comparando hora actual ${currentTimeStr} con hora programada ${catalogTime} (raw: ${rawTime})`);

      // Evaluar si ya es el momento o ya pasó
      if (currentTimeStr >= catalogTime) {
        
        // Verificar si ya se envió hoy usando la fecha local
        let alreadySentToday = false;
        if (catalog.last_sequence_sent_at) {
          const lastSent = new Date(catalog.last_sequence_sent_at);
          const currentDayStr = cubaTime.toISOString().split('T')[0];
          const lastSentLocal = new Date(lastSent.getTime() + (offset * 60 * 60 * 1000));
          const lastSentStr = lastSentLocal.toISOString().split('T')[0];
          
          if (currentDayStr === lastSentStr) {
            alreadySentToday = true;
          }
        }

        if (alreadySentToday) continue;

        // Calcular minutos de diferencia desde la hora programada
        const [schHH, schMM] = catalogTime.split(':');
        const currentTotalMins = (parseInt(currentHH) * 60) + parseInt(currentMM);
        const scheduledTotalMins = (parseInt(schHH) * 60) + parseInt(schMM);
        const diffMins = currentTotalMins - scheduledTotalMins;

        logInfo(`Catálogo ${catalog.nombre || catalog.name} (${catalog.id}): diffMins=${diffMins}`);
        
        // Lógica de disparo inteligente:
        // 1. Si han pasado más de 3 minutos, forzar ejecución.
        // 2. Si estamos en el primer o segundo minuto, usar probabilidad para escalonar.
        let shouldExecute = false;
        if (diffMins > 3) {
          shouldExecute = true; 
        } else {
          // Probabilidad del 33% por minuto en la ventana inicial (asumiendo cron cada 1 min)
          if (Math.random() < 0.33) {
            shouldExecute = true;
          }
        }

        if (shouldExecute) {
          logInfo(`Generando secuencia para catálogo: ${catalog.id}`);
          
          // Soporte para array u objeto (dependiendo de la versión de supabase-js o la query)
          let instanceName = '';
          if (Array.isArray(catalog.evolution_instances)) {
             instanceName = catalog.evolution_instances.length > 0 ? catalog.evolution_instances[0].name : '';
          } else if (catalog.evolution_instances) {
             instanceName = (catalog.evolution_instances as any).name;
          }
          
          if (!instanceName) {
            logError(`Catálogo ${catalog.id} no tiene instancia registrada o vinculada correctamente.`);
            continue;
          }

          // 1. Obtener mensajes y grupos
          const { data: messages } = await supabase
            .from('whatsapp_messages')
            .select('*')
            .eq('catalog_id', catalog.id)
            .eq('is_sequence', true)
            .order('sequence_order', { ascending: true });

          const { data: products } = await supabase
            .from('products')
            .select('*')
            .eq('catalog_id', catalog.id)
            .eq('is_active', true)
            .order('position', { ascending: true });

          const { data: groups } = await supabase
            .from('whatsapp_groups')
            .select('*')
            .eq('catalog_id', catalog.id)
            .eq('is_active', true);

          if (!messages?.length || !groups?.length) {
            logInfo(`Saltando catálogo ${catalog.id}: No hay mensajes (${messages?.length}) o grupos (${groups?.length}) activos.`);
            continue;
          }

          // Preparar la cola
          const queueItems = [];
          let cumulativeDelayMs = 0; // Tiempo en el futuro a añadir

          for (const group of groups) {
            for (const item of messages) {
              if (item.type === 'catalog_products') {
                if (products && products.length > 0) {
                  for (const product of products) {
                    cumulativeDelayMs += Math.floor(Math.random() * (35000 - 15000 + 1)) + 15000;
                    
                    const productCaption = (catalog.template || '')
                      .replace(/{product_name}/g, product.name)
                      .replace(/{product_description}/g, product.description || '')
                      .replace(/{product_price}/g, product.price ? `${product.price}` : 'Consultar')
                      .replace(/{product_currency}/g, product.currency || '$')
                      .replace(/{catalog_name}/g, catalog.name);

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
                // Mensaje normal
                cumulativeDelayMs += Math.floor(Math.random() * (35000 - 15000 + 1)) + 15000;
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

          // Insertar en la tabla combinados
          if (queueItems.length > 0) {
            const { error: iErr } = await supabase.from('wa_message_queue').insert(queueItems);
            if (iErr) {
              console.error('Error insertando a la cola:', iErr);
            } else {
              // Actualizar fecha de envio en el catalogo
              await supabase.from('catalogs').update({ last_sequence_sent_at: now.toISOString() }).eq('id', catalog.id);
              generatedCount++;
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Generador ejecutado. Secuencias encoladas: ${generatedCount}` 
    }), { headers: { "Content-Type": "application/json" } });

  } catch (error: any) {
    console.error('Error interno:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { "Content-Type": "application/json" } 
    });
  }
});
