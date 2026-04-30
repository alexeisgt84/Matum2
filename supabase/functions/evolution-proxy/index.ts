import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // Manejo de pre-vuelo CORS
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No Authorization header');

    // Usamos el SERVICE ROLE para validar al usuario y evitar problemas de algoritmo JWT en el cliente
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Validar el token con Supabase Auth directamente (llamada HTTP al servidor, no validación local)
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Auth Error:", authError);
      throw new Error('Unauthorized');
    }

    const payload = await req.json();
    const { server_id, endpoint, method = 'GET', body = null, instance_name = null } = payload;

    const { data: server, error: serverError } = await supabaseAdmin
      .from('evolution_servers')
      .select('url, api_key')
      .eq('id', server_id)
      .single();

    if (serverError || !server) throw new Error('Servidor no encontrado');

    let cleanUrl = server.url.endsWith('/') ? server.url.slice(0, -1) : server.url;
    let cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    let url = `${cleanUrl}${cleanEndpoint}`;
    
    if (instance_name) {
      if (url.includes('?')) {
        const [base, query] = url.split('?');
        url = `${base}/${instance_name}?${query}`;
      } else {
        url = `${url}/${instance_name}`;
      }
    }
    
    console.log(`Proxying ${method} to: ${url}`);

    const headers: Record<string, string> = {
      'apikey': server.api_key
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      headers['Content-Type'] = 'application/json';
    }
    
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null
    });
    
    if (!response.ok) {
      const respText = await response.text();
      console.error(`Evolution API Error (${response.status}):`, respText);
      return new Response(JSON.stringify({ 
        error: `Error de Evolution API: ${response.status}`,
        status: response.status,
        url: url,
        response: respText
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status
      });
    }

    const result = await response.json();
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.status
    });

  } catch (error: any) {
    console.error("Proxy Error:", error.message);
    return new Response(JSON.stringify({ 
      error: error.message,
      url: error.url || null,
      debug: "Error en el proxy o en la llamada al servidor de Evolution"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
