import { describe, expect, it } from 'vitest';
import {
  CONSULT_PRICE_LABEL,
  buildPricingContext,
  getCartTotals,
  getPriceParts,
  getPriceText,
  getUnifiedTotal,
} from '../pricing';
import type { CartItem, PublicProduct } from '../../types/store';

const baseProduct: PublicProduct = {
  id: 'p1',
  name: 'Café Molido 250g',
  description: null,
  price: 1000,
  currency: 'CUP',
  imagen_url: null,
  is_out_of_stock: false,
  stock_status: 'in_stock',
};

describe('pricing (tiendas públicas)', () => {
  it('muestra "Consultar precio" cuando price es null', () => {
    const ctx = buildPricingContext({ display_currency: 'both', usd_to_cup_rate: 300 }, 'pro');
    expect(getPriceParts({ ...baseProduct, price: null }, ctx)).toBeNull();
    expect(getPriceText({ ...baseProduct, price: null }, ctx)).toBe(CONSULT_PRICE_LABEL);
  });

  it('ignora la dualidad de moneda cuando el vendedor está en plan free', () => {
    const ctx = buildPricingContext(
      { display_currency: 'usd', cup_to_usd_rate: 0.01, usd_to_cup_rate: 100 },
      'free'
    );
    const parts = getPriceParts(baseProduct, ctx);
    expect(parts?.main).toContain('CUP');
    expect(parts?.secondary).toBeUndefined();
  });

  it('calcula moneda principal y equivalente en modo "both" para planes de pago', () => {
    const ctx = buildPricingContext(
      { display_currency: 'both', cup_to_usd_rate: 0.01, usd_to_cup_rate: 100 },
      'pro'
    );
    const parts = getPriceParts(baseProduct, ctx, 2);
    expect(parts?.main).toMatch(/2[.,\s]?000 CUP/);
    expect(parts?.secondary).toBe('20 USD');
  });

  it('suma los totales del carrito según la moneda configurada y el total unificado para pedido mínimo', () => {
    const cart: CartItem[] = [
      { product: baseProduct, quantity: 2 }, // 2000 CUP
      {
        product: { ...baseProduct, id: 'p2', price: 10, currency: 'USD' },
        quantity: 1,
      },
    ];
    const ctx = buildPricingContext(
      { display_currency: 'both', cup_to_usd_rate: 0.01, usd_to_cup_rate: 100 },
      'pro'
    );

    const totals = getCartTotals(cart, ctx);
    expect(totals.USD).toBeCloseTo(30);
    expect(totals.CUP).toBeCloseTo(3000);

    const unifiedCup = getUnifiedTotal(cart, 'CUP', { usdToCup: 100, cupToUsd: 0.01 });
    expect(unifiedCup).toBe(3000);
  });
});
