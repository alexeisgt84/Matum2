import React from 'react';
import { Coins, Minus, Plus, Share2, ShoppingBag } from 'lucide-react';
import type { PublicProduct } from '../../types/store';
import type { PriceParts } from '../../lib/pricing';
import { PriceTag } from './PriceTag';

interface ProductCardProps {
  product: PublicProduct;
  quantity: number;
  price: PriceParts | null;
  showCommission?: boolean;
  /** Carga la imagen con prioridad (primeras filas visibles) */
  priority?: boolean;
  onOpen: () => void;
  onAdd: () => void;
  onRemove: () => void;
  onShare: (e: React.MouseEvent) => void;
}

/** Tarjeta vertical de producto con la imagen como protagonista y radio de 10px (rounded-card). */
export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  quantity,
  price,
  showCommission = false,
  priority = false,
  onOpen,
  onAdd,
  onRemove,
  onShare,
}) => {
  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={e => {
        if (e.key === 'Enter') onOpen();
      }}
      aria-label={product.name}
      className="group relative flex flex-col cursor-pointer animate-store-fade-up focus-visible:outline-none rounded-card bg-surface/40 border border-border/70 hover:border-[var(--accent)]/40 p-1.5 transition-colors"
    >
      {/* Imagen */}
      <div className="relative aspect-square overflow-hidden rounded-card bg-surface border border-border group-focus-visible:ring-1 group-focus-visible:ring-[var(--accent)]">
        {product.imagen_url ? (
          <img
            src={product.imagen_url}
            alt={product.name}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-secondary/60">
            <ShoppingBag size={24} strokeWidth={1.5} />
          </div>
        )}

        {/* Compartir (escritorio, al pasar el cursor) */}
        <button
          type="button"
          onClick={onShare}
          className="hidden sm:inline-flex absolute top-1.5 right-1.5 w-7 h-7 items-center justify-center rounded-full bg-black/55 hover:bg-black/75 backdrop-blur-md text-white opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
          aria-label={`Compartir ${product.name}`}
        >
          <Share2 size={13} />
        </button>

        {/* Agregar / cantidad */}
        <div className="absolute bottom-1.5 right-1.5" onClick={e => e.stopPropagation()}>
          {quantity > 0 ? (
            <div className="flex items-center h-7 rounded-full bg-surface/95 backdrop-blur-md border border-border shadow-md text-primary animate-store-fade-up">
              <button
                type="button"
                onClick={stop(onRemove)}
                className="w-7 h-7 inline-flex items-center justify-center rounded-full hover:bg-surface-hover active:scale-90 transition-transform"
                aria-label={`Quitar una unidad de ${product.name}`}
              >
                <Minus size={12} />
              </button>
              <span className="min-w-[1.1rem] text-center text-xs font-bold tabular-nums px-0.5" aria-live="polite">
                {quantity}
              </span>
              <button
                type="button"
                onClick={stop(onAdd)}
                className="w-7 h-7 inline-flex items-center justify-center rounded-full hover:bg-surface-hover active:scale-90 transition-transform"
                aria-label={`Añadir una unidad de ${product.name}`}
              >
                <Plus size={12} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={stop(onAdd)}
              className="w-7 h-7 inline-flex items-center justify-center rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] shadow-md active:scale-90 transition-all"
              aria-label={`Agregar ${product.name} al pedido`}
            >
              <Plus size={14} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      {/* Información */}
      <div className="pt-1.5 px-0.5 flex flex-col gap-0.5">
        <h3 className="text-xs font-medium text-primary leading-snug line-clamp-2">
          {product.name}
        </h3>
        <PriceTag
          parts={price}
          stacked
          className="text-xs sm:text-sm font-bold text-primary tracking-tight"
          secondaryClassName="text-[10px] font-medium text-secondary"
        />
        {showCommission && (product.commission_amount ?? 0) > 0 && (
          <span className="mt-0.5 inline-flex items-center gap-1 w-fit px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">
            <Coins size={10} />
            +{product.commission_amount} {product.commission_currency || 'CUP'}
          </span>
        )}
      </div>
    </article>
  );
};

/** Esqueleto de carga de la cuadrícula de productos. */
export const ProductGridSkeleton: React.FC<{ count?: number }> = ({ count = 8 }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3.5" aria-hidden="true">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex flex-col gap-1.5 rounded-card bg-surface/40 border border-border/70 p-1.5">
        <div className="aspect-square rounded-card bg-surface border border-border animate-pulse" />
        <div className="h-3 w-4/5 rounded-md bg-surface animate-pulse" />
        <div className="h-3.5 w-2/5 rounded-md bg-surface animate-pulse" />
      </div>
    ))}
  </div>
);
