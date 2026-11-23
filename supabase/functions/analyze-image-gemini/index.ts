import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ParsedAIResponse {
  title: string;
  price?: number | null;
  currency?: 'USD' | 'CUP';
  description: string;
  details_and_dimensions?: string;
  care_and_maintenance?: string;
}

/**
 * Extrae y parsea un bloque JSON de la respuesta de texto de Gemini (incluyendo bloques markdown ```json)
 */
function parseJsonFromText(text: string): ParsedAIResponse | null {
  if (!text) return null;
  try {
    const trimmed = text.trim();
    const cleanJson = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    const firstBrace = cleanJson.indexOf('{');
    const lastBrace = cleanJson.lastIndexOf('}');
    let candidate = cleanJson;
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      candidate = cleanJson.substring(firstBrace, lastBrace + 1);
    }

    // Intento 1: Parse estándar directo
    try {
      return JSON.parse(candidate);
    } catch {}

    // Intento 2: Escapar saltos de línea literales dentro de cadenas JSON
    const escapedCandidate = candidate.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/gs, (match) => {
      return match.replace(/\r?\n/g, '\\n');
    });

    try {
      return JSON.parse(escapedCandidate);
    } catch {}

    // Intento 3: Extracción directa de campos con expresiones regulares
    const titleMatch = candidate.match(/"title"\s*:\s*"([^"]+)"/i);
    const priceMatch = candidate.match(/"price"\s*:\s*([0-9.]+)/i);
    const currencyMatch = candidate.match(/"currency"\s*:\s*"(USD|CUP)"/i);
    const descMatch = candidate.match(/"description"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"[a-zA-Z0-9_]+"\s*:|"\s*\}|$)/i);
    const detailsMatch = candidate.match(/"details_and_dimensions"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"[a-zA-Z0-9_]+"\s*:|"\s*\}|$)/i);
    const careMatch = candidate.match(/"care_and_maintenance"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"[a-zA-Z0-9_]+"\s*:|"\s*\}|$)/i);

    if (titleMatch || descMatch) {
      return {
        title: titleMatch ? titleMatch[1] : '',
        price: priceMatch ? parseFloat(priceMatch[1]) : null,
        currency: currencyMatch ? (currencyMatch[1] as any) : 'USD',
        description: descMatch ? descMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : '',
        details_and_dimensions: detailsMatch ? detailsMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : '',
        care_and_maintenance: careMatch ? careMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : ''
      };
    }

    return null;
  } catch (e) {
    console.warn('Error al parsear JSON devuelto por Gemini:', e);
    return null;
  }
}

/**
 * Sanea el texto eliminando asteriscos, negrita de markdown residual
 * y estandarizando las viñetas limpias con "• ".
 */
function sanitizeText(desc?: string): string {
  if (!desc) return '';
  let text = String(desc).trim();

  // 1. Reemplazar encabezados markdown (### Título) por texto directo limpio
  text = text.replace(/^#{1,6}\s*(.*)$/gm, '$1');

  // 2. Convertir viñetas con asterisco o guión "* item" o "- item" a "• item"
  text = text.replace(/^\s*[\*\-]\s+/gm, '• ');

  // 3. Eliminar negritas e itálicas de markdown con asteriscos (**texto** o *texto*)
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  text = text.replace(/\*([^*]+)\*/g, '$1');

  // 4. Remover cualquier asterisco residual que haya quedado
  text = text.replace(/\*/g, '');

  // 5. Normalizar saltos de línea (máximo 2 saltos consecutivos)
  text = text.replace(/\n{3,}/g, '\n\n').trim();

  return text;
}

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

    // Obtener el perfil del usuario para recuperar su gemini_api_key y gemini_model
    let geminiApiKey = '';
    let geminiModel = 'gemini-2.5-flash';

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('gemini_api_key, gemini_model')
      .eq('id', user.id)
      .single();

    if (profileError) {
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
    const { 
      image, 
      mimeType = 'image/jpeg', 
      testConnection = false,
      productName = '',
      productInfo = '',
      price: inputPrice = null,
      currency: inputCurrency = 'USD'
    } = requestBody;

    if (testConnection) {
      console.log(`Llamando a Gemini (${geminiModel}) para test de conexión del usuario ${user.id}...`);
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`;
      const geminiResponse = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Responde estrictamente con la palabra OK." }] }]
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

    // Validación de entrada: se necesita imagen o al menos nombre/especificaciones
    const hasImage = Boolean(image && typeof image === 'string' && image.trim().length > 0);
    const hasText = Boolean((productName && productName.trim().length > 0) || (productInfo && productInfo.trim().length > 0));

    if (!hasImage && !hasText) {
      throw new Error('Escribe el nombre del producto, añade especificaciones o sube una imagen para que la IA pueda completar la ficha.');
    }

    // Diseñar prompt estructurado para búsqueda en internet y división en las 3 secciones requeridas
    const promptText = `Actúa como un experto en catalogación y fichas técnicas de productos e-commerce de alto nivel.
TU TAREA: Investigar en internet (usando la búsqueda de Google) y analizar ${hasImage ? 'la imagen adjunta del producto y ' : ''}los datos provistos para generar una ficha de producto completa, precisa y profesional dividida en 3 secciones fundamentales:
1) DESCRIPCIÓN
2) DETALLES Y DIMENSIONES
3) CUIDADO Y MANTENIMIENTO

Datos provistos por el usuario:
- Nombre o título indicado: "${productName || 'No especificado'}"
- Precio de referencia actual: ${inputPrice !== null && inputPrice !== undefined && inputPrice !== '' ? `${inputPrice} ${inputCurrency || 'USD'}` : 'No detectado'}
- Especificaciones o notas suministradas:
"""
${productInfo || 'Sin notas adicionales'}
"""

INSTRUCCIONES DE INVESTIGACIÓN:
- BUSCA EN INTERNET el producto exacto por su nombre comercial, marca y modelo.
- Obtén las dimensiones reales (alto, ancho, profundidad, peso), materiales de fabricación y especificaciones técnicas oficiales del fabricante.
- Obtén las pautas oficiales o mejores prácticas recomendadas de cuidado, limpieza y mantenimiento.

REGLAS ESTRICTAS DE FORMATO Y CONTENIDO (PROHIBIDO USAR ASTERISCOS * O **):
1. "title": Título comercial conciso, profesional y atractivo (Marca + Modelo específico + Capacidad/Variante técnica). Máximo 8 palabras. Sin emojis.
2. "price": Precio numérico de venta sugerido o detectado (número entero o decimal). Si no se conoce con certeza o no viene especificado, asigna null.
3. "currency": "USD" o "CUP" (por defecto "USD", o "CUP" si las notas o contexto lo indican).
4. "description": Descripción general y comercial del producto. Explica qué es, su función principal, para quién está diseñado y sus principales beneficios o características diferenciales. No uses asteriscos. Redacción limpia, atractiva y directa.
5. "details_and_dimensions": Especificaciones técnicas completas organizadas con viñetas limpias usando el carácter "• ". Debe incluir:
   • Medidas y dimensiones (ej: Alto, Ancho, Profundidad, Diámetro)
   • Peso aproximado
   • Materiales de construcción / fabricación
   • Especificaciones técnicas clave (capacidad, potencia, voltaje, compatibilidad, conectividad, etc.)
   • Qué incluye el paquete / empaque
6. "care_and_maintenance": Guía práctica y recomendaciones de uso, limpieza y mantenimiento preventivo para prolongar la vida útil del producto, organizadas con viñetas limpias usando "• ". Debe incluir:
   • Modo adecuado de limpieza y productos recomendados o a evitar
   • Precauciones de uso y seguridad
   • Almacenamiento y conservación adecuada

IMPORTANTE: Responde ÚNICAMENTE con un bloque JSON válido, sin explicaciones ni texto fuera de él. Formato requerido:
\`\`\`json
{
  "title": "string",
  "price": null,
  "currency": "USD",
  "description": "string",
  "details_and_dimensions": "string",
  "care_and_maintenance": "string"
}
\`\`\``;

    const parts: any[] = [{ text: promptText }];
    if (hasImage) {
      parts.push({
        inlineData: {
          mimeType,
          data: image
        }
      });
    }

    const modelsToTry = [
      geminiModel,
      'gemini-2.5-flash',
      'gemini-2.0-flash'
    ].filter((m, idx, arr) => Boolean(m) && arr.indexOf(m) === idx);

    let parsedResult: ParsedAIResponse | null = null;
    let lastError: any = null;

    for (const model of modelsToTry) {
      // 1. Intento con Google Search Grounding habilitado para investigar en internet
      try {
        console.log(`Llamando a Gemini (${model}) con Google Search Grounding para usuario ${user.id}...`);
        const searchUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;
        const searchResp = await fetch(searchUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts }],
            tools: [{ googleSearch: {} }],
            generationConfig: {
              maxOutputTokens: 3000,
              temperature: 0.2
            }
          })
        });

        if (searchResp.ok) {
          const searchData = await searchResp.json();
          const rawText = searchData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            parsedResult = parseJsonFromText(rawText);
            if (parsedResult) break;
          }
        } else {
          const errText = await searchResp.text();
          console.warn(`[Search Grounding] Intento con ${model} devolvió ${searchResp.status}: ${errText}. Reintentando sin tools...`);
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[Search Grounding] Error en ${model}:`, err?.message);
      }

      // 2. Fallback inmediato sin tools para el mismo modelo
      try {
        console.log(`Llamando a Gemini (${model}) sin tools (fallback)...`);
        const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;
        const fallbackResp = await fetch(fallbackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts }],
            generationConfig: {
              maxOutputTokens: 3000,
              temperature: 0.2
            }
          })
        });

        if (fallbackResp.ok) {
          const fallbackData = await fallbackResp.json();
          const rawText = fallbackData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            parsedResult = parseJsonFromText(rawText);
            if (parsedResult) break;
          }
        } else {
          const errText = await fallbackResp.text();
          console.warn(`[Fallback] Intento sin tools en ${model} falló:`, errText);
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[Fallback] Error sin tools en ${model}:`, err?.message);
      }
    }

    if (!parsedResult) {
      throw new Error(
        lastError?.message || 'No se pudo generar la información del producto con IA.'
      );
    }

    const sanitizedResult = {
      title: parsedResult.title ? String(parsedResult.title).trim() : (productName || 'Producto sin título'),
      price: typeof parsedResult.price === 'number' && !isNaN(parsedResult.price) && parsedResult.price > 0 ? parsedResult.price : null,
      currency: parsedResult.currency === 'CUP' ? 'CUP' : 'USD',
      description: sanitizeText(parsedResult.description),
      details_and_dimensions: sanitizeText(parsedResult.details_and_dimensions),
      care_and_maintenance: sanitizeText(parsedResult.care_and_maintenance)
    };

    return new Response(JSON.stringify(sanitizedResult), {
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
