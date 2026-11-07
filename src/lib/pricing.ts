// Lógica centralizada de precios para las tiendas públicas.
// Sustituye las implementaciones duplicadas que existían en PublicCatalogPage y PublicProductPage.

import type { CartItem, DisplayCurrency } from '../types/store';

export interface PricingContext {
  /** Plan del vendedor. Los usuarios "free" no tienen dualidad de moneda. */
  plan: string;
  displayCurrency?: DisplayCurrency | null;
  usdToCupRate?: number | null;
  cupToUsdRate?: number | null;
}

export interface PriceableProduct {
  price: number | null;
  currency: string;
  price_cup?: number | null;
  price_usd?: number | null;
}

export interface PriceParts {
  /** Precio principal formateado, p. ej. "1 250 CUP" */
  main: string;
  /** Precio secundario (sólo en modo "both"), p. ej. "5 USD" */
  secondary?: string;
}

export const CONSULT_PRICE_LABEL = 'Consultar precio';

interface CatalogPricingFields {
  display_currency?: DisplayCurrency | null;
  usd_to_cup_rate?: number | null;
  cup_to_usd_rate?: number | null;
}

export const buildPricingContext = (
  catalog: CatalogPricingFields | null | undefined,
  plan: string
): PricingContext => ({
  plan,
  displayCurrency: catalog?.display_currency ?? 'original',
  usdToCupRate: catalog?.usd_to_cup_rate ?? null,
  cupToUsdRate: catalog?.cup_to_usd_rate ?? null,
});

export const hasCurrencyDuality = (plan: string | null | undefined) => !!plan && plan !== 'free';

export const getEffectiveDisplayCurrency = (ctx: PricingContext): DisplayCurrency =>
  hasCurrencyDuality(ctx.plan) ? ctx.displayCurrency || 'original' : 'original';

export const formatAmount = (value: number) =>
  value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const getRates = (ctx: PricingContext) => ({
  usdToCup: Number(ctx.usdToCupRate) || 1.0,
  cupToUsd: Number(ctx.cupToUsdRate) || 1.0,
});

/** Precio unitario del producto expresado en USD y en CUP. */
export const resolveUnitPrices = (product: PriceableProduct, ctx: PricingContext) => {
  const price = Number(product.price) || 0;
  const { usdToCup, cupToUsd } = getRates(ctx);
  const usd =
    product.price_usd !== null && product.price_usd !== undefined
      ? Number(product.price_usd)
      : product.currency === 'USD'
        ? price
        : price * cupToUsd;
  const cup =
    product.price_cup !== null && product.price_cup !== undefined
      ? Number(product.price_cup)
      : product.currency === 'CUP'
        ? price
        : price * usdToCup;
  return { usd, cup };
};

/**
 * Devuelve las partes del precio a mostrar (para `qty` unidades),
 * o `null` si el producto no tiene precio ("Consultar precio").
 */
export const getPriceParts = (
  product: PriceableProduct,
  ctx: PricingContext,
  qty = 1
): PriceParts | null => {
  if (product.price === null || product.price === undefined) return null;

  const mode = getEffectiveDisplayCurrency(ctx);
  const original = `${formatAmount(Number(product.price) * qty)} ${product.currency}`;
  if (mode === 'original') return { main: original };

  const { usd, cup } = resolveUnitPrices(product, ctx);
  const usdText = `${formatAmount(usd * qty)} USD`;
  const cupText = `${formatAmount(cup * qty)} CUP`;

  switch (mode) {
    case 'usd':
      return { main: usdText };
    case 'cup':
      return { main: cupText };
    case 'both':
      return product.currency === 'USD'
        ? { main: usdText, secondary: cupText }
        : { main: cupText, secondary: usdText };
    default:
      return { main: original };
  }
};

/** Precio como texto plano (para mensajes de WhatsApp, compartir, etc.). */
export const getPriceText = (product: PriceableProduct, ctx: PricingContext, qty = 1): string => {
  const parts = getPriceParts(product, ctx, qty);
  if (!parts) return CONSULT_PRICE_LABEL;
  return parts.secondary ? `${parts.main} / ${parts.secondary}` : parts.main;
};

/** Totales del carrito agrupados por moneda según el modo de visualización. */
export const getCartTotals = (cart: CartItem[], ctx: PricingContext): Record<string, number> => {
  const mode = getEffectiveDisplayCurrency(ctx);
  const totals: Record<string, number> = {};

  if (mode === 'original') {
    cart.forEach(item => {
      const currency = item.product.currency || 'CUP';
      const price = Number(item.product.price) || 0;
      totals[currency] = (totals[currency] || 0) + price * item.quantity;
    });
    return totals;
  }

  let totalUsd = 0;
  let totalCup = 0;
  cart.forEach(item => {
    const { usd, cup } = resolveUnitPrices(item.product, ctx);
    totalUsd += usd * item.quantity;
    totalCup += cup * item.quantity;
  });

  if (mode === 'usd' || mode === 'both') totals['USD'] = totalUsd;
  if (mode === 'cup' || mode === 'both') totals['CUP'] = totalCup;
  return totals;
};

/** Total del carrito convertido a la moneda del monto mínimo de pedido. */
export const getUnifiedTotal = (
  cart: CartItem[],
  minCurrency: string,
  rates: { usdToCup?: number | null; cupToUsd?: number | null }
): number => {
  const usdToCup = rates.usdToCup || 1.0;
  const cupToUsd = rates.cupToUsd || 1.0;

  return cart.reduce((total, item) => {
    const prodCurrency = item.product.currency || 'CUP';
    const subtotal = (Number(item.product.price) || 0) * item.quantity;
    if (prodCurrency === minCurrency) return total + subtotal;
    if (minCurrency === 'CUP' && prodCurrency === 'USD') return total + subtotal * usdToCup;
    if (minCurrency === 'USD' && prodCurrency === 'CUP') return total + subtotal * cupToUsd;
    return total + subtotal;
  }, 0);
};
