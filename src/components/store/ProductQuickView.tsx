import React, { useEffect } from 'react';
import { Coins, Minus, Plus, Share2, ShoppingBag, X } from 'lucide-react';
import type { PublicProduct } from '../../types/store';
import type { PriceParts } from '../../lib/pricing';
import { PriceTag } from './PriceTag';
import { WhatsAppIcon } from './SocialIcons';

interface ProductQuickViewProps {
  product: PublicProduct | null;
  price: PriceParts | null;
  quantity: number;
  showCommission?: boolean;
  onClose: () => void;
  onAdd: () => void;
  onRemove: () => void;
  onSetQuantity: (qty: number) => void;
  onShare: (e: React.MouseEvent) => void;
  onAskWhatsApp: () => void;
}

/** Modal rápido de detalle de producto (usado en vista embebida o vista rápida). */
export const ProductQuickView: React.FC<ProductQuickViewProps> = ({
  product,
  price,
  quantity,
  showCommission = false,
  onClose,
  onAdd,
  onRemove,
  onSetQuantity,
  onShare,
  onAskWhatsApp,
}) => {
  useEffect(() => {
    if (!product) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [product, onClose]);

  if (!product) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end md:items-center md:justify-center p-0 md:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={product.name}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full md:max-w-lg bg-background border-t md:border border-border rounded-t-3xl md:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh] animate-store-slide-up">
        <div className="w-10 h-1.5 bg-border rounded-full mx-auto my-2.5 md:hidden flex-shrink-0" />

        {/* Acciones flotantes */}
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <button
            type="button"
            onClick={onShare}
            className="w-10 h-10 inline-flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md transition-colors"
            aria-label="Compartir producto"
          >
            <Share2 size={17} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 inline-flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md transition-colors"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          <div className="w-full aspect-square bg-surface relative overflow-hidden flex items-center justify-center">
            {product.imagen_url ? (
              <img src={product.imagen_url} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="text-secondary/60 flex flex-col items-center gap-2 py-12">
                <ShoppingBag size={48} strokeWidth={1.5} />
                <span className="text-xs font-medium text-secondary">Sin imagen</span>
              </div>
            )}
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            <div className="space-y-1.5">
              <h2 className="font-display text-xl sm:text-2xl font-bold text-primary leading-snug">{product.name}</h2>
              <PriceTag
                parts={price}
                className="font-display text-xl sm:text-2xl font-extrabold text-[var(--accent)]"
                secondaryClassName="text-sm font-medium text-secondary"
              />
            </div>

            {showCommission && (product.commission_amount ?? 0) > 0 && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center flex-shrink-0">
                    <Coins size={16} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block">
                      Tu ganancia de promotor
                    </span>
                    <span className="text-xs text-secondary">Comisión por cada venta que logres</span>
                  </div>
                </div>
                <span className="text-sm font-bold text-emerald-500 tabular-nums">
                  +{product.commission_amount} {product.commission_currency || 'CUP'}
                </span>
              </div>
            )}

            {product.description && (
              <div className="pt-1 space-y-1.5">
                <h3 className="text-xs font-semibold text-secondary">Descripción</h3>
                <p className="text-sm text-primary/90 leading-relaxed whitespace-pre-line bg-surface p-4 rounded-2xl border border-border">
                  {product.description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Acciones inferiores */}
        <div className="p-4 sm:p-5 bg-surface border-t border-border flex flex-col sm:flex-row gap-2.5 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {quantity > 0 ? (
            <div className="flex items-center justify-between bg-background px-4 h-12 rounded-full border border-border sm:flex-1">
              <span className="text-sm font-medium text-secondary">En tu pedido</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onRemove}
                  className="w-9 h-9 inline-flex items-center justify-center rounded-full hover:bg-surface-hover text-secondary hover:text-primary"
                  aria-label="Restar unidad"
                >
                  <Minus size={15} />
                </button>
                <input
                  type="number"
                  min="0"
                  aria-label="Cantidad"
                  className="w-12 text-center text-sm font-bold text-primary bg-transparent outline-none focus:ring-1 focus:ring-accent rounded h-8 tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  value={quantity}
                  onChange={e => {
                    const val = parseInt(e.target.value, 10);
                    onSetQuantity(isNaN(val) ? 0 : val);
                  }}
                />
                <button
                  type="button"
                  onClick={onAdd}
                  className="w-9 h-9 inline-flex items-center justify-center rounded-full hover:bg-surface-hover text-secondary hover:text-primary"
                  aria-label="Sumar unidad"
                >
                  <Plus size={15} />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onAdd}
              className="h-12 px-5 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] text-sm font-semibold inline-flex items-center justify-center gap-2 sm:flex-1 transition-colors active:scale-[0.99]"
            >
              <Plus size={17} /> Agregar al pedido
            </button>
          )}

          <button
            type="button"
            onClick={onAskWhatsApp}
            className="h-12 px-5 rounded-full bg-green-600 hover:bg-green-700 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 sm:flex-1 transition-colors active:scale-[0.99]"
          >
            <WhatsAppIcon size={17} /> Consultar por WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
};
