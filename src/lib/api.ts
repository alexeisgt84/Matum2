import { supabase } from './supabase';

export const callEvolutionProxy = async (
  serverId: string, 
  endpoint: string, 
  method: string = 'GET', 
  body: any = null, 
  instanceName: string | null = null
) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evolution-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
      },
      body: JSON.stringify({ server_id: serverId, endpoint, method, body, instance_name: instanceName })
    });

    const result = await response.json();

    if (!response.ok) {
      const errorMsg = result.error || result.message || `Error del Servidor (${response.status})`;
      console.error('API Error Response Detail:', JSON.stringify(result, null, 2));
      throw new Error(errorMsg);
    }

    return result;
  } catch (err: any) {
    console.error('Proxy Error Detail:', err);
    throw err;
  }
};
