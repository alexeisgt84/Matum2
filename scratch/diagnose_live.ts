import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://auehpfkkcvgdjsbyioya.supabase.co';
const supabaseKey = 'sb_publishable_5TzI7J1oxQhiens-dfUMJQ_N4q4Stgp';
const supabase = createClient(supabaseUrl, supabaseKey);

async function waitAndCheck() {
  const CATALOG_ID = '25d0cea7-8f4b-4a39-898e-0f911540efb4';
  
  console.log('Esperando 90 segundos para que el cron ejecute al menos 1 vez con la nueva versión...');
  console.log(`Hora actual: ${new Date().toISOString()}`);
  
  await new Promise(r => setTimeout(r, 90000));
  
  console.log(`\nVerificando a las: ${new Date().toISOString()}`);
  
  // Buscar mensajes creados en los últimos 3 minutos
  const threeMinAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString();
  const { data: recent, count } = await supabase
    .from('wa_message_queue')
    .select('id, status, created_at', { count: 'exact' })
    .eq('catalog_id', CATALOG_ID)
    .gte('created_at', threeMinAgo);

  console.log(`\nMensajes creados en últimos 3 minutos: ${count}`);
  for (const m of recent || []) {
    console.log(`  ${m.id} | ${m.status} | ${m.created_at}`);
  }

  if (count === 0) {
    console.log('\n✅ CONFIRMADO: El cron-sequence-generator ya NO genera mensajes nuevos.');
    console.log('   Las funciones desplegadas están funcionando correctamente.');
  } else {
    console.log('\n⚠️ PROBLEMA: El cron SIGUE generando mensajes.');
    console.log('   Posible causa: is_sequence_scheduled sigue en TRUE en la BD.');
    console.log('   Necesitas verificar manualmente en Supabase Dashboard.');
  }
}

waitAndCheck().catch(console.error);
