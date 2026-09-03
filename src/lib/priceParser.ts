/**
 * Utilidad para extraer precios, monedas y títulos sugeridos de textos compartidos
 * (WhatsApp, Telegram, Facebook Marketplace, etc.) con soporte completo para markdown de WhatsApp (*bold*, _italic_),
 * emojis y formatos cubanos/internacionales.
 */

export interface DetectedPrice {
  price: number;
  currency: 'USD' | 'CUP';
  rawText: string;
  confidence: number; // 1 (bajo) a 10 (muy alto)
}

export interface ParsedProductText {
  suggestedTitle: string;
  bestPrice: DetectedPrice | null;
  allPrices: DetectedPrice[];
}

// Unidades y especificaciones a ignorar como precios (cuando van después del número)
const EXCLUDED_UNITS_AFTER = /^(gb|tb|mb|kb|w|watt|watts|kw|v|voltios|volts|hz|ghz|mhz|mah|ah|kg|g|gr|grs|gramos|lb|lbs|libras|oz|ml|l|litros|cm|mm|m|metros|pulgadas|pulg|"|'|fps|unidades|piezas|uds|pcs|dias|días|meses|anos|años|horas|h)\b/i;

// Palabras clave que indican especificaciones previas al número (ignorar)
const EXCLUDED_KEYWORDS_BEFORE = /(talla|size|calzado|número|numero|capacidad|almacenamiento|ram|rom|bateria|batería|version|versión|puerto|puertos|modelo|garantia|garantía)\s*[:\-]?\s*$/i;

// Palabras de contacto que preceden números de teléfono
const PHONE_KEYWORDS = /(tel|telefono|teléfono|whatsapp|cel|celular|movil|móvil|contacto|escribir|llamar|info|privado)\s*[:\-]?\s*$/i;

/**
 * Normaliza una cadena de número (maneja "1,500", "1.500", "120k", "12.50", "12,50", "12500")
 */
function parseNumberString(numStr: string, hasKMultiplier: boolean = false): number | null {
  if (!numStr) return null;
  let cleaned = numStr.trim().replace(/\s+/g, '').replace(/[\$*~_]/g, '');
  
  if (hasKMultiplier || /k$/i.test(cleaned)) {
    cleaned = cleaned.replace(/k$/i, '');
    const base = parseFloat(cleaned.replace(',', '.'));
    if (!isNaN(base)) {
      return Math.round(base * 1000);
    }
  }

  // Si tiene formato de miles con punto/coma (ej: 1,500 o 1.500 o 25,000 o 25.000)
  if (/^\d{1,3}[.,]\d{3}$/.test(cleaned)) {
    cleaned = cleaned.replace(/[.,]/, '');
    const val = parseFloat(cleaned);
    return isNaN(val) ? null : val;
  }

  // Si tiene decimales tipo "12.50" o "12,50"
  if (/^\d+[.,]\d{1,2}$/.test(cleaned)) {
    cleaned = cleaned.replace(',', '.');
    const val = parseFloat(cleaned);
    return isNaN(val) ? null : val;
  }

  // Número entero o decimal estándar
  cleaned = cleaned.replace(',', '.');
  const val = parseFloat(cleaned);
  return isNaN(val) ? null : val;
}

/**
 * Determina la moneda estándar ('USD' o 'CUP') a partir de un texto indicador
 */
function normalizeCurrency(currStr?: string): 'USD' | 'CUP' {
  if (!currStr) return 'USD';
  const c = currStr.toLowerCase().replace(/[\$*~_\s]/g, '').trim();
  if (c === 'cup' || c === 'pesos' || c === 'peso' || c === 'mn' || c === 'monedanacional') {
    return 'CUP';
  }
  // USD, MLC, EUR, DOLARES, $, FULAS, VERDES -> por defecto USD en el sistema
  return 'USD';
}

/**
 * Analiza un texto y extrae todos los posibles precios detectados
 */
export function parseProductText(text: string): ParsedProductText {
  if (!text || typeof text !== 'string') {
    return { suggestedTitle: '', bestPrice: null, allPrices: [] };
  }

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  
  // 1. Extraer título sugerido (primera línea limpia que no sea solo un precio o contacto)
  let suggestedTitle = '';
  for (const line of lines) {
    const cleanLine = line
      .replace(/^[\*\-•#_~✨🔥🛍️🎉⚡📢👉📦🏷️💵💰]+\s*/u, '')
      .replace(/[\*\-•_~]+$/g, '')
      .trim();
    
    // Ignorar si es solo "Precio: $..." o "Contacto: ..." o muy corta
    if (
      cleanLine.length >= 3 &&
      !/^[*_~]*\s*precio\s*[:=\->]/i.test(cleanLine) &&
      !PHONE_KEYWORDS.test(cleanLine) &&
      !/^(\$?\d+[\d\s,.]*(usd|cup|mlc|\$)?)$/i.test(cleanLine)
    ) {
      suggestedTitle = cleanLine.slice(0, 100);
      break;
    }
  }

  const detectedPrices: DetectedPrice[] = [];

  // Helper para añadir precio evitando duplicados exactos
  const addPrice = (price: number, currency: 'USD' | 'CUP', rawText: string, confidence: number) => {
    if (price <= 0 || price > 10000000) return;
    
    // Ignorar teléfonos cubanos típicos (ej: 8 dígitos empezando por 5, o prefijos de 10 dígitos)
    if (price >= 50000000 && price <= 69999999) return;
    if (price >= 5350000000 && price <= 5359999999) return;
    
    // Ignorar años comunes (2020 a 2030) a menos que la confianza sea muy alta (>=8)
    if (price >= 2020 && price <= 2030 && confidence < 8) return;

    // Comprobar si ya existe un precio con misma moneda y valor
    const existing = detectedPrices.find(p => p.price === price && p.currency === currency);
    if (existing) {
      if (confidence > existing.confidence) {
        existing.confidence = confidence;
        existing.rawText = rawText;
      }
    } else {
      detectedPrices.push({ price, currency, rawText, confidence });
    }
  };

  // --- PATRÓN 1: Menciones con prefijo explícito y soporte para markdown de WhatsApp (Confianza Muy Alta: 10) ---
  // Ej: "*Precio:* 45 USD", "💵 *Precio:* $50", "Precio: 12000 CUP", "*PRECIO :* $ 35.00", "_Precio:_ 25 MLC"
  const robustPrefixRegex = /(?:(?:💵|💰|🏷️|💲)\s*)?(?:[*_~]*\s*(?:precio|valor|cuesta|costo|a\s+solo)[*_~]*)\s*[:=\->]*\s*[*_~]*\s*(\$?\s*(?:\d{1,3}(?:[.,]\d{3})+|\d+)(?:[.,]\d{1,2})?\s*k?)\s*[*_~]*\s*(usd|cup|mlc|eur|euros?|dolares|dólares|pesos|mn|\$)?/gi;
  let match: RegExpExecArray | null;
  while ((match = robustPrefixRegex.exec(text)) !== null) {
    const rawVal = match[1];
    const curr = match[2] || (rawVal.includes('$') ? '$' : undefined);
    const hasK = /k$/i.test(rawVal);
    const num = parseNumberString(rawVal, hasK);
    if (num !== null) {
      addPrice(num, normalizeCurrency(curr), match[0].trim(), 10);
    }
  }

  // --- PATRÓN 2: Emojis solos como prefijos directos: 💵 45, 💰 12000 cup, 🏷️ 35 USD ---
  const emojiOnlyRegex = /(?:💵|💰|🏷️|💲)\s*[:=\->]*\s*[*_~]*\s*(\$?\s*(?:\d{1,3}(?:[.,]\d{3})+|\d+)(?:[.,]\d{1,2})?\s*k?)\s*[*_~]*\s*(usd|cup|mlc|eur|euros?|dolares|dólares|pesos|mn|\$)?/gi;
  while ((match = emojiOnlyRegex.exec(text)) !== null) {
    const rawVal = match[1];
    const curr = match[2] || (rawVal.includes('$') ? '$' : undefined);
    const hasK = /k$/i.test(rawVal);
    const num = parseNumberString(rawVal, hasK);
    if (num !== null) {
      addPrice(num, normalizeCurrency(curr), match[0].trim(), 9);
    }
  }

  // --- PATRÓN 3: Precios compuestos con barra "/" (ej: "40 usd / 14000 cup", "$35 / $12000") ---
  const slashPairsRegex = /((?:\d{1,3}(?:[.,]\d{3})+|\d+)(?:[.,]\d{1,2})?\s*k?)\s*[*_~]*\s*(usd|cup|mlc|\$)?\s*[*_~]*\s*\/\s*[*_~]*\s*((?:\d{1,3}(?:[.,]\d{3})+|\d+)(?:[.,]\d{1,2})?\s*k?)\s*[*_~]*\s*(usd|cup|mlc|\$)?/gi;
  while ((match = slashPairsRegex.exec(text)) !== null) {
    const val1 = parseNumberString(match[1], /k$/i.test(match[1]));
    const curr1 = match[2];
    const val2 = parseNumberString(match[3], /k$/i.test(match[3]));
    const curr2 = match[4];

    if (val1 !== null) {
      addPrice(val1, normalizeCurrency(curr1 || (val1 < 500 ? 'USD' : 'CUP')), match[1], 9);
    }
    if (val2 !== null) {
      addPrice(val2, normalizeCurrency(curr2 || (val2 >= 500 ? 'CUP' : 'USD')), match[3], 9);
    }
  }

  // --- PATRÓN 4: Número con símbolo de moneda o moneda pegada/separada (Confianza Alta: 8) ---
  // Ej: "$45", "45$", "650 usd", "220000 cup", "45usd", "14000cup", "35.50 USD", "14k cup", "1500 pesos"
  const symbolOrCurrencyRegex = /(?:(\$)\s*[*_~]*\s*((?:\d{1,3}(?:[.,]\d{3})+|\d+)(?:[.,]\d{1,2})?\s*k?)|\b((?:\d{1,3}(?:[.,]\d{3})+|\d+)(?:[.,]\d{1,2})?\s*k?)\s*[*_~]*\s*(\$|usd|cup|mlc|eur|euros?|dolares|dólares|pesos|mn)\b)/gi;
  while ((match = symbolOrCurrencyRegex.exec(text)) !== null) {
    const isPrefixDollar = match[1] === '$';
    const rawVal = isPrefixDollar ? match[2] : match[3];
    const curr = isPrefixDollar ? '$' : match[4];
    
    // Verificar que el contexto previo no sea un teléfono ("tel: 52345678") o talla/specs ("talla 42")
    const matchIndex = match.index;
    const precedingText = text.slice(Math.max(0, matchIndex - 25), matchIndex);
    if (PHONE_KEYWORDS.test(precedingText) || EXCLUDED_KEYWORDS_BEFORE.test(precedingText)) {
      continue;
    }

    const hasK = /k$/i.test(rawVal);
    const num = parseNumberString(rawVal, hasK);
    if (num !== null) {
      addPrice(num, normalizeCurrency(curr), match[0].trim(), 8);
    }
  }

  // --- PATRÓN 5: Palabras contextuales "a/en/por" (Confianza Media: 6) ---
  // Ej: "en 45 te lo dejo", "a 3500 cada uno"
  const contextualRegex = /(?:a|en|por)\s+(\$?\s*(?:\d{1,3}(?:[.,]\d{3})+|\d+)(?:[.,]\d{1,2})?)\s*[*_~]*\s*(usd|cup|mlc|pesos|dolares|\$)?\b/gi;
  while ((match = contextualRegex.exec(text)) !== null) {
    const rawVal = match[1].replace('$', '').trim();
    const curr = match[2];
    
    const matchIndex = match.index;
    const precedingText = text.slice(Math.max(0, matchIndex - 25), matchIndex);
    if (EXCLUDED_KEYWORDS_BEFORE.test(precedingText) || PHONE_KEYWORDS.test(precedingText)) {
      continue;
    }

    // Verificar si sigue una unidad excluida (ej: "a 100 metros", "en 24 horas")
    const followingText = text.slice(match.index + match[0].length).trim();
    if (EXCLUDED_UNITS_AFTER.test(followingText)) {
      continue;
    }

    const num = parseNumberString(rawVal);
    if (num !== null) {
      const inferredCurr = curr ? normalizeCurrency(curr) : (num < 500 ? 'USD' : 'CUP');
      addPrice(num, inferredCurr, match[0].trim(), 6);
    }
  }

  // Ordenar precios por confianza descendente
  detectedPrices.sort((a, b) => b.confidence - a.confidence);

  const bestPrice = detectedPrices.length > 0 ? detectedPrices[0] : null;

  return {
    suggestedTitle,
    bestPrice,
    allPrices: detectedPrices,
  };
}
