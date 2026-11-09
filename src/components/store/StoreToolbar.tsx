import React from 'react';
import { ArrowUpDown, Check, Layers, Search, ShoppingBag, X } from 'lucide-react';
import { DropdownMenu } from '../ui/DropdownMenu';
import type { PublicCatalog, StoreSortBy } from '../../types/store';

interface StoreToolbarProps {
  catalog: PublicCatalog;
  /** Muestra la marca compacta (cuando la portada ya no es visible) */
  compact: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  sortBy: StoreSortBy;
  onSortChange: (value: StoreSortBy) => void;
  groupByCategory?: boolean;
  onToggleGroupByCategory?: () => void;
  showGroupToggle?: boolean;
  cartCount: number;
  onOpenCart: () => void;
  children?: React.ReactNode;
}

const SORT_OPTIONS: { value: StoreSortBy; label: string }[] = [
  { value: 'category', label: 'Por categoría' },
  { value: 'default', label: 'Destacados' },
  { value: 'price-asc', label: 'Precio: menor a mayor' },
  { value: 'price-desc', label: 'Precio: mayor a menor' },
];

const iconButton =
  'relative flex-shrink-0 w-8 h-8 inline-flex items-center justify-center rounded-lg bg-surface border border-border text-primary hover:bg-surface-hover transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]';

/** Barra fija con búsqueda, agrupación por categorías, orden, carrito y categorías. */
export const StoreToolbar: React.FC<StoreToolbarProps> = ({
  catalog,
  compact,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  groupByCategory = false,
  onToggleGroupByCategory,
  showGroupToggle = true,
  cartCount,
  onOpenCart,
  children,
}) => {
  return (
    <div
      className={`sticky top-0 z-30 bg-background/90 backdrop-blur-xl transition-[border-color,box-shadow] duration-200 border-b ${
        compact ? 'border-border shadow-[0_6px_18px_-12px_rgba(0,0,0,0.45)]' : 'border-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-3 pt-2 pb-1.5 space-y-1.5">
        <div className="flex items-center gap-1.5">
          {/* Marca compacta */}
          <div
            className={`flex items-center gap-1.5 min-w-0 overflow-hidden transition-all duration-300 ${
              compact ? 'max-w-[36px] sm:max-w-[180px] opacity-100' : 'max-w-0 opacity-0'
            }`}
            aria-hidden={!compact}
          >
            <div className="w-7 h-7 rounded-card overflow-hidden bg-surface border border-border flex-shrink-0">
              {catalog.logo_url ? (
                <img src={catalog.logo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[var(--accent)] text-[var(--accent-text)] flex items-center justify-center font-display font-extrabold text-xs">
                  {catalog.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <span className="hidden sm:block font-display font-bold text-xs text-primary truncate">{catalog.name}</span>
          </div>

          {/* Búsqueda */}
          <label className="relative flex-1 min-w-0">
            <span className="sr-only">Buscar productos</span>
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              placeholder={`Buscar en ${catalog.name}`}
              className="w-full h-8 rounded-lg bg-surface border border-border pl-8 pr-7 text-xs text-primary placeholder:text-secondary outline-none transition-colors focus:border-[var(--accent)] [&::-webkit-search-cancel-button]:appearance-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 inline-flex items-center justify-center rounded-full text-secondary hover:text-primary hover:bg-surface-hover"
                aria-label="Limpiar búsqueda"
              >
                <X size={13} />
              </button>
            )}
          </label>

          {/* Agrupar por categoría */}
          {showGroupToggle && onToggleGroupByCategory && (
            <button
              type="button"
              onClick={onToggleGroupByCategory}
              aria-pressed={groupByCategory}
              aria-label={groupByCategory ? 'Desactivar agrupación por categoría' : 'Agrupar productos por categoría'}
              title={groupByCategory ? 'Desactivar agrupación por categoría' : 'Agrupar productos por categoría'}
              className={`w-8 h-8 inline-flex items-center justify-center rounded-lg border transition-colors active:scale-95 flex-shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)] ${
                groupByCategory
                  ? 'bg-[var(--accent)] text-[var(--accent-text)] border-[var(--accent)]'
                  : 'bg-surface text-secondary border-border hover:text-primary hover:bg-surface-hover'
              }`}
            >
              <Layers size={14} />
            </button>
          )}

          {/* Orden */}
          <DropdownMenu
            trigger={
              <button type="button" className={iconButton} aria-label="Ordenar productos" title="Ordenar">
                <ArrowUpDown size={14} />
              </button>
            }
            items={SORT_OPTIONS.map(opt => ({
              label: opt.label,
              icon: sortBy === opt.value ? Check : undefined,
              onClick: () => onSortChange(opt.value),
            }))}
          />

          {/* Carrito */}
          <button
            type="button"
            onClick={onOpenCart}
            className={iconButton}
            aria-label={`Ver pedido (${cartCount} ${cartCount === 1 ? 'artículo' : 'artículos'})`}
          >
            <ShoppingBag size={14} />
            {cartCount > 0 && (
              <span
                key={cartCount}
                className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[var(--accent)] text-[var(--accent-text)] text-[10px] font-bold leading-4 text-center ring-1 ring-background animate-store-pop"
              >
                {cartCount}
              </span>
            )}
          </button>
        </div>

        {children}
      </div>
    </div>
  );
};
