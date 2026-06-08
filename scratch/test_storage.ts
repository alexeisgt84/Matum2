import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://auehpfkkcvgdjsbyioya.supabase.co';
const supabaseKey = 'sb_publishable_5TzI7J1oxQhiens-dfUMJQ_N4q4Stgp';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testStorage() {
  console.log('--- PROBANDO ACCESO A STORAGE - BUCKET "avatars" ---');
  
  try {
    // Intentar obtener información de un archivo inexistente en el bucket avatars
    // Esto nos dirá si el bucket existe o no.
    const { data, error } = await supabase.storage.from('avatars').list();
    
    if (error) {
      console.error('❌ ERROR AL LISTAR EN BUCKET "avatars":', error.message);
      console.error('Detalles del error:', error);
    } else {
      console.log('✅ ÉXITO: El bucket "avatars" existe y es accesible.');
      console.log('Archivos en la raíz:', data);
    }
  } catch (err: any) {
    console.error('❌ EXCEPCIÓN AL PROBAR STORAGE:', err.message);
  }
}

testStorage();
