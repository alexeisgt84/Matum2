import { describe, it, expect } from 'vitest';
import { parseProductText } from '../priceParser';

describe('priceParser - parseProductText', () => {
  it('debe devolver valores vacíos cuando el texto es nulo o vacío', () => {
    expect(parseProductText('')).toEqual({
      suggestedTitle: '',
      bestPrice: null,
      allPrices: [],
    });
  });

  it('debe detectar precios explícitos con prefijo "Precio:" y moneda USD', () => {
    const text = 'Zapatillas Nike Air Max\nPrecio: $45 USD\nNuevas en caja';
    const result = parseProductText(text);

    expect(result.suggestedTitle).toBe('Zapatillas Nike Air Max');
    expect(result.bestPrice).not.toBeNull();
    expect(result.bestPrice?.price).toBe(45);
    expect(result.bestPrice?.currency).toBe('USD');
    expect(result.bestPrice?.confidence).toBe(10);
  });

  it('debe detectar precios en CUP con emoji y separador de miles', () => {
    const text = '🔥 Ventilador Recargable\n💵 Precio: 12,500 CUP\nEntrega gratis';
    const result = parseProductText(text);

    expect(result.suggestedTitle).toBe('Ventilador Recargable');
    expect(result.bestPrice?.price).toBe(12500);
    expect(result.bestPrice?.currency).toBe('CUP');
  });

  it('debe interpretar sufijos "k" como miles (ej: 15k CUP -> 15000)', () => {
    const text = 'Smartphone Xiaomi Redmi\nPrecio: 15k cup\nExcelente estado';
    const result = parseProductText(text);

    expect(result.bestPrice?.price).toBe(15000);
    expect(result.bestPrice?.currency).toBe('CUP');
  });

  it('debe procesar pares de precios con barra ("40 usd / 14000 cup")', () => {
    const text = 'Audífonos Bluetooth\n40 usd / 14000 cup\nGarantía de 1 mes';
    const result = parseProductText(text);

    expect(result.allPrices.length).toBeGreaterThanOrEqual(2);
    const usdPrice = result.allPrices.find(p => p.currency === 'USD');
    const cupPrice = result.allPrices.find(p => p.currency === 'CUP');

    expect(usdPrice?.price).toBe(40);
    expect(cupPrice?.price).toBe(14000);
  });

  it('debe ignorar números de teléfono y especificaciones que no son precios', () => {
    const text = 'Laptop Asus 16gb ram 512gb ssd\nTeléfono: 52345678\nPrecio: 350 usd\nTalla: 42';
    const result = parseProductText(text);

    expect(result.bestPrice?.price).toBe(350);
    expect(result.bestPrice?.currency).toBe('USD');
    
    // No debe detectar el teléfono como precio
    const phoneDetected = result.allPrices.some(p => p.price === 52345678);
    expect(phoneDetected).toBe(false);
  });

  it('debe ignorar unidades de distancia o tiempo en frases contextuales', () => {
    const text = 'Casa independiente en Playa\na 100 metros del mar\nen 24 horas te respondemos\nPrecio: $85000 USD';
    const result = parseProductText(text);

    expect(result.bestPrice?.price).toBe(85000);
    expect(result.bestPrice?.currency).toBe('USD');
    
    const distanceDetected = result.allPrices.some(p => p.price === 100);
    expect(distanceDetected).toBe(false);
  });

  it('debe normalizar monedas en español como "pesos" o "mn" a CUP', () => {
    const text = 'Cafetera Eléctrica\nCosto: 3500 pesos\nNueva';
    const result = parseProductText(text);

    expect(result.bestPrice?.price).toBe(3500);
    expect(result.bestPrice?.currency).toBe('CUP');
  });
});
