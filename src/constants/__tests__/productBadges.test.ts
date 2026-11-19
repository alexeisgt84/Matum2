import { describe, it, expect } from 'vitest';
import {
  PRODUCT_BADGES,
  normalizeBadgeId,
  normalizeProductBadges,
  syncBadgesWithFeatured,
  getProductBadgeDefs,
} from '../productBadges';

describe('productBadges constants and helpers', () => {
  it('define las 5 etiquetas comerciales con estilos distintivos', () => {
    expect(PRODUCT_BADGES.map((b) => b.id)).toEqual([
      'on_sale',
      'discount',
      'new',
      'featured',
      'low_stock',
    ]);
    expect(PRODUCT_BADGES.map((b) => b.label)).toEqual([
      'EN OFERTA',
      'EN REBAJA',
      'NUEVO',
      'DESTACADO',
      'ÚLTIMAS UNIDADES',
    ]);

    const badgeClasses = new Set(PRODUCT_BADGES.map((b) => b.badgeClass));
    expect(badgeClasses.size).toBe(5);
    const foldClasses = new Set(PRODUCT_BADGES.map((b) => b.foldClass));
    expect(foldClasses.size).toBe(5);
  });

  it('normaliza identificadores válidos e ignora desconocidos', () => {
    expect(normalizeBadgeId('ON_SALE')).toBe('on_sale');
    expect(normalizeBadgeId(' new ')).toBe('new');
    expect(normalizeBadgeId('unknown')).toBeNull();
  });

  it('deduplica, filtra y ordena etiquetas según el orden canónico', () => {
    expect(
      normalizeProductBadges(['low_stock', 'on_sale', 'invalid', 'new', 'on_sale'])
    ).toEqual(['on_sale', 'new', 'low_stock']);
  });

  it('incluye "featured" como respaldo cuando badges es null/undefined e isFeatured es true', () => {
    expect(normalizeProductBadges(undefined, true)).toEqual(['featured']);
    expect(normalizeProductBadges(null, true)).toEqual(['featured']);
    expect(normalizeProductBadges([], true)).toEqual([]);
  });

  it('sincroniza bidireccionalmente "featured" sin alterar otras etiquetas', () => {
    expect(syncBadgesWithFeatured(['new', 'on_sale'], true)).toEqual([
      'on_sale',
      'new',
      'featured',
    ]);
    expect(syncBadgesWithFeatured(['on_sale', 'featured', 'low_stock'], false)).toEqual([
      'on_sale',
      'low_stock',
    ]);
  });

  it('devuelve las definiciones completas de las etiquetas activas', () => {
    const defs = getProductBadgeDefs(['discount', 'on_sale']);
    expect(defs).toHaveLength(2);
    expect(defs[0].id).toBe('on_sale');
    expect(defs[1].id).toBe('discount');
  });
});
