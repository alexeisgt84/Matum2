import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTime() {
  const { data, error } = await supabase.rpc('get_server_time');
  
  if (error) {
    // Si no hay RPC, intentamos con una query directa de ser posible, 
    // pero via JS con ANON_KEY usualmente solo podemos hacer queries a tablas.
    // Vamos a intentar obtener el ultimo registro de wa_message_queue que tiene 'updated_at'
    const { data: lastLog, error: logError } = await supabase
      .from('wa_message_queue')
      .select('updated_at')
      .order('updated_at', { ascending: false })
      .limit(1);
    
    if (logError) {
      console.error('Error:', logError);
      return;
    }
    
    console.log('Última actualización registrada en DB (UTC):', lastLog[0]?.updated_at);
    console.log('Hora actual local (Host):', new Date().toISOString());
  } else {
    console.log('Hora del servidor (RPC):', data);
  }
}

checkTime();
