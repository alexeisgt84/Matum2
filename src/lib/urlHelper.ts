import { Capacitor } from '@capacitor/core';

export const DEFAULT_APP_BASE_URL = 'https://nazaar.shop';

/**
 * Detecta si la aplicación se está ejecutando dentro de un contenedor nativo (Capacitor/WebView)
 * donde window.location apunta a localhost o a un esquema nativo local.
 */
export function isNativeRuntime(): boolean {
  try {
    if (Capacitor.isNativePlatform()) {
      return true;
    }
  } catch {
    // Ignorar si Capacitor no está inicializado en tests/SSR
  }

  if (typeof window !== 'undefined' && window.location) {
    const protocol = (window.location.protocol || '').toLowerCase();
    if (protocol === 'capacitor:' || protocol === 'ionic:' || protocol === 'file:') {
      return true;
    }
  }

  return false;
}

/**
 * Determina si un hostname corresponde a desarrollo local / red privada.
 */
export function isLocalHostname(hostname?: string | null): boolean {
  if (!hostname) return false;
  const normalized = hostname.trim().toLowerCase();
  return (
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '::1' ||
    normalized.startsWith('192.168.')
  );
}

function normalizeConfiguredUrl(appUrlSetting?: string): string | null {
  if (!appUrlSetting) return null;
  const cleaned = appUrlSetting.trim().replace(/\/+$/, '');
  if (!cleaned) return null;

  const candidate =
    cleaned.startsWith('http://') || cleaned.startsWith('https://')
      ? cleaned
      : `https://${cleaned}`;

  try {
    const parsed = new URL(candidate);
    if (isLocalHostname(parsed.hostname)) {
      return null;
    }
    return candidate;
  } catch {
    return null;
  }
}

/**
 * Obtiene la URL base de la aplicación de forma dinámica.
 * - En entornos web de desarrollo local (no APK nativa), prioriza el origen actual (localhost) para facilitar pruebas.
 * - Si se proporciona la configuración de la base de datos (appUrlSetting) válida y no local, la utiliza adaptando el protocolo.
 * - De lo contrario, cae en el fallback predeterminado (https://nazaar.shop).
 */
export function getAppBaseUrl(appUrlSetting?: string): string {
  // 1. Detectar si estamos en un navegador web en localhost o IP de red local (nunca en APK nativa)
  if (
    !isNativeRuntime() &&
    typeof window !== 'undefined' &&
    window.location &&
    isLocalHostname(window.location.hostname)
  ) {
    return window.location.origin;
  }

  // 2. Si hay una configuración válida en la DB, usarla
  const configuredUrl = normalizeConfiguredUrl(appUrlSetting);
  if (configuredUrl) {
    return configuredUrl;
  }

  // 3. Fallback predeterminado
  return DEFAULT_APP_BASE_URL;
}

/**
 * Obtiene únicamente el host (sin protocolo) de la URL base pública.
 */
export function getAppHost(appUrlSetting?: string): string {
  return getAppBaseUrl(appUrlSetting).replace(/^https?:\/\//, '');
}

/**
 * Devuelve la URL pública equivalente a la ubicación actual.
 * En entornos nativos reemplaza el origen interno (https://localhost) por la URL pública real.
 */
export function getCurrentPublicUrl(appUrlSetting?: string): string | null {
  if (typeof window === 'undefined' || !window.location) {
    return null;
  }

  if (!isNativeRuntime()) {
    return window.location.href;
  }

  const baseUrl = getAppBaseUrl(appUrlSetting);
  const path = window.location.pathname || '';
  const search = window.location.search || '';
  const hash = window.location.hash || '';
  return `${baseUrl}${path}${search}${hash}`;
}
