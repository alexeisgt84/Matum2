import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // Manejo de pre-vuelo CORS
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Método no permitido' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405
      });
    }

    const { phone } = await req.json();

    if (!phone) {
      return new Response(JSON.stringify({ error: 'Número de teléfono es requerido' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    const cleanPhone = phone.replace(/\D/g, '');

    // Inicializar Supabase Client con el Service Role Key del backend (seguro)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Faltan variables de entorno de Supabase en el servidor');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 1. Buscar en la tabla verification_codes el código vigente más reciente
    const { data: vData, error: vError } = await supabaseAdmin
      .from('verification_codes')
      .select('code')
      .eq('phone', phone)
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (vError) {
      console.error('Error al consultar verification_codes:', vError);
      throw new Error('Error al validar el código en la base de datos');
    }

    if (!vData) {
      return new Response(JSON.stringify({ error: 'No hay un código de verificación activo para este número' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    const code = vData.code;

    // 2. Obtener configuración de Evolution API
    const evolutionUrl = Deno.env.get('VITE_EVOLUTION_DEFAULT_URL') || Deno.env.get('EVOLUTION_DEFAULT_URL') || '';
    const apiKey = Deno.env.get('VITE_EVOLUTION_API_KEY') || Deno.env.get('EVOLUTION_API_KEY') || '';
    const instanceName = Deno.env.get('VITE_EVOLUTION_INSTANCE') || Deno.env.get('EVOLUTION_INSTANCE') || 'matum_instance';

    if (!evolutionUrl || !apiKey) {
      throw new Error('Falta la configuración de Evolution API en las variables de entorno del servidor');
    }

    const cleanUrl = evolutionUrl.endsWith('/') ? evolutionUrl.slice(0, -1) : evolutionUrl;
    const url = `${cleanUrl}/message/sendText/${instanceName}`;

    console.log(`Enviando OTP por WhatsApp a ${cleanPhone} vía ${url}`);

    // 3. Enviar el mensaje por Evolution API
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        number: cleanPhone,
        text: `Tu código de verificación es: ${code}`,
        delay: 1200,
        linkPreview: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error en Evolution API (${response.status}):`, errorText);
      let clientMessage = 'No se pudo enviar el mensaje por WhatsApp.';
      if (response.status === 400 || response.status === 404) {
        clientMessage = 'El número de teléfono no es válido o no está registrado en WhatsApp. Asegúrate de ingresar el código de país (ej. 54 para Argentina, 53 para Cuba) sin símbolos ni espacios.';
      } else {
        clientMessage = `Error de comunicación con WhatsApp (${response.status}).`;
      }
      return new Response(JSON.stringify({ error: clientMessage }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    const result = await response.json();

    return new Response(JSON.stringify({ success: true, message: 'Código enviado por WhatsApp', details: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error: any) {
    console.error('Error en send-verification-otp:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
  }
});
