import React, { useEffect } from 'react';
import { Check, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import type { CartItem } from '../../types/store';
import type { PriceParts } from '../../lib/pricing';
import { formatAmount } from '../../lib/pricing';
import { PriceTag } from './PriceTag';
import { WhatsAppIcon } from './SocialIcons';

export interface MinOrderState {
  amount: number;
  currency: string;
  current: number;
  missing: number;
  met: boolean;
}

const formatTotals = (totals: Record<string, number>) =>
  Object.entries(totals)
    .map(([curr, val]) => `${formatAmount(val)} ${curr}`)
    .join(' · ');

/* ------------------------------------------------------------------ */
/* Botón flotante del carrito                                          */
/* ------------------------------------------------------------------ */

interface CartFabProps {
  count: number;
  totals: Record<string, number>;
  onOpen: () => void;
  bottomOffsetClass?: string;
}

export const CartFab: React.FC<CartFabProps> = ({ count, totals, onOpen, bottomOffsetClass = 'bottom-4' }) => {
  if (count <= 0) return null;

  return (
    <div className={`fixed ${bottomOffsetClass} inset-x-0 z-40 px-4 pointer-events-none pb-[env(safe-area-inset-bottom)]`}>
      <button
        type="button"
        onClick={onOpen}
        className="pointer-events-auto mx-auto w-full max-w-md h-14 pl-2 pr-5 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)] flex items-center gap-3 transition-colors active:scale-[0.99] animate-store-slide-up"
      >
        <span className="relative w-10 h-10 rounded-full bg-black/15 inline-flex items-center justify-center flex-shrink-0">
          <ShoppingBag size={18} />
          <span
            key={count}
            className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-[var(--background)] text-[var(--text-primary)] text-[11px] font-bold leading-5 text-center animate-store-pop"
          >
            {count}
          </span>
        </span>
        <span className="text-sm font-semibold">Ver pedido</span>
        <span className="ml-auto text-sm font-bold tabular-nums truncate">{formatTotals(totals)}</span>
      </button>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Panel del carrito (bottom sheet en móvil, lateral en escritorio)    */
/* ------------------------------------------------------------------ */

interface CartSheetProps {
  open: boolean;
  onClose: () => void;
  cart: CartItem[];
  getUnitPrice: (item: CartItem) => PriceParts | null;
  getSubtotal: (item: CartItem) => PriceParts | null;
  totals: Record<string, number>;
  minOrder: MinOrderState | null;
  onAdd: (item: CartItem) => void;
  onRemove: (item: CartItem) => void;
  onClear: () => void;
  onCheckout: () => void;
}

export const CartSheet: React.FC<CartSheetProps> = ({
  open,
  onClose,
  cart,
  getUnitPrice,
  getSubtotal,
  totals,
  minOrder,
  onAdd,
  onRemove,
  onClear,
  onCheckout,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const itemCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const canCheckout = cart.length > 0 && (!minOrder || minOrder.met);
  const progress = minOrder && minOrder.amount > 0 ? Math.min(1, minOrder.current / minOrder.amount) : 1;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Tu pedido">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="absolute inset-x-0 bottom-0 md:inset-y-0 md:left-auto md:right-0 md:w-[420px] max-h-[88vh] md:max-h-none flex flex-col bg-background border-t md:border-t-0 md:border-l border-border rounded-t-3xl md:rounded-none shadow-2xl animate-store-slide-up">
        <div className="w-10 h-1.5 bg-border rounded-full mx-auto mt-2.5 md:hidden flex-shrink-0" />

        {/* Encabezado */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-border">
          <div>
            <h2 className="font-display text-lg font-bold text-primary">Tu pedido</h2>
            <p className="text-xs text-secondary">
              {itemCount} {itemCount === 1 ? 'artículo' : 'artículos'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 inline-flex items-center justify-center rounded-full hover:bg-surface text-secondary hover:text-primary"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Progreso hacia el pedido mínimo */}
        {minOrder && minOrder.amount > 0 && cart.length > 0 && (
          <div className="px-5 py-3 border-b border-border bg-surface/50">
            <p className="text-xs text-secondary mb-2">
              {minOrder.met ? (
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                  <Check size={14} /> Pedido mínimo alcanzado
                </span>
              ) : (
                <>
                  Te faltan{' '}
                  <b className="text-primary">
                    {formatAmount(minOrder.missing)} {minOrder.currency}
                  </b>{' '}
                  para el pedido mínimo ({formatAmount(minOrder.amount)} {minOrder.currency})
                </>
              )}
            </p>
            <div className="h-1.5 rounded-full bg-border overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${minOrder.met ? 'bg-emerald-500' : 'bg-[var(--accent)]'}`}
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Artículos */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {cart.length === 0 ? (
            <div className="py-16 text-center text-secondary">
              <ShoppingBag size={40} strokeWidth={1.5} className="mx-auto mb-3 opacity-60" />
              <p className="text-sm">Tu pedido está vacío</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product.id} className="flex gap-3">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-surface border border-border flex-shrink-0">
                  {item.product.imagen_url ? (
                    <img src={item.product.imagen_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-secondary">
                      <ShoppingBag size={18} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between gap-1.5">
                  <div>
                    <h4 className="text-sm font-medium text-primary leading-snug line-clamp-2">{item.product.name}</h4>
                    <PriceTag
                      parts={getUnitPrice(item)}
                      className="text-xs text-secondary"
                      secondaryClassName="text-[11px] text-secondary/80"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <PriceTag
                      parts={getSubtotal(item)}
                      className="text-sm font-bold text-primary"
                      secondaryClassName="text-[11px] text-secondary"
                    />
                    <div className="flex items-center h-8 rounded-full border border-border bg-surface">
                      <button
                        type="button"
                        onClick={() => onRemove(item)}
                        className="w-8 h-8 inline-flex items-center justify-center rounded-full text-secondary hover:text-primary"
                        aria-label={`Quitar una unidad de ${item.product.name}`}
                      >
                        <Minus size={13} />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold text-primary tabular-nums">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => onAdd(item)}
                        className="w-8 h-8 inline-flex items-center justify-center rounded-full text-secondary hover:text-primary"
                        aria-label={`Añadir una unidad de ${item.product.name}`}
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totales y acción */}
        {cart.length > 0 && (
          <div className="px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-border bg-surface/60 space-y-3">
            <div className="space-y-1">
              {Object.entries(totals).map(([curr, val]) => (
                <div key={curr} className="flex items-baseline justify-between">
                  <span className="text-sm text-secondary">Total {Object.keys(totals).length > 1 ? `en ${curr}` : ''}</span>
                  <span className="font-display text-xl font-bold text-primary tabular-nums">
                    {formatAmount(val)} {curr}
                  </span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={onCheckout}
              disabled={!canCheckout}
              className="w-full h-12 rounded-full bg-green-600 hover:bg-green-700 disabled:bg-surface-hover disabled:text-secondary disabled:cursor-not-allowed text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors active:scale-[0.99]"
            >
              <WhatsAppIcon size={18} />
              Continuar pedido por WhatsApp
            </button>
            <button
              type="button"
              onClick={onClear}
              className="w-full h-9 inline-flex items-center justify-center gap-1.5 text-xs font-medium text-secondary hover:text-red-500 transition-colors"
            >
              <Trash2 size={13} /> Vaciar pedido
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
