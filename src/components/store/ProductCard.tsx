import React from 'react';
import { Coins, Minus, Plus, Share2, ShoppingBag, MessageCircle, Edit2, Ban, CheckCircle2, Truck, Star } from 'lucide-react';
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
  isMarketplace?: boolean;
  isOwner?: boolean;
  onOpen: () => void;
  onAdd: () => void;
  onRemove: () => void;
  onShare: (e: React.MouseEvent) => void;
  onToggleStock?: () => void;
  onEditMarketplace?: () => void;
  onContactWhatsApp?: () => void;
}

/** Tarjeta vertical de producto con la imagen como protagonista y radio de 10px (rounded-card). */
export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  quantity,
  price,
  showCommission = false,
  priority = false,
  isMarketplace = false,
  isOwner = false,
  onOpen,
  onAdd,
  onRemove,
  onShare,
  onToggleStock,
  onEditMarketplace,
  onContactWhatsApp,
}) => {
  const stop = (fn?: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (fn) fn();
  };

  const isOutOfStock = Boolean(product.is_out_of_stock || product.stock_status === 'out_of_stock');

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

        {/* Badges superiores: Tu publicación, Destacado o Agotado */}
        {isMarketplace && isOwner ? (
          <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent text-accent-text text-[9px] font-bold shadow-md z-10">
            Tu producto
          </span>
        ) : product.is_featured && !isOutOfStock ? (
          <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-black text-[9px] font-black uppercase tracking-wider shadow-md z-10">
            <Star size={10} className="fill-black" />
            Destacado
          </span>
        ) : null}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-10 pointer-events-none">
            <span className="px-2.5 py-1 rounded-md bg-red-600/90 text-white text-[10px] font-bold uppercase tracking-wider shadow-md">
              Agotado
            </span>
          </div>
        )}

        {/* Compartir (escritorio, al pasar el cursor) */}
        <button
          type="button"
          onClick={onShare}
          className="hidden sm:inline-flex absolute top-1.5 right-1.5 w-7 h-7 items-center justify-center rounded-full bg-black/55 hover:bg-black/75 backdrop-blur-md text-white opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity z-10"
          aria-label={`Compartir ${product.name}`}
        >
          <Share2 size={13} />
        </button>

        {/* Agregar / cantidad o acciones de Marketplace */}
        <div className="absolute bottom-1.5 right-1.5 z-20" onClick={e => e.stopPropagation()}>
          {isMarketplace ? (
            isOwner ? (
              <div className="flex items-center gap-1 bg-surface/95 backdrop-blur-md p-0.5 rounded-full border border-border shadow-md">
                <button
                  type="button"
                  onClick={stop(onToggleStock)}
                  title={isOutOfStock ? 'Marcar como disponible' : 'Marcar como agotado'}
                  className={`w-7 h-7 inline-flex items-center justify-center rounded-full transition-all active:scale-90 ${
                    isOutOfStock
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-amber-600/80 text-white hover:bg-amber-700'
                  }`}
                  aria-label={isOutOfStock ? 'Marcar disponible' : 'Marcar agotado'}
                >
                  {isOutOfStock ? <CheckCircle2 size={13} /> : <Ban size={13} />}
                </button>
                <button
                  type="button"
                  onClick={stop(onEditMarketplace)}
                  title="Editar producto"
                  className="w-7 h-7 inline-flex items-center justify-center rounded-full bg-accent text-accent-text hover:bg-accent-hover transition-all active:scale-90"
                  aria-label={`Editar ${product.name}`}
                >
                  <Edit2 size={12} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={stop(onContactWhatsApp || onOpen)}
                className="h-7 px-2.5 inline-flex items-center gap-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold shadow-md active:scale-90 transition-all"
                aria-label={`Contactar por ${product.name}`}
              >
                <MessageCircle size={12} />
                <span>Contactar</span>
              </button>
            )
          ) : quantity > 0 ? (
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
        {product.delivery_cost !== null && product.delivery_cost !== undefined && (
          <span className="inline-flex items-center gap-1 text-[10px] text-secondary">
            <Truck size={10} className="text-accent" />
            {Number(product.delivery_cost) === 0 ? 'Envío gratis' : `Envío: ${product.delivery_cost} ${product.delivery_currency || 'CUP'}`}
          </span>
        )}
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
