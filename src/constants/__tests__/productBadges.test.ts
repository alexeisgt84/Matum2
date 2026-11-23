import { describe, it, expect } from 'vitest';
import {
  PRODUCT_BADGES,
  normalizeBadgeId,
  normalizeProductBadges,
  getProductBadgeDefs,
} from '../productBadges';

describe('productBadges constants and helpers', () => {
  it('define las 4 etiquetas comerciales con estilos distintivos y sin "featured"', () => {
    expect(PRODUCT_BADGES.map((b) => b.id)).toEqual([
      'on_sale',
      'discount',
      'new',
      'low_stock',
    ]);
    expect(PRODUCT_BADGES.map((b) => b.label)).toEqual([
      'EN OFERTA',
      'DESCUENTO',
      'NUEVO',
      'ÚLTIMAS UNIDADES',
    ]);

    const badgeClasses = new Set(PRODUCT_BADGES.map((b) => b.badgeClass));
    expect(badgeClasses.size).toBe(4);
    const foldTopClasses = new Set(PRODUCT_BADGES.map((b) => b.foldTopClass));
    expect(foldTopClasses.size).toBe(4);
  });

  it('normaliza identificadores válidos e ignora desconocidos o "featured"', () => {
    expect(normalizeBadgeId('ON_SALE')).toBe('on_sale');
    expect(normalizeBadgeId(' new ')).toBe('new');
    expect(normalizeBadgeId('featured')).toBeNull();
    expect(normalizeBadgeId('unknown')).toBeNull();
  });

  it('garantiza máximo una etiqueta por tarjeta/producto', () => {
    expect(normalizeProductBadges(['low_stock', 'on_sale', 'new'])).toEqual(['low_stock']);
    expect(normalizeProductBadges(['featured', 'discount'])).toEqual(['discount']);
    expect(normalizeProductBadges(['featured'])).toEqual([]);
    expect(normalizeProductBadges(null)).toEqual([]);
  });

  it('devuelve como máximo una definición visual activa', () => {
    const defs = getProductBadgeDefs(['discount', 'on_sale']);
    expect(defs).toHaveLength(1);
    expect(defs[0].id).toBe('discount');
  });
});
