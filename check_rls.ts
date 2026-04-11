import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://auehpfkkcvgdjsbyioya.supabase.co';
const supabaseKey = 'sb_publishable_5TzI7J1oxQhiens-dfUMJQ_N4q4Stgp';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRLS() {
  const { data, error, count } = await supabase.from('catalogs').select('*', { count: 'exact' });
  
  if (error) {
    console.error('Error al intentar leer catalogs:', error);
  } else {
    console.log('Número de catálogos visibles:', count);
    if (data && data.length > 0) {
      console.log('Columnas disponibles en el primer catálogo:', Object.keys(data[0]));
    } else {
      console.log('❌ RLS ACTIVO o Tabla Vacía: No tienes permisos para ver catálogos con la anon key actual.');
    }
  }
}

checkRLS();
