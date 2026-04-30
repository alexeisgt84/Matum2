
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkAdmins() {
  const { data, error } = await supabase
    .from('users')
    .select('id, role, full_name')
    .eq('role', 'admin')

  if (error) {
    console.error('Error fetching admins:', error)
  } else {
    console.log('Admins found:', data)
  }
}

checkAdmins()
