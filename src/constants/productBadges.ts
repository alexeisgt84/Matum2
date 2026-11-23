export type ProductBadgeId = 'on_sale' | 'discount' | 'new' | 'low_stock';

export interface ProductBadgeDefinition {
  id: ProductBadgeId;
  label: string;
  description: string;
  badgeClass: string;
  foldTopClass: string;
  dotClass: string;
  inlineClass: string;
  chipActiveClass: string;
}

export const PRODUCT_BADGES: readonly ProductBadgeDefinition[] = [
  {
    id: 'on_sale',
    label: 'EN OFERTA',
    description: 'Para productos que forman parte de una promoción especial.',
    badgeClass: 'bg-red-600 text-white border-red-700/40',
    foldTopClass: 'border-b-red-900',
    dotClass: 'bg-red-600',
    inlineClass: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
    chipActiveClass: 'bg-red-500/15 border-red-500/50 text-red-600 dark:text-red-400',
  },
  {
    id: 'discount',
    label: 'DESCUENTO',
    description: 'Para productos cuyo precio ha sido reducido.',
    badgeClass: 'bg-emerald-700 text-white border-emerald-800/40',
    foldTopClass: 'border-b-emerald-950',
    dotClass: 'bg-emerald-700',
    inlineClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    chipActiveClass: 'bg-emerald-500/15 border-emerald-500/50 text-emerald-700 dark:text-emerald-400',
  },
  {
    id: 'new',
    label: 'NUEVO',
    description: 'Para productos recién incorporados al catálogo.',
    badgeClass: 'bg-slate-800 text-white border-slate-900/40',
    foldTopClass: 'border-b-slate-950',
    dotClass: 'bg-slate-700',
    inlineClass: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30',
    chipActiveClass: 'bg-slate-500/15 border-slate-500/50 text-slate-700 dark:text-slate-200',
  },
  {
    id: 'low_stock',
    label: 'ÚLTIMAS UNIDADES',
    description: 'Para productos con pocas existencias disponibles.',
    badgeClass: 'bg-amber-600 text-white border-amber-700/40',
    foldTopClass: 'border-b-amber-900',
    dotClass: 'bg-amber-600',
    inlineClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
    chipActiveClass: 'bg-amber-500/15 border-amber-500/50 text-amber-700 dark:text-amber-400',
  },
] as const;

const VALID_BADGE_IDS = new Set<ProductBadgeId>(PRODUCT_BADGES.map((b) => b.id));
const BADGE_DEF_MAP = new Map<ProductBadgeId, ProductBadgeDefinition>(
  PRODUCT_BADGES.map((b) => [b.id, b])
);

/**
 * Normaliza un identificador de etiqueta a uno de los valores soportados.
 */
export function normalizeBadgeId(raw: string): ProductBadgeId | null {
  if (typeof raw !== 'string') return null;
  const cleaned = raw.trim().toLowerCase() as ProductBadgeId;
  return VALID_BADGE_IDS.has(cleaned) ? cleaned : null;
}

/**
 * Normaliza y garantiza que cada producto tenga como máximo una etiqueta comercial visible.
 */
export function normalizeProductBadges(badges?: string[] | null): ProductBadgeId[] {
  if (!Array.isArray(badges)) return [];

  for (const item of badges) {
    const normalized = normalizeBadgeId(item);
    if (normalized) {
      return [normalized];
    }
  }

  return [];
}

/**
 * Obtiene la definición visual de la etiqueta activa del producto (máximo 1).
 */
export function getProductBadgeDefs(badges?: string[] | null): ProductBadgeDefinition[] {
  return normalizeProductBadges(badges)
    .map((id) => BADGE_DEF_MAP.get(id))
    .filter((def): def is ProductBadgeDefinition => Boolean(def));
}
