export type ProductBadgeId = 'on_sale' | 'discount' | 'new' | 'featured' | 'low_stock';

export interface ProductBadgeDefinition {
  id: ProductBadgeId;
  label: string;
  description: string;
  badgeClass: string;
  foldClass: string;
  dotClass: string;
  inlineClass: string;
  chipActiveClass: string;
}

export const PRODUCT_BADGES: readonly ProductBadgeDefinition[] = [
  {
    id: 'on_sale',
    label: 'EN OFERTA',
    description: 'Para productos que forman parte de una promoción especial.',
    badgeClass: 'bg-gradient-to-r from-red-600 to-orange-500 text-white border-red-300/40',
    foldClass: 'border-t-red-950',
    dotClass: 'bg-gradient-to-r from-red-600 to-orange-500',
    inlineClass: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
    chipActiveClass: 'bg-gradient-to-r from-red-600/20 to-orange-500/20 border-red-500/50 text-red-500 dark:text-red-400',
  },
  {
    id: 'discount',
    label: 'EN REBAJA',
    description: 'Para productos cuyo precio ha sido reducido.',
    badgeClass: 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white border-emerald-300/40',
    foldClass: 'border-t-emerald-950',
    dotClass: 'bg-gradient-to-r from-emerald-600 to-teal-500',
    inlineClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    chipActiveClass: 'bg-gradient-to-r from-emerald-600/20 to-teal-500/20 border-emerald-500/50 text-emerald-600 dark:text-emerald-400',
  },
  {
    id: 'new',
    label: 'NUEVO',
    description: 'Para productos recién incorporados al catálogo.',
    badgeClass: 'bg-gradient-to-r from-blue-600 to-indigo-500 text-white border-blue-300/40',
    foldClass: 'border-t-blue-950',
    dotClass: 'bg-gradient-to-r from-blue-600 to-indigo-500',
    inlineClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
    chipActiveClass: 'bg-gradient-to-r from-blue-600/20 to-indigo-500/20 border-blue-500/50 text-blue-600 dark:text-blue-400',
  },
  {
    id: 'featured',
    label: 'DESTACADO',
    description: 'Para productos que deseas resaltar en el catálogo.',
    badgeClass: 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 border-amber-200/70',
    foldClass: 'border-t-amber-900',
    dotClass: 'bg-gradient-to-r from-amber-500 to-yellow-400',
    inlineClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    chipActiveClass: 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border-amber-500/50 text-amber-600 dark:text-amber-400',
  },
  {
    id: 'low_stock',
    label: 'ÚLTIMAS UNIDADES',
    description: 'Para productos con pocas existencias disponibles.',
    badgeClass: 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white border-purple-300/40',
    foldClass: 'border-t-purple-950',
    dotClass: 'bg-gradient-to-r from-purple-600 to-fuchsia-600',
    inlineClass: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
    chipActiveClass: 'bg-gradient-to-r from-purple-600/20 to-fuchsia-600/20 border-purple-500/50 text-purple-600 dark:text-purple-400',
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
 * Normaliza, deduplica y ordena las etiquetas de un producto según el orden canónico.
 * Si `badges` es `undefined` o `null` y `isFeatured` es `true`, incluye `'featured'`
 * para mantener compatibilidad con productos heredados o en caché previa.
 */
export function normalizeProductBadges(
  badges?: string[] | null,
  isFeatured?: boolean
): ProductBadgeId[] {
  const activeSet = new Set<ProductBadgeId>();

  if (Array.isArray(badges)) {
    for (const item of badges) {
      const normalized = normalizeBadgeId(item);
      if (normalized) {
        activeSet.add(normalized);
      }
    }
  } else if (isFeatured) {
    activeSet.add('featured');
  }

  return PRODUCT_BADGES.filter((def) => activeSet.has(def.id)).map((def) => def.id);
}

/**
 * Sincroniza un arreglo de etiquetas con el indicador booleano `is_featured`.
 */
export function syncBadgesWithFeatured(
  badges: string[] | null | undefined,
  isFeatured: boolean
): ProductBadgeId[] {
  const activeSet = new Set<ProductBadgeId>(normalizeProductBadges(badges));
  if (isFeatured) {
    activeSet.add('featured');
  } else {
    activeSet.delete('featured');
  }
  return PRODUCT_BADGES.filter((def) => activeSet.has(def.id)).map((def) => def.id);
}

/**
 * Obtiene las definiciones visuales completas de las etiquetas activas de un producto.
 */
export function getProductBadgeDefs(
  badges?: string[] | null,
  isFeatured?: boolean
): ProductBadgeDefinition[] {
  return normalizeProductBadges(badges, isFeatured)
    .map((id) => BADGE_DEF_MAP.get(id))
    .filter((def): def is ProductBadgeDefinition => Boolean(def));
}
