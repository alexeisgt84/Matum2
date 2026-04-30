import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Fallbacks globales por compatibilidad
const GLOBAL_EVO_URL = Deno.env.get('VITE_EVOLUTION_DEFAULT_URL') || '';
const GLOBAL_EVO_KEY = Deno.env.get('VITE_EVOLUTION_API_KEY') || '';

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
    logInfo('Iniciando disparador de mensajes multi-servidor...');
    const now = new Date();

    // 1. Obtener mensajes con JOIN para conocer el servidor
    // Nota: wa_message_queue.instance_name se usa para buscar en evolution_instances
    const { data: queueItems, error: qError } = await supabase
      .from('wa_message_queue')
      .select(`
        *,
        catalogs(user_id, is_active)
      `)
      .eq('status', 'pending')
      .lte('scheduled_at', now.toISOString())
      .limit(30)
      .order('scheduled_at', { ascending: true });

    if (qError) throw qError;
    if (!queueItems || queueItems.length === 0) {
      return new Response(JSON.stringify({ message: "No hay mensajes en cola" }), { headers: { "Content-Type": "application/json" } });
    }

    logInfo(`Encontrados ${queueItems.length} mensajes pendientes.`);

    // Bloqueo preventivo: mover scheduled_at al futuro para evitar que otros crons concurrentes los tomen
    const idsToProcess = queueItems.map(item => item.id);
    const lockTime = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // +10 minutos
    
    const { error: lockError } = await supabase
      .from('wa_message_queue')
      .update({ scheduled_at: lockTime, updated_at: new Date().toISOString() })
      .in('id', idsToProcess)
      .eq('status', 'pending');

    if (lockError) {
      logError('Error al bloquear mensajes:', lockError);
    }

    let processed = 0;
    let cancelled = 0;
    const startTime = Date.now();

    for (let i = 0; i < queueItems.length; i++) {
      if (Date.now() - startTime > 50000) break;

      const item = queueItems[i];

      // Verificar si el catálogo está activo
      const isCatalogActive = item.catalogs?.is_active ?? true;
      if (!isCatalogActive) {
        logInfo(`Cancelando mensaje ${item.id} porque el catálogo ${item.catalog_id} está desactivado.`);
        await supabase.from('wa_message_queue')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('id', item.id);
        cancelled++;
        continue;
      }
      
      try {
        // 2. Buscar servidor de la instancia
        const { data: instData, error: instError } = await supabase
          .from('evolution_instances')
          .select('server_id, evolution_servers(url, api_key)')
          .eq('name', item.instance_name)
          .single();

        if (instError || !instData) {
          logError(`No se encontró configuración para la instancia ${item.instance_name}`);
        }

        const evoUrl = instData?.evolution_servers?.url || GLOBAL_EVO_URL;
        const evoKey = instData?.evolution_servers?.api_key || GLOBAL_EVO_KEY;

        if (!evoUrl || !evoKey) {
          throw new Error(`Configuración de Evolution API faltante para ${item.instance_name}`);
        }

        const response = await fetch(`${evoUrl}${item.endpoint}/${item.instance_name}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': evoKey
          },
          body: JSON.stringify(item.payload)
        });

        if (!response.ok) {
          const respText = await response.text();
          throw new Error(`Evolution API Error: ${response.status} - ${respText}`);
        }

        // 3. Actualizar estado y logs
        await supabase.from('wa_message_queue').update({ status: 'sent', updated_at: new Date().toISOString() }).eq('id', item.id);

        const { data: groupData } = await supabase.from('whatsapp_groups').select('name').eq('group_id', item.group_id).maybeSingle();

        await supabase.from('sending_logs').insert({
          catalog_id: item.catalog_id,
          user_id: item.catalogs?.user_id,
          group_name: groupData?.name || item.group_id || 'Grupo Desconocido',
          status: 'success'
        });

        processed++;

        if (i < queueItems.length - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 5000) + 5000));
        }

      } catch (err: any) {
        logError(`Error enviando item ${item.id}:`, err);
        await supabase.from('wa_message_queue').update({ status: 'error', error_message: err.message, updated_at: new Date().toISOString() }).eq('id', item.id);
        await supabase.from('sending_logs').insert({
          catalog_id: item.catalog_id,
          user_id: item.catalogs?.user_id,
          group_name: item.group_id || 'Grupo Desconocido',
          status: 'failed',
          error_message: err.message
        });
      }
    }

    return new Response(JSON.stringify({ success: true, processed, cancelled }), { headers: { "Content-Type": "application/json" } });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
