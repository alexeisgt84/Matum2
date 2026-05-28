import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://auehpfkkcvgdjsbyioya.supabase.co';
const supabaseKey = 'sb_publishable_5TzI7J1oxQhiens-dfUMJQ_N4q4Stgp';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
  console.log('Iniciando consulta a la tabla "users"...');
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error al consultar users:', error);
    } else {
      console.log('Consulta exitosa. Datos de users:', data);
    }
  } catch (err) {
    console.error('Excepción al consultar users:', err);
  }
}

checkUsers();
