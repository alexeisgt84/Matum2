import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://auehpfkkcvgdjsbyioya.supabase.co';
const supabaseKey = 'sb_publishable_5TzI7J1oxQhiens-dfUMJQ_N4q4Stgp';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSequencesAndLogs() {
  console.log('--- ESTADO DE CATÁLOGOS PROGRAMADOS ---');
  const { data: catalogs, error: cError } = await supabase
    .from('catalogs')
    .select('id, name, is_active, is_sequence_scheduled, sequence_start_time, last_sequence_sent_at')
    .eq('is_sequence_scheduled', true);

  if (cError) {
    console.error('Error obteniendo catálogos:', cError);
  } else {
    console.table(catalogs);
  }

  console.log('\n--- ÚLTIMOS 20 MENSAJES EN LA COLA (LOGS) ---');
  const { data: logs, error: lError } = await supabase
    .from('wa_message_queue')
    .select('id, catalog_id, status, scheduled_at, updated_at, error_message')
    .order('created_at', { ascending: false })
    .limit(20);

  if (lError) {
    console.error('Error obteniendo logs de la cola:', lError);
  } else {
    if (logs && logs.length > 0) {
      console.table(logs);
    } else {
      console.log('La cola de mensajes está vacía.');
    }
  }
}

checkSequencesAndLogs();
