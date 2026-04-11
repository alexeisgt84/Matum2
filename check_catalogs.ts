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

async function checkAll() {
  console.log('--- Catalogs ---');
  const { data: catData, error: catError } = await supabase
    .from('catalogs')
    .select('id, name, is_active, is_sequence_scheduled, sequence_start_time, last_sequence_sent_at, evolution_instances(name, status)');
  
  if (catError) console.error(catError);
  else console.log(JSON.stringify(catData, null, 2));

  if (catData && catData.length > 0) {
    const catId = catData[0].id;
    
    console.log(`--- Messages for Catalog ${catId} ---`);
    const { data: msgData } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('catalog_id', catId);
    console.log(JSON.stringify(msgData, null, 2));

    console.log(`--- Groups for Catalog ${catId} ---`);
    const { data: grpData } = await supabase
      .from('whatsapp_groups')
      .select('*')
      .eq('catalog_id', catId);
    console.log(JSON.stringify(grpData, null, 2));
  }
}

checkAll();
