import type { CategorySelection } from '../components/store/CategoryRail';
import type {
  PublicCatalog,
  PublicProduct,
  StoreCategory,
  StoreSortBy,
} from '../types/store';

export const STORE_SESSION_TTL_MS = 2 * 60 * 1000;
export const PRODUCTS_FRESH_TTL_MS = 90 * 1000;

export interface PublicStoreUiState {
  searchQuery: string;
  sortBy: StoreSortBy;
  groupByCategory: boolean;
  collapsedCategories: Record<string, boolean>;
  selectedCategoryId: CategorySelection;
  visibleCount: number;
  scrollY: number;
}

export interface PublicStoreSessionEntry {
  slug: string;
  catalog: PublicCatalog;
  products: PublicProduct[];
  productsComplete: boolean;
  categories: StoreCategory[];
  vendorPhone: string;
  vendorPlan: string;
  isFollowing?: boolean;
  followingUserId?: string | null;
  uiState?: PublicStoreUiState;
  verifiedAt: number;
  productsFetchedAt: number;
  lastProductVisitAt: number;
}

const storeSessionCache = new Map<string, PublicStoreSessionEntry>();

function findEntry(slugOrId?: string | null): PublicStoreSessionEntry | null {
  if (!slugOrId) return null;
  const trimmed = slugOrId.trim();
  if (!trimmed) return null;
  const normalized = trimmed.toLowerCase();

  const direct = storeSessionCache.get(trimmed);
  if (direct) return direct;

  for (const entry of storeSessionCache.values()) {
    if (
      entry.catalog.id === trimmed ||
      entry.slug.toLowerCase() === normalized ||
      (typeof entry.catalog.slug === 'string' &&
        entry.catalog.slug.toLowerCase() === normalized)
    ) {
      return entry;
    }
  }
  return null;
}

function mergeProductLists(
  existing: PublicProduct[],
  incoming: PublicProduct[]
): PublicProduct[] {
  const map = new Map<string, PublicProduct>();
  existing.forEach((p) => {
    if (p?.id) map.set(p.id, p);
  });
  incoming.forEach((p) => {
    if (p?.id) {
      const prev = map.get(p.id);
      map.set(p.id, prev ? { ...prev, ...p } : p);
    }
  });
  return Array.from(map.values());
}

export function getVerifiedStoreSession(
  slugOrId?: string | null
): PublicStoreSessionEntry | null {
  const entry = findEntry(slugOrId);
  if (!entry) return null;

  if (Date.now() - entry.verifiedAt > STORE_SESSION_TTL_MS) {
    return null;
  }

  if (entry.catalog.is_blocked || entry.catalog.is_public === false) {
    return null;
  }

  return entry;
}

export function peekReturnFromProductSession(
  slugOrId?: string | null
): PublicStoreSessionEntry | null {
  const entry = getVerifiedStoreSession(slugOrId);
  if (!entry) return null;

  if (
    entry.lastProductVisitAt <= 0 ||
    Date.now() - entry.lastProductVisitAt > STORE_SESSION_TTL_MS ||
    entry.catalog.is_active === false
  ) {
    return null;
  }

  return entry;
}

export function saveVerifiedStoreSession(
  slug: string,
  update: {
    catalog: PublicCatalog;
    products?: PublicProduct[];
    productsComplete?: boolean;
    categories?: StoreCategory[];
    vendorPhone?: string;
    vendorPlan?: string;
    isFollowing?: boolean;
    followingUserId?: string | null;
  }
): void {
  const catalogId = update.catalog?.id;
  if (!catalogId) return;

  if (update.catalog.is_blocked || update.catalog.is_public === false) {
    for (const [key, entry] of storeSessionCache.entries()) {
      if (
        entry.catalog.id === catalogId ||
        entry.slug.toLowerCase() === slug.trim().toLowerCase()
      ) {
        storeSessionCache.delete(key);
      }
    }
    return;
  }

  const existingBySlug = findEntry(slug);
  const existing =
    storeSessionCache.get(catalogId) ||
    (existingBySlug && existingBySlug.catalog.id === catalogId ? existingBySlug : null);

  const now = Date.now();
  const nextProductsComplete = Boolean(
    update.productsComplete ?? existing?.productsComplete ?? false
  );

  let nextProducts = existing?.products ?? [];
  if (Array.isArray(update.products)) {
    if (update.productsComplete) {
      nextProducts = update.products;
    } else if (existing?.productsComplete) {
      nextProducts = mergeProductLists(existing.products, update.products);
    } else {
      nextProducts = mergeProductLists(existing?.products ?? [], update.products);
    }
  }

  const nextEntry: PublicStoreSessionEntry = {
    slug: slug || update.catalog.slug || existing?.slug || catalogId,
    catalog: { ...(existing?.catalog || {}), ...update.catalog },
    products: nextProducts,
    productsComplete: nextProductsComplete,
    categories: update.categories ?? existing?.categories ?? [],
    vendorPhone: update.vendorPhone ?? existing?.vendorPhone ?? '',
    vendorPlan: update.vendorPlan ?? existing?.vendorPlan ?? 'free',
    isFollowing:
      update.isFollowing !== undefined ? update.isFollowing : existing?.isFollowing,
    followingUserId:
      update.followingUserId !== undefined
        ? update.followingUserId
        : existing?.followingUserId,
    uiState: existing?.uiState,
    verifiedAt: now,
    productsFetchedAt: update.productsComplete
      ? now
      : (existing?.productsFetchedAt ?? 0),
    lastProductVisitAt: existing?.lastProductVisitAt ?? 0,
  };

  storeSessionCache.set(catalogId, nextEntry);
}

export function saveStoreUiSnapshot(
  slug: string,
  uiState: PublicStoreUiState
): void {
  const entry = findEntry(slug);
  if (!entry) return;
  entry.uiState = uiState;
}

export function markProductPageVisited(slug: string): void {
  const entry = findEntry(slug);
  if (!entry) return;
  entry.lastProductVisitAt = Date.now();
}

export function clearProductReturnMarker(slug: string): void {
  const entry = findEntry(slug);
  if (!entry) return;
  entry.lastProductVisitAt = 0;
}

export function updateProductInStoreSession(
  slugOrCatalogId: string,
  productId: string,
  patch: Partial<PublicProduct>
): void {
  const entry = findEntry(slugOrCatalogId);
  if (!entry || !productId) return;

  const idx = entry.products.findIndex((p) => p.id === productId);
  if (idx >= 0) {
    const updated = { ...entry.products[idx], ...patch };
    const nextList = [...entry.products];
    nextList[idx] = updated;
    entry.products = nextList;
  } else if (!entry.productsComplete && patch.id) {
    entry.products = [...entry.products, patch as PublicProduct];
  }
}

export function computeRelatedProductsFromList(
  products: PublicProduct[],
  currentProduct: PublicProduct
): PublicProduct[] {
  return products
    .filter(
      (p) =>
        p.id !== currentProduct.id &&
        !p.is_out_of_stock &&
        p.stock_status !== 'out_of_stock'
    )
    .sort((a, b) => {
      const sameCatA =
        a.category_id && a.category_id === currentProduct.category_id ? 0 : 1;
      const sameCatB =
        b.category_id && b.category_id === currentProduct.category_id ? 0 : 1;
      return sameCatA - sameCatB;
    })
    .slice(0, 4);
}

export function clearPublicStoreSessionCache(): void {
  storeSessionCache.clear();
}
