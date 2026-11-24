import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Capacitor } from '@capacitor/core';
import {
  DEFAULT_APP_BASE_URL,
  getAppBaseUrl,
  getAppHost,
  getCurrentPublicUrl,
} from '../urlHelper';

describe('urlHelper - getAppBaseUrl', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
  });

  const mockWindowLocation = (loc: Partial<Location>) => {
    delete (window as any).location;
    (window as any).location = {
      protocol: 'https:',
      hostname: 'nazaar.shop',
      host: 'nazaar.shop',
      origin: 'https://nazaar.shop',
      pathname: '/',
      search: '',
      hash: '',
      href: 'https://nazaar.shop/',
      ...loc,
    };
  };

  it('debe devolver la URL configurada con https si no tiene protocolo', () => {
    mockWindowLocation({
      hostname: 'nazaar.shop',
      origin: 'https://nazaar.shop',
    });

    expect(getAppBaseUrl('miapp.com')).toBe('https://miapp.com');
  });

  it('debe respetar el protocolo existente y limpiar la barra final de la URL configurada', () => {
    mockWindowLocation({
      hostname: 'nazaar.shop',
      origin: 'https://nazaar.shop',
    });

    expect(getAppBaseUrl('https://custom-domain.com/')).toBe('https://custom-domain.com');
    expect(getAppBaseUrl('http://custom-domain.com/')).toBe('http://custom-domain.com');
  });

  it('debe usar el fallback por defecto si no hay setting ni localhost', () => {
    mockWindowLocation({
      hostname: 'production.com',
      origin: 'https://production.com',
    });

    expect(getAppBaseUrl()).toBe('https://nazaar.shop');
  });

  it('debe priorizar localhost en desarrollo local web', () => {
    mockWindowLocation({
      protocol: 'http:',
      hostname: 'localhost',
      host: 'localhost:5173',
      origin: 'http://localhost:5173',
    });

    expect(getAppBaseUrl('https://configured.com')).toBe('http://localhost:5173');
  });

  it('debe devolver nazaar.shop o la URL configurada en APK nativa aunque window.location sea localhost', () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    mockWindowLocation({
      protocol: 'https:',
      hostname: 'localhost',
      host: 'localhost',
      origin: 'https://localhost',
    });

    expect(getAppBaseUrl()).toBe(DEFAULT_APP_BASE_URL);
    expect(getAppBaseUrl('nazaar.shop')).toBe('https://nazaar.shop');
    expect(getAppBaseUrl('custom.shop')).toBe('https://custom.shop');
    expect(getAppBaseUrl('http://localhost:5173')).toBe('https://nazaar.shop');
  });

  it('debe detectar protocolos nativos (capacitor/ionic) incluso si isNativePlatform devuelve false', () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    mockWindowLocation({
      protocol: 'capacitor:',
      hostname: 'localhost',
      host: 'localhost',
      origin: 'capacitor://localhost',
    });

    expect(getAppBaseUrl()).toBe('https://nazaar.shop');
  });

  it('getAppHost devuelve el host público sin protocolo', () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    mockWindowLocation({
      hostname: 'localhost',
      origin: 'https://localhost',
    });
    expect(getAppHost()).toBe('nazaar.shop');

    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    mockWindowLocation({
      protocol: 'http:',
      hostname: 'localhost',
      host: 'localhost:5173',
      origin: 'http://localhost:5173',
    });
    expect(getAppHost()).toBe('localhost:5173');
  });

  it('getCurrentPublicUrl reemplaza https://localhost por el dominio público en APK nativa', () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    mockWindowLocation({
      protocol: 'https:',
      hostname: 'localhost',
      host: 'localhost',
      origin: 'https://localhost',
      pathname: '/mi-tienda/p/1',
      search: '?ref=abc',
      hash: '#detalles',
      href: 'https://localhost/mi-tienda/p/1?ref=abc#detalles',
    });

    expect(getCurrentPublicUrl()).toBe('https://nazaar.shop/mi-tienda/p/1?ref=abc#detalles');

    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    mockWindowLocation({
      protocol: 'https:',
      hostname: 'nazaar.shop',
      host: 'nazaar.shop',
      origin: 'https://nazaar.shop',
      pathname: '/mi-tienda/p/1',
      search: '?ref=abc',
      hash: '',
      href: 'https://nazaar.shop/mi-tienda/p/1?ref=abc',
    });
    expect(getCurrentPublicUrl()).toBe('https://nazaar.shop/mi-tienda/p/1?ref=abc');
  });
});
