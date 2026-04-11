import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Puede pasarse Evolution key global si existe. Si el servidor usa distintas, tendría que recuperarse de DB. 
const GLOBAL_EVO_URL = Deno.env.get('VITE_EVOLUTION_DEFAULT_URL') || 'http://evolution-evolutionapi-fee343-217-196-49-200.traefik.me';
const GLOBAL_EVO_KEY = Deno.env.get('VITE_EVOLUTION_API_KEY') || '7XNbSXmpFLPD2I9B90Pxe+DjYFBihNPkGt3iJ4snyMPIiwn3HshrtmK1HTliuSq38puzLnaKgglE16jNkDILvA==';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

// Ayudante para registrar logs en una tabla si es necesario, pero por ahora console.log basta para el Dashboard.
const logInfo = (msg: string) => console.log(`[INFO] ${msg}`);
const logError = (msg: string, err?: any) => console.error(`[ERROR] ${msg}`, err);

serve(async (req) => {
  try {
    console.log('Iniciando disparador de mensajes...');
    const now = new Date();

    // 1. Obtener mensajes pendientes cuya fecha programada ya pasó o es ahora. Limitar a unos 15 por minuto
    // para no ahogar si hay demasiados represados, aunque la Edge Function puede enviar muchos rápido en asíncrono.
    const { data: queueItems, error: qError } = await supabase
      .from('wa_message_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', now.toISOString())
      .limit(30)
      .order('scheduled_at', { ascending: true });

    if (qError) throw qError;
    if (!queueItems || queueItems.length === 0) {
      logInfo("No hay mensajes pendientes en wa_message_queue para procesar en este momento.");
      return new Response(JSON.stringify({ message: "No hay mensajes en cola" }), { headers: { "Content-Type": "application/json" } });
    }

    logInfo(`Encontrados ${queueItems.length} mensajes pendientes. Procesando...`);

    let processed = 0;

    const startTime = Date.now();
    for (let i = 0; i < queueItems.length; i++) {
      // Si llevamos más de 50 segundos, paramos para evitar el timeout de la Edge Function (60s)
      if (Date.now() - startTime > 50000) {
        logInfo("Tiempo límite de ejecución alcanzado (50s). El resto de mensajes se procesarán en la siguiente llamada.");
        break;
      }

      const item = queueItems[i];
      logInfo(`[${i + 1}/${queueItems.length}] Enviando a ${item.group_id} via ${item.instance_name}`);
      
      try {
        const evoUrl = Deno.env.get('VITE_EVOLUTION_DEFAULT_URL') || GLOBAL_EVO_URL;
        const evoKey = Deno.env.get('VITE_EVOLUTION_API_KEY') || GLOBAL_EVO_KEY;

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

        // Marcar como enviado
        await supabase.from('wa_message_queue').update({ 
          status: 'sent', 
          updated_at: new Date().toISOString() 
        }).eq('id', item.id);

        processed++;

        // Si hay más mensajes en este lote, esperar un poco para no enviarlos todos al mismo tiempo
        if (i < queueItems.length - 1) {
          const waitTime = Math.floor(Math.random() * (10000 - 5000 + 1)) + 5000;
          logInfo(`Esperando ${waitTime/1000}s antes del siguiente...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }

      } catch (err: any) {
        logError(`Error enviando item ${item.id}:`, err);
        await supabase.from('wa_message_queue').update({ 
          status: 'error', 
          error_message: err.message, 
          updated_at: new Date().toISOString() 
        }).eq('id', item.id);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Enviador ejecutado. Mensajes procesados: ${processed}`
    }), { headers: { "Content-Type": "application/json" } });

  } catch (error: any) {
    console.error('Error interno:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { "Content-Type": "application/json" } 
    });
  }
});
