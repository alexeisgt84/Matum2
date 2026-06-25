/**
 * Obtiene la URL base de la aplicación de forma dinámica.
 * - Si estamos en desarrollo local en un navegador web, prioriza el origen actual (localhost) para facilitar pruebas.
 * - Si se proporciona la configuración de la base de datos (appUrlSetting), la utiliza adaptando el protocolo.
 * - De lo contrario, cae en el fallback predeterminado.
 */
export function getAppBaseUrl(appUrlSetting?: string): string {
  // 1. Detectar si estamos en un navegador en localhost o IP de red local
  if (
    typeof window !== 'undefined' &&
    window.location &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.startsWith('192.168.'))
  ) {
    return window.location.origin;
  }

  // 2. Si hay una configuración en la DB, usarla
  if (appUrlSetting) {
    const cleaned = appUrlSetting.trim().replace(/\/$/, '');
    if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
      return cleaned;
    }
    return `https://${cleaned}`;
  }

  // 3. Fallback predeterminado
  return 'https://matum.vercel.app';
}
