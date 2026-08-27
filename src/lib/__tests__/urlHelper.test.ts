import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getAppBaseUrl } from '../urlHelper';

describe('urlHelper - getAppBaseUrl', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('debe devolver la URL configurada con https si no tiene protocolo', () => {
    // Simulamos un entorno no-localhost
    delete (window as any).location;
    (window as any).location = {
      hostname: 'matum.vercel.app',
      origin: 'https://matum.vercel.app',
    };

    expect(getAppBaseUrl('miapp.com')).toBe('https://miapp.com');
  });

  it('debe respetar el protocolo existente y limpiar la barra final de la URL configurada', () => {
    delete (window as any).location;
    (window as any).location = {
      hostname: 'matum.vercel.app',
      origin: 'https://matum.vercel.app',
    };

    expect(getAppBaseUrl('https://custom-domain.com/')).toBe('https://custom-domain.com');
    expect(getAppBaseUrl('http://custom-domain.com/')).toBe('http://custom-domain.com');
  });

  it('debe usar el fallback por defecto si no hay setting ni localhost', () => {
    delete (window as any).location;
    (window as any).location = {
      hostname: 'production.com',
      origin: 'https://production.com',
    };

    expect(getAppBaseUrl()).toBe('https://matum.vercel.app');
  });

  it('debe priorizar localhost en desarrollo local', () => {
    delete (window as any).location;
    (window as any).location = {
      hostname: 'localhost',
      origin: 'http://localhost:5173',
    };

    expect(getAppBaseUrl('https://configured.com')).toBe('http://localhost:5173');
  });
});
