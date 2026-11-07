import React from 'react';
import { ArrowUpDown, Check, Search, ShoppingBag, X } from 'lucide-react';
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
  'relative flex-shrink-0 w-11 h-11 inline-flex items-center justify-center rounded-full bg-surface border border-border text-primary hover:bg-surface-hover transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]';

/** Barra fija con búsqueda, orden, carrito y categorías. */
export const StoreToolbar: React.FC<StoreToolbarProps> = ({
  catalog,
  compact,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  cartCount,
  onOpenCart,
  children,
}) => {
  return (
    <div
      className={`sticky top-0 z-30 bg-background/90 backdrop-blur-xl transition-[border-color,box-shadow] duration-200 border-b ${
        compact ? 'border-border shadow-[0_8px_24px_-16px_rgba(0,0,0,0.45)]' : 'border-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 pt-3 pb-2 space-y-2">
        <div className="flex items-center gap-2">
          {/* Marca compacta */}
          <div
            className={`flex items-center gap-2 min-w-0 overflow-hidden transition-all duration-300 ${
              compact ? 'max-w-[44px] sm:max-w-[220px] opacity-100' : 'max-w-0 opacity-0'
            }`}
            aria-hidden={!compact}
          >
            <div className="w-9 h-9 rounded-xl overflow-hidden bg-surface border border-border flex-shrink-0">
              {catalog.logo_url ? (
                <img src={catalog.logo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[var(--accent)] text-[var(--accent-text)] flex items-center justify-center font-display font-extrabold text-sm">
                  {catalog.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <span className="hidden sm:block font-display font-bold text-sm text-primary truncate">{catalog.name}</span>
          </div>

          {/* Búsqueda */}
          <label className="relative flex-1 min-w-0">
            <span className="sr-only">Buscar productos</span>
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              placeholder={`Buscar en ${catalog.name}`}
              className="w-full h-11 rounded-full bg-surface border border-border pl-10 pr-10 text-sm text-primary placeholder:text-secondary outline-none transition-colors focus:border-[var(--accent)] [&::-webkit-search-cancel-button]:appearance-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 inline-flex items-center justify-center rounded-full text-secondary hover:text-primary hover:bg-surface-hover"
                aria-label="Limpiar búsqueda"
              >
                <X size={15} />
              </button>
            )}
          </label>

          {/* Orden */}
          <DropdownMenu
            trigger={
              <button type="button" className={iconButton} aria-label="Ordenar productos" title="Ordenar">
                <ArrowUpDown size={17} />
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
            <ShoppingBag size={18} />
            {cartCount > 0 && (
              <span
                key={cartCount}
                className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-[var(--accent)] text-[var(--accent-text)] text-[11px] font-bold leading-5 text-center ring-2 ring-background animate-store-pop"
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
