import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const env: Record<string, string> = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2].trim();
});

const supabase = createClient(
  env['VITE_SUPABASE_URL'] || '',
  env['VITE_SUPABASE_ANON_KEY'] || ''
);

async function checkSettingsTable() {
  console.log('Probando si existe la tabla system_settings...');
  const { data: data1, error: error1 } = await supabase.from('system_settings').select('*').limit(1);
  if (error1) {
    console.log('system_settings error:', error1.message);
  } else {
    console.log('system_settings existe! Datos:', data1);
  }

  console.log('Probando si existe la tabla global_settings...');
  const { data: data2, error: error2 } = await supabase.from('global_settings').select('*').limit(1);
  if (error2) {
    console.log('global_settings error:', error2.message);
  } else {
    console.log('global_settings existe! Datos:', data2);
  }

  console.log('Probando si existe la tabla app_settings...');
  const { data: data3, error: error3 } = await supabase.from('app_settings').select('*').limit(1);
  if (error3) {
    console.log('app_settings error:', error3.message);
  } else {
    console.log('app_settings existe! Datos:', data3);
  }
}

checkSettingsTable();
