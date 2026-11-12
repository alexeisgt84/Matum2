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

/**
 * Comprueba si dos números de teléfono corresponden a la misma persona
 * comparando los últimos 8 dígitos o el formato limpio normalizado.
 */
export const isSamePhone = (phoneA?: string | null, phoneB?: string | null): boolean => {
  if (!phoneA || !phoneB) return false;
  const cleanA = phoneA.replace(/\D/g, '');
  const cleanB = phoneB.replace(/\D/g, '');
  if (!cleanA || !cleanB) return false;
  if (cleanA === cleanB) return true;
  if (cleanA.length >= 8 && cleanB.length >= 8) {
    return cleanA.slice(-8) === cleanB.slice(-8);
  }
  return false;
};
