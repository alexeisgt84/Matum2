import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''; // Need service role to bypass RLS if any

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkQueue() {
    console.log('--- Checking wa_message_queue ---');
    const { data: queue, error: qError } = await supabase
        .from('wa_message_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (qError) {
        console.error('Error fetching queue:', qError);
    } else {
        console.log('Last 5 items in queue:', JSON.stringify(queue, null, 2));
    }

    console.log('--- Checking Catalogs ---');
    const { data: catalogs, error: cError } = await supabase
        .from('catalogs')
        .select('id, name, is_sequence_scheduled, sequence_start_time, last_sequence_sent_at')
        .eq('is_active', true);

    if (cError) {
        console.error('Error fetching catalogs:', cError);
    } else {
        console.log('Active catalogs:', JSON.stringify(catalogs, null, 2));
    }
}

checkQueue();
