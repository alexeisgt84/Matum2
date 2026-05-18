import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  // Manejo de CORS pre-flight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No se proporcionó token de autorización');

    // Inicializar cliente Supabase Admin para consulta segura
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

    // Obtener token JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Error de autenticación:", authError);
      return new Response(JSON.stringify({ error: 'No autorizado. Inicie sesión nuevamente.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401
      });
    }

    // Obtener el perfil del usuario para recuperar su gemini_api_key y gemini_model de forma resiliente
    let geminiApiKey = '';
    let geminiModel = 'gemini-2.5-flash';

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('gemini_api_key, gemini_model')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.warn("La columna gemini_model no parece existir aún, intentando fallback de consulta...", profileError.message);
      // Fallback: consultar únicamente la clave API si la columna de modelo no existe todavía
      const { data: fallbackProfile, error: fallbackError } = await supabaseAdmin
        .from('users')
        .select('gemini_api_key')
        .eq('id', user.id)
        .single();

      if (fallbackError || !fallbackProfile) {
        console.error("Error al obtener perfil con fallback:", fallbackError);
        throw new Error('No se pudo encontrar el perfil del usuario');
      }
      geminiApiKey = fallbackProfile.gemini_api_key;
    } else if (profile) {
      geminiApiKey = profile.gemini_api_key;
      geminiModel = profile.gemini_model || 'gemini-2.5-flash';
    }
    if (!geminiApiKey || geminiApiKey.trim() === '') {
      return new Response(
        JSON.stringify({ 
          error: 'NO_API_KEY', 
          message: 'Por favor, configura tu API Key de Gemini en tu perfil para usar la IA.' 
        }), 
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    // Leer el body de la petición
    const requestBody = await req.json();
    const { image, mimeType = 'image/jpeg', testConnection = false } = requestBody;

    if (testConnection) {
      console.log(`Llamando a Gemini (${geminiModel}) para test de conexión del usuario ${user.id}...`);
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`;
      const geminiResponse = await fetch(geminiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: "Responde estrictamente con la palabra OK." }
              ]
            }
          ]
        })
      });

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        console.error("Error de test de Gemini:", errorText);
        let parsedError = errorText;
        try {
          const jsonErr = JSON.parse(errorText);
          parsedError = jsonErr.error?.message || jsonErr.error?.status || errorText;
        } catch (e) {}
        throw new Error(`Error de conexión con Gemini: ${parsedError}`);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    if (!image) {
      throw new Error('La imagen en formato base64 es requerida');
    }

    // Preparar el cuerpo de la llamada a la API de Gemini
    const promptText = "Analiza esta imagen de un producto para un catálogo de ventas. Genera un título muy corto, conciso y atractivo (máximo 5 palabras) y una descripción clara, vendedora y breve (máximo 25 palabras). Devuelve el resultado obligatoriamente en este formato JSON exacto: {\"title\": \"nombre del producto\", \"description\": \"descripción del producto\"}. No agregues bloques de código markdown ni texto adicional, solo el JSON estructurado.";

    console.log(`Llamando a Gemini (${geminiModel}) para el usuario ${user.id}...`);

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: promptText },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: image
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Error de la API de Gemini:", errorText);
      let parsedError = errorText;
      try {
        const jsonErr = JSON.parse(errorText);
        parsedError = jsonErr.error?.message || jsonErr.error?.status || errorText;
      } catch (e) {}
      throw new Error(`Error de Gemini: ${parsedError}`);
    }

    const geminiResult = await geminiResponse.json();
    
    // Extraer la respuesta JSON de Gemini
    let aiTextResponse = '';
    try {
      aiTextResponse = geminiResult.candidates[0].content.parts[0].text;
    } catch (e) {
      console.error("Formato inesperado de Gemini:", geminiResult);
      throw new Error('Gemini no devolvió un formato válido.');
    }

    // Parsear el JSON devuelto por la IA
    let parsedResult;
    try {
      parsedResult = JSON.parse(aiTextResponse.trim());
    } catch (e) {
      console.error("Error al parsear el JSON de la IA:", aiTextResponse);
      // Fallback simple si la IA falló el formato estricto
      parsedResult = {
        title: "Nuevo Producto",
        description: "Analizado con éxito por la IA."
      };
    }

    return new Response(JSON.stringify(parsedResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error: any) {
    console.error("Error en Edge Function analyze-image-gemini:", error.message);
    return new Response(JSON.stringify({ 
      error: 'SERVER_ERROR',
      message: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
