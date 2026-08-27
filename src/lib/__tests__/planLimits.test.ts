import { describe, it, expect } from 'vitest';
import {
  PLAN_LIMITS,
  getPlanLimits,
  canCreateCatalog,
  canAddProduct,
  canAddGroup,
} from '../planLimits';

describe('planLimits', () => {
  it('debe devolver límites por defecto (free) cuando el plan es desconocido o indefinido', () => {
    expect(getPlanLimits()).toEqual(PLAN_LIMITS.free);
    expect(getPlanLimits('unknown-plan')).toEqual(PLAN_LIMITS.free);
  });

  it('debe devolver los límites correctos para cada tipo de plan', () => {
    expect(getPlanLimits('free')).toEqual({ catalogs: 1, products: 8, groups: 0 });
    expect(getPlanLimits('basic')).toEqual({ catalogs: 2, products: 50, groups: 2 });
    expect(getPlanLimits('pro')).toEqual({ catalogs: 3, products: 200, groups: 3 });
    expect(getPlanLimits('premium')).toEqual({ catalogs: 4, products: 500, groups: 5 });
  });

  describe('canCreateCatalog', () => {
    it('debe permitir crear catálogo solo si no se supera el límite del plan', () => {
      // Plan free (límite 1)
      expect(canCreateCatalog('free', 0)).toBe(true);
      expect(canCreateCatalog('free', 1)).toBe(false);

      // Plan basic (límite 2)
      expect(canCreateCatalog('basic', 1)).toBe(true);
      expect(canCreateCatalog('basic', 2)).toBe(false);
    });
  });

  describe('canAddProduct', () => {
    it('debe validar la cantidad máxima de productos según el plan', () => {
      // Plan free (límite 8)
      expect(canAddProduct('free', 7)).toBe(true);
      expect(canAddProduct('free', 8)).toBe(false);

      // Plan pro (límite 200)
      expect(canAddProduct('pro', 199)).toBe(true);
      expect(canAddProduct('pro', 200)).toBe(false);
    });
  });

  describe('canAddGroup', () => {
    it('debe bloquear grupos en plan free y permitirlos en planes de pago', () => {
      expect(canAddGroup('free', 0)).toBe(false);
      expect(canAddGroup('basic', 0)).toBe(true);
      expect(canAddGroup('basic', 2)).toBe(false);
    });
  });
});
