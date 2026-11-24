import { describe, it, expect } from 'vitest';
import { formatProductShareText } from '../shareTemplate';

describe('formatProductShareText', () => {
  const baseParams = {
    productName: 'Zapatilla Pro',
    productDescription: 'Muy cómoda para correr',
    priceText: '2500 CUP',
    currencyText: '',
    catalogName: 'Mi Tienda',
    contactNumber: '5355555555',
    productUrl: 'https://nazaar.shop/mi-tienda/p/p1?ref=PROMO',
    storeUrl: 'https://nazaar.shop/mi-tienda?ref=PROMO',
  };

  it('no inserta ningún enlace si la plantilla del usuario no incluye etiquetas de URL', () => {
    const result = formatProductShareText({
      ...baseParams,
      shareTemplate: '🔥 *{product_name}* a solo {product_price}\n\n{product_description}\n\nTienda: {catalog_name}',
    });

    expect(result).toBe('🔥 *Zapatilla Pro* a solo 2500 CUP\n\nMuy cómoda para correr\n\nTienda: Mi Tienda');
    expect(result).not.toContain('https://');
    expect(result).not.toContain('nazaar.shop');
  });

  it('inserta el enlace del producto exactamente una vez cuando la plantilla usa {product_url} o {product_referral_url}', () => {
    const withProductUrl = formatProductShareText({
      ...baseParams,
      shareTemplate: '*{product_name}* · {product_price}\n🔗 {product_url}',
    });

    expect(withProductUrl).toBe('*Zapatilla Pro* · 2500 CUP\n🔗 https://nazaar.shop/mi-tienda/p/p1?ref=PROMO');
    expect(withProductUrl.match(/nazaar\.shop/g)).toHaveLength(1);

    const withReferralTag = formatProductShareText({
      ...baseParams,
      shareTemplate: '*{product_name}*\n{product_referral_url}',
    });

    expect(withReferralTag).toBe('*Zapatilla Pro*\nhttps://nazaar.shop/mi-tienda/p/p1?ref=PROMO');
  });

  it('inserta el enlace de la tienda (no del producto) cuando la plantilla usa {store_url}', () => {
    const result = formatProductShareText({
      ...baseParams,
      shareTemplate: '*{product_name}*\nVisita la tienda: {store_url}',
    });

    expect(result).toBe('*Zapatilla Pro*\nVisita la tienda: https://nazaar.shop/mi-tienda?ref=PROMO');
    expect(result).not.toContain('/p/p1');
  });

  it('genera nombre, precio y descripción sin inyectar enlaces automáticamente cuando no hay shareTemplate', () => {
    const result = formatProductShareText({
      ...baseParams,
      priceText: '2500',
      currencyText: 'CUP',
      shareTemplate: null,
    });

    expect(result).toBe('*Zapatilla Pro*\n\nPrecio: 2500 CUP\n\nMuy cómoda para correr');
    expect(result).not.toContain('https://');
    expect(result).not.toContain('nazaar.shop');
  });
});
