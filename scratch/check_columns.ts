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

async function checkColumns() {
  const { data, error } = await supabase.from('catalogs').select('*').limit(1);
  if (error) {
    console.error('Error fetching catalog:', error);
  } else if (data && data.length > 0) {
    console.log('Columns in "catalogs" table:', Object.keys(data[0]));
  } else {
    console.log('No catalogs found to inspect columns.');
  }
}

checkColumns();
