import React, { useEffect, useState, useRef } from 'react';
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

export const CartFab: React.FC<CartFabProps> = ({ count, totals, onOpen, bottomOffsetClass = 'bottom-3' }) => {
  if (count <= 0) return null;

  return (
    <div className={`fixed ${bottomOffsetClass} inset-x-0 z-40 px-3 pointer-events-none pb-[env(safe-area-inset-bottom)]`}>
      <button
        type="button"
        onClick={onOpen}
        className="pointer-events-auto mx-auto w-full max-w-sm h-10 pl-1.5 pr-3.5 rounded-none bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] shadow-[0_8px_24px_-6px_rgba(0,0,0,0.5)] flex items-center gap-2.5 transition-colors active:scale-[0.99] animate-store-slide-up"
      >
        <span className="relative w-7 h-7 rounded-none bg-black/15 inline-flex items-center justify-center flex-shrink-0">
          <ShoppingBag size={14} />
          <span
            key={count}
            className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-none bg-[var(--background)] text-[var(--text-primary)] text-[10px] font-bold leading-4 text-center animate-store-pop"
          >
            {count}
          </span>
        </span>
        <span className="text-xs font-semibold">Ver pedido</span>
        <span className="ml-auto text-xs font-bold tabular-nums truncate">{formatTotals(totals)}</span>
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
  const panelRef = useRef<HTMLDivElement>(null);
  const [drawerWidth, setDrawerWidth] = useState<number>(() => {
    try {
      const saved = Number(localStorage.getItem('matum_cart_drawer_width'));
      return saved >= 280 && saved <= 760 ? saved : 380;
    } catch {
      return 380;
    }
  });
  const [mobileHeight, setMobileHeight] = useState<number | undefined>(undefined);
  const resizeRef = useRef<{
    mode: 'width' | 'height';
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);

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

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const st = resizeRef.current;
      if (!st) return;
      if (st.mode === 'width') {
        const dx = st.startX - e.clientX;
        const nextW = Math.max(280, Math.min(window.innerWidth - 32, st.startW + dx));
        setDrawerWidth(nextW);
        try {
          localStorage.setItem('matum_cart_drawer_width', String(Math.round(nextW)));
        } catch {
          // ignore
        }
      } else {
        const dy = st.startY - e.clientY;
        const nextH = Math.max(240, Math.min(window.innerHeight - 16, st.startH + dy));
        setMobileHeight(nextH);
      }
    };

    const onUp = () => {
      resizeRef.current = null;
      document.body.style.userSelect = '';
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  const startResize = (mode: 'width' | 'height') => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const el = panelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    resizeRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      startW: rect.width,
      startH: rect.height,
    };
    document.body.style.userSelect = 'none';
  };

  if (!open) return null;

  const itemCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const canCheckout = cart.length > 0 && (!minOrder || minOrder.met);
  const progress = minOrder && minOrder.amount > 0 ? Math.min(1, minOrder.current / minOrder.amount) : 1;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Tu pedido">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={onClose} />

      <div
        ref={panelRef}
        style={{
          width: typeof window !== 'undefined' && window.innerWidth >= 768 ? `${drawerWidth}px` : undefined,
          height: typeof window !== 'undefined' && window.innerWidth < 768 && mobileHeight ? `${mobileHeight}px` : undefined,
        }}
        className="absolute inset-x-0 bottom-0 md:inset-y-0 md:left-auto md:right-0 max-h-[88vh] md:max-h-none flex flex-col bg-background border-t md:border-t-0 md:border-l border-border rounded-none shadow-2xl animate-store-slide-up"
      >
        {/* Tirador izquierdo en escritorio para redimensionar ancho */}
        <div
          onPointerDown={startResize('width')}
          className="hidden md:block absolute left-0 inset-y-0 w-1.5 cursor-ew-resize hover:bg-[var(--accent)]/50 z-20 transition-colors"
          title="Arrastrar para ajustar ancho"
        />

        {/* Tirador superior en móvil para redimensionar altura */}
        <div
          onPointerDown={startResize('height')}
          className="w-10 h-1 bg-border rounded-none mx-auto mt-2 md:hidden flex-shrink-0 cursor-ns-resize"
        />

        {/* Encabezado */}
        <div className="px-3.5 py-2.5 flex items-center justify-between border-b border-border">
          <div>
            <h2 className="font-display text-sm font-bold text-primary">Tu pedido</h2>
            <p className="text-[11px] text-secondary">
              {itemCount} {itemCount === 1 ? 'artículo' : 'artículos'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 inline-flex items-center justify-center rounded-none hover:bg-surface text-secondary hover:text-primary"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Progreso hacia el pedido mínimo */}
        {minOrder && minOrder.amount > 0 && cart.length > 0 && (
          <div className="px-3.5 py-2 border-b border-border bg-surface/50">
            <p className="text-[11px] text-secondary mb-1.5">
              {minOrder.met ? (
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                  <Check size={12} /> Pedido mínimo alcanzado
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
            <div className="h-1 rounded-none bg-border overflow-hidden">
              <div
                className={`h-full rounded-none transition-all duration-500 ${minOrder.met ? 'bg-emerald-500' : 'bg-[var(--accent)]'}`}
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Artículos */}
        <div className="flex-1 overflow-y-auto px-3.5 py-2.5 space-y-2.5">
          {cart.length === 0 ? (
            <div className="py-12 text-center text-secondary">
              <ShoppingBag size={28} strokeWidth={1.5} className="mx-auto mb-2 opacity-60" />
              <p className="text-xs">Tu pedido está vacío</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product.id} className="flex gap-2.5 p-2 rounded-card bg-surface/50 border border-border/60">
                <div className="w-12 h-12 rounded-card overflow-hidden bg-surface border border-border flex-shrink-0">
                  {item.product.imagen_url ? (
                    <img src={item.product.imagen_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-secondary">
                      <ShoppingBag size={14} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between gap-1">
                  <div>
                    <h4 className="text-xs font-medium text-primary leading-snug line-clamp-2">{item.product.name}</h4>
                    <PriceTag
                      parts={getUnitPrice(item)}
                      className="text-[11px] text-secondary"
                      secondaryClassName="text-[10px] text-secondary/80"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <PriceTag
                      parts={getSubtotal(item)}
                      className="text-xs font-bold text-primary"
                      secondaryClassName="text-[10px] text-secondary"
                    />
                    <div className="flex items-center h-6 rounded-none border border-border bg-surface">
                      <button
                        type="button"
                        onClick={() => onRemove(item)}
                        className="w-6 h-6 inline-flex items-center justify-center rounded-none text-secondary hover:text-primary"
                        aria-label={`Quitar una unidad de ${item.product.name}`}
                      >
                        <Minus size={11} />
                      </button>
                      <span className="w-5 text-center text-xs font-semibold text-primary tabular-nums">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => onAdd(item)}
                        className="w-6 h-6 inline-flex items-center justify-center rounded-none text-secondary hover:text-primary"
                        aria-label={`Añadir una unidad de ${item.product.name}`}
                      >
                        <Plus size={11} />
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
          <div className="px-3.5 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-border bg-surface/60 space-y-2">
            <div className="space-y-0.5">
              {Object.entries(totals).map(([curr, val]) => (
                <div key={curr} className="flex items-baseline justify-between">
                  <span className="text-xs text-secondary">Total {Object.keys(totals).length > 1 ? `en ${curr}` : ''}</span>
                  <span className="font-display text-base font-bold text-primary tabular-nums">
                    {formatAmount(val)} {curr}
                  </span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={onCheckout}
              disabled={!canCheckout}
              className="w-full h-9 rounded-none bg-green-600 hover:bg-green-700 disabled:bg-surface-hover disabled:text-secondary disabled:cursor-not-allowed text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors active:scale-[0.99]"
            >
              <WhatsAppIcon size={15} />
              Continuar pedido por WhatsApp
            </button>
            <button
              type="button"
              onClick={onClear}
              className="w-full h-7 inline-flex items-center justify-center gap-1 text-[11px] font-medium text-secondary hover:text-red-500 transition-colors"
            >
              <Trash2 size={12} /> Vaciar pedido
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
