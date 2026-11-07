// Utilidades de WhatsApp compartidas por las tiendas públicas.

/**
 * Limpia un número de teléfono para usarlo en enlaces wa.me.
 * Si es un número cubano de 8 dígitos que empieza por 5 o 6, añade el código de país 53.
 */
export const normalizeWhatsAppPhone = (phone: string | null | undefined): string => {
  let digits = (phone || '').replace(/\D/g, '');
  if (digits.length === 8 && (digits.startsWith('5') || digits.startsWith('6'))) {
    digits = '53' + digits;
  }
  return digits;
};

export const buildWhatsAppUrl = (phone: string | null | undefined, text?: string): string => {
  const base = `https://wa.me/${normalizeWhatsAppPhone(phone)}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
};
