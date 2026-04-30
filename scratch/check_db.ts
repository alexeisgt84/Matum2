
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val) {
    env[key.trim()] = val.join('=').trim();
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Checking queue errors...');
  const { data: errors } = await supabase.from('wa_message_queue').select('*').eq('status', 'error').limit(5);
  console.log('Errors:', JSON.stringify(errors, null, 2));

  console.log('Checking recent sent items in queue...');
  const { data: sent } = await supabase.from('wa_message_queue').select('*').eq('status', 'sent').order('updated_at', { ascending: false }).limit(5);
  console.log('Sent:', JSON.stringify(sent, null, 2));
}

check();
