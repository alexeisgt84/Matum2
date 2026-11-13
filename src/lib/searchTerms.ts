/**
 * Utilidades para búsquedas combinadas con el signo "+".
 * Ej: "camisa+pantalón" devuelve productos que coincidan con "camisa" O con "pantalón".
 */

/** Divide la búsqueda por "+" y devuelve los términos limpios (minúsculas, sin vacíos). */
export function splitSearchTerms(search?: string | null): string[] {
  if (!search) return [];
  return search
    .split('+')
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0);
}

/** Indica si un producto coincide con alguno de los términos de búsqueda (unión). */
export function matchesSearchTerms(
  product: { name?: string | null; description?: string | null; price?: number | string | null },
  search?: string | null,
  options: { matchPrice?: boolean } = {}
): boolean {
  const terms = splitSearchTerms(search);
  if (terms.length === 0) return true;

  const name = product.name?.toLowerCase() || '';
  const desc = product.description?.toLowerCase() || '';

  return terms.some((term) => {
    if (name.includes(term) || desc.includes(term)) return true;
    if (options.matchPrice) {
      const num = Number(term);
      if (!isNaN(num) && product.price !== null && product.price !== undefined && Number(product.price) === num) {
        return true;
      }
    }
    return false;
  });
}

/** Escapa un valor para usarlo entre comillas dentro de un filtro `or()` de PostgREST. */
function quotePostgrestValue(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/**
 * Construye el filtro para `query.or(...)` de Supabase con todos los términos.
 * Devuelve null si no hay términos.
 */
export function buildSupabaseSearchFilter(search?: string | null): string | null {
  const terms = splitSearchTerms(search);
  if (terms.length === 0) return null;

  const conditions: string[] = [];
  for (const term of terms) {
    const pattern = quotePostgrestValue(`%${term}%`);
    conditions.push(`name.ilike.${pattern}`, `description.ilike.${pattern}`);
    const num = Number(term);
    if (!isNaN(num)) {
      conditions.push(`price.eq.${num}`);
    }
  }
  return conditions.join(',');
}
