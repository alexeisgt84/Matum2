import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://auehpfkkcvgdjsbyioya.supabase.co';
const supabaseKey = 'sb_publishable_5TzI7J1oxQhiens-dfUMJQ_N4q4Stgp'; // Usando la anon key para probar
const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabaseUpdate() {
  console.log('--- PROBANDO ACTUALIZACIÓN DE COLUMNAS EN "catalogs" ---');
  
  // 1. Obtener un ID de catálogo para probar
  const { data: catalog } = await supabase.from('catalogs').select('id').limit(1).single();
  
  if (!catalog) {
    console.error('No se encontró ningún catálogo para probar.');
    return;
  }

  console.log(`Probando con catálogo ID: ${catalog.id}`);

  // 2. Intentar actualizar ambas columnas de programación
  const { error } = await supabase
    .from('catalogs')
    .update({ 
      is_sequence_scheduled: true, 
      is_individual_scheduled: true 
    })
    .eq('id', catalog.id);

  if (error) {
    console.error('❌ ERROR AL GUARDAR:', error.message);
    if (error.message.includes('column "is_individual_scheduled" does not exist')) {
      console.log('👉 CONFIRMADO: La columna "is_individual_scheduled" NO EXISTE en Supabase.');
    }
  } else {
    console.log('✅ ÉXITO: Las columnas existen y se actualizaron correctamente.');
  }
}

testDatabaseUpdate();
