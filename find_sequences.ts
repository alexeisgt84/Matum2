import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://auehpfkkcvgdjsbyioya.supabase.co';
const supabaseKey = 'sb_publishable_5TzI7J1oxQhiens-dfUMJQ_N4q4Stgp';
const supabase = createClient(supabaseUrl, supabaseKey);

async function findSequenceCatalogs() {
  console.log('--- BUSCANDO CATÁLOGOS CON MENSAJES DE SECUENCIA ---');
  
  // 1. Buscar mensajes que sean parte de una secuencia
  const { data: messages, error: mError } = await supabase
    .from('whatsapp_messages')
    .select('catalog_id, content')
    .eq('is_sequence', true);

  if (mError) {
    console.error('Error:', mError);
    return;
  }

  // Obtener IDs únicos de catálogos
  const catalogIds = [...new Set(messages.map(m => m.catalog_id))];
  
  if (catalogIds.length === 0) {
    console.log('No se encontraron mensajes de secuencia en ninguna parte.');
    return;
  }

  // 2. Obtener los detalles de esos catálogos
  const { data: catalogs, error: cError } = await supabase
    .from('catalogs')
    .select('id, name, is_active, is_sequence_scheduled, sequence_start_time')
    .in('id', catalogIds);

  if (cError) {
    console.error('Error obteniendo catálogos:', cError);
  } else {
    console.table(catalogs);
  }
}

findSequenceCatalogs();
