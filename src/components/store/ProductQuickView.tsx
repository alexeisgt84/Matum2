import React, { useEffect, useState, useRef } from 'react';
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

type ResizeDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

/** Modal rápido de detalle de producto (usado en vista embebida o vista rápida), ajustable en tamaño. */
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
  const modalRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width?: number; height?: number }>({});
  const resizeState = useRef<{
    dir: ResizeDir;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);

  useEffect(() => {
    if (!product) {
      setSize({});
      return;
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [product, onClose]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const st = resizeState.current;
      if (!st) return;
      const dx = e.clientX - st.startX;
      const dy = e.clientY - st.startY;
      let nextW = st.startW;
      let nextH = st.startH;

      if (st.dir.includes('e')) nextW = st.startW + dx * 2;
      if (st.dir.includes('w')) nextW = st.startW - dx * 2;
      if (st.dir.includes('s')) nextH = st.startH + dy * 2;
      if (st.dir.includes('n')) nextH = st.startH - dy * 2;

      const maxW = window.innerWidth - 16;
      const maxH = window.innerHeight - 16;

      setSize({
        width: Math.max(280, Math.min(maxW, nextW)),
        height: Math.max(240, Math.min(maxH, nextH)),
      });
    };

    const onUp = () => {
      resizeState.current = null;
      document.body.style.userSelect = '';
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  const startResize = (dir: ResizeDir) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const el = modalRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    resizeState.current = {
      dir,
      startX: e.clientX,
      startY: e.clientY,
      startW: rect.width,
      startH: rect.height,
    };
    document.body.style.userSelect = 'none';
  };

  if (!product) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end md:items-center md:justify-center p-0 md:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={product.name}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div
        ref={modalRef}
        style={{
          width: size.width ? `${size.width}px` : undefined,
          height: size.height ? `${size.height}px` : undefined,
          maxWidth: size.width ? 'calc(100vw - 16px)' : undefined,
          maxHeight: size.height ? 'calc(100vh - 16px)' : '88vh',
        }}
        className={`relative w-full ${
          size.width ? '' : 'md:max-w-md'
        } bg-background border-t md:border border-border rounded-none overflow-hidden shadow-2xl flex flex-col animate-store-slide-up`}
      >
        {/* Tiradores de redimensionamiento */}
        <div onPointerDown={startResize('n')} className="absolute top-0 inset-x-2 h-1.5 cursor-ns-resize z-20" />
        <div onPointerDown={startResize('s')} className="absolute bottom-0 inset-x-2 h-1.5 cursor-ns-resize z-20" />
        <div onPointerDown={startResize('w')} className="absolute left-0 inset-y-2 w-1.5 cursor-ew-resize z-20" />
        <div onPointerDown={startResize('e')} className="absolute right-0 inset-y-2 w-1.5 cursor-ew-resize z-20" />
        <div onPointerDown={startResize('se')} className="absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize z-30" />

        <div
          onPointerDown={startResize('n')}
          className="w-10 h-1 bg-border rounded-none mx-auto my-2 md:hidden flex-shrink-0 cursor-ns-resize"
        />

        {/* Acciones flotantes */}
        <div className="absolute top-2.5 right-2.5 z-10 flex gap-1.5">
          <button
            type="button"
            onClick={onShare}
            className="w-8 h-8 inline-flex items-center justify-center rounded-none bg-black/55 hover:bg-black/75 text-white backdrop-blur-md transition-colors"
            aria-label="Compartir producto"
          >
            <Share2 size={14} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 inline-flex items-center justify-center rounded-none bg-black/55 hover:bg-black/75 text-white backdrop-blur-md transition-colors"
            aria-label="Cerrar"
          >
            <X size={15} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0">
          <div className="w-full aspect-square bg-surface relative overflow-hidden flex items-center justify-center">
            {product.imagen_url ? (
              <img src={product.imagen_url} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="text-secondary/60 flex flex-col items-center gap-1.5 py-10">
                <ShoppingBag size={36} strokeWidth={1.5} />
                <span className="text-[11px] font-medium text-secondary">Sin imagen</span>
              </div>
            )}
          </div>

          <div className="p-3.5 sm:p-4 space-y-3">
            <div className="space-y-1">
              <h2 className="font-display text-base sm:text-lg font-bold text-primary leading-snug">{product.name}</h2>
              <PriceTag
                parts={price}
                className="font-display text-base sm:text-lg font-extrabold text-[var(--accent)]"
                secondaryClassName="text-xs font-medium text-secondary"
              />
            </div>

            {showCommission && (product.commission_amount ?? 0) > 0 && (
              <div className="p-2.5 rounded-card bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-none bg-emerald-500/20 text-emerald-500 flex items-center justify-center flex-shrink-0">
                    <Coins size={14} />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block">
                      Tu ganancia de promotor
                    </span>
                    <span className="text-[10px] text-secondary">Comisión por cada venta que logres</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-500 tabular-nums">
                  +{product.commission_amount} {product.commission_currency || 'CUP'}
                </span>
              </div>
            )}

            {product.description && (
              <div className="pt-0.5 space-y-1">
                <h3 className="text-[11px] font-semibold text-secondary">Descripción</h3>
                <p className="text-xs text-primary/90 leading-relaxed whitespace-pre-line bg-surface p-3 rounded-card border border-border">
                  {product.description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Acciones inferiores */}
        <div className="p-3 bg-surface border-t border-border flex flex-col sm:flex-row gap-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] shrink-0">
          {quantity > 0 ? (
            <div className="flex items-center justify-between bg-background px-3 h-9 rounded-none border border-border sm:flex-1">
              <span className="text-xs font-medium text-secondary">En tu pedido</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onRemove}
                  className="w-7 h-7 inline-flex items-center justify-center rounded-none hover:bg-surface-hover text-secondary hover:text-primary"
                  aria-label="Restar unidad"
                >
                  <Minus size={13} />
                </button>
                <input
                  type="number"
                  min="0"
                  aria-label="Cantidad"
                  className="w-10 text-center text-xs font-bold text-primary bg-transparent outline-none focus:ring-1 focus:ring-accent rounded-none h-7 tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  value={quantity}
                  onChange={e => {
                    const val = parseInt(e.target.value, 10);
                    onSetQuantity(isNaN(val) ? 0 : val);
                  }}
                />
                <button
                  type="button"
                  onClick={onAdd}
                  className="w-7 h-7 inline-flex items-center justify-center rounded-none hover:bg-surface-hover text-secondary hover:text-primary"
                  aria-label="Sumar unidad"
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onAdd}
              className="h-9 px-3.5 rounded-none bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] text-xs font-semibold inline-flex items-center justify-center gap-1.5 sm:flex-1 transition-colors active:scale-[0.99]"
            >
              <Plus size={14} /> Agregar al pedido
            </button>
          )}

          <button
            type="button"
            onClick={onAskWhatsApp}
            className="h-9 px-3.5 rounded-none bg-green-600 hover:bg-green-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 sm:flex-1 transition-colors active:scale-[0.99]"
          >
            <WhatsAppIcon size={14} /> Consultar por WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
};
