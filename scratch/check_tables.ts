
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
  const { count: c1, error: e1 } = await supabase.from('evolution_servers').select('*', { count: 'exact', head: true });
  console.log('evolution_servers count:', c1, 'error:', e1?.message);

  const { count: c2, error: e2 } = await supabase.from('available_evolution_servers').select('*', { count: 'exact', head: true });
  console.log('available_evolution_servers count:', c2, 'error:', e2?.message);
}

check();
