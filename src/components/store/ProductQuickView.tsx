import React, { useEffect, useState, useRef } from 'react';
import { Coins, Minus, Plus, Share2, ShoppingBag, X, Truck, Clock } from 'lucide-react';
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
        } bg-background border-t md:border border-border/80 rounded-t-3xl md:rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-store-slide-up`}
      >
        {/* Tiradores de redimensionamiento */}
        <div onPointerDown={startResize('n')} className="absolute top-0 inset-x-2 h-1.5 cursor-ns-resize z-20" />
        <div onPointerDown={startResize('s')} className="absolute bottom-0 inset-x-2 h-1.5 cursor-ns-resize z-20" />
        <div onPointerDown={startResize('w')} className="absolute left-0 inset-y-2 w-1.5 cursor-ew-resize z-20" />
        <div onPointerDown={startResize('e')} className="absolute right-0 inset-y-2 w-1.5 cursor-ew-resize z-20" />
        <div onPointerDown={startResize('se')} className="absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize z-30" />

        <div
          onPointerDown={startResize('n')}
          className="w-10 h-1 bg-border rounded-full mx-auto my-2.5 md:hidden flex-shrink-0 cursor-ns-resize"
        />

        {/* Acciones flotantes */}
        <div className="absolute top-3 right-3 z-10 flex gap-1.5">
          <button
            type="button"
            onClick={onShare}
            className="w-8 h-8 inline-flex items-center justify-center rounded-full bg-black/50 hover:bg-black/75 text-white backdrop-blur-md transition-all active:scale-95 shadow-sm"
            aria-label="Compartir producto"
          >
            <Share2 size={14} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 inline-flex items-center justify-center rounded-full bg-black/50 hover:bg-black/75 text-white backdrop-blur-md transition-all active:scale-95 shadow-sm"
            aria-label="Cerrar"
          >
            <X size={15} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0">
          <div className="p-3 pb-0">
            <div className="w-full aspect-square bg-surface/50 border border-border/60 rounded-2xl relative overflow-hidden flex items-center justify-center">
              {product.imagen_url ? (
                <img src={product.imagen_url} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />
              ) : (
                <div className="text-secondary/60 flex flex-col items-center gap-1.5 py-10">
                  <ShoppingBag size={36} strokeWidth={1.5} />
                  <span className="text-[11px] font-medium text-secondary">Sin imagen</span>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 space-y-3.5">
            <div className="space-y-1">
              <h2 className="font-display text-lg sm:text-xl font-extrabold text-primary leading-snug">{product.name}</h2>
              <PriceTag
                parts={price}
                className="font-display text-lg sm:text-xl font-black text-[var(--accent)] tracking-tight"
                secondaryClassName="text-xs font-semibold text-secondary"
              />
            </div>

            {showCommission && (product.commission_amount ?? 0) > 0 && (
              <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/25 flex items-center justify-between gap-2.5 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center flex-shrink-0">
                    <Coins size={15} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block">
                      Tu ganancia de promotor
                    </span>
                    <span className="text-[10px] text-secondary">Comisión por cada venta que logres</span>
                  </div>
                </div>
                <span className="text-sm font-extrabold text-emerald-500 tabular-nums">
                  +{product.commission_amount} {product.commission_currency || 'CUP'}
                </span>
              </div>
            )}

            {((product.delivery_cost !== null && product.delivery_cost !== undefined) ||
              (product.delivery_time_value !== null && product.delivery_time_value !== undefined)) && (
              <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20 grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center flex-shrink-0">
                    <Truck size={14} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] text-secondary block font-medium">Domicilio</span>
                    <span className="font-bold text-primary truncate block">
                      {product.delivery_cost !== null && product.delivery_cost !== undefined
                        ? Number(product.delivery_cost) === 0
                          ? 'Envío Gratis'
                          : `${product.delivery_cost} ${product.delivery_currency || 'CUP'}`
                        : 'A coordinar'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center flex-shrink-0">
                    <Clock size={14} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] text-secondary block font-medium">Entrega estimada</span>
                    <span className="font-bold text-primary truncate block">
                      {product.delivery_time_value !== null && product.delivery_time_value !== undefined
                        ? `${product.delivery_time_value} ${product.delivery_time_unit === 'days' ? (Number(product.delivery_time_value) === 1 ? 'día' : 'días') : (Number(product.delivery_time_value) === 1 ? 'hora' : 'horas')}`
                        : 'Inmediata'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {product.description && (
              <div className="pt-0.5 space-y-1.5">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-secondary">Descripción</h3>
                <p className="text-xs text-primary/90 leading-relaxed whitespace-pre-line bg-surface/60 p-3.5 rounded-2xl border border-border/70">
                  {product.description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Acciones inferiores */}
        <div className="p-3 bg-surface/90 backdrop-blur-md border-t border-border/70 flex flex-col sm:flex-row gap-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] shrink-0">
          {quantity > 0 ? (
            <div className="flex items-center justify-between bg-background px-3 h-11 rounded-full border border-border sm:flex-1 shadow-sm">
              <span className="text-xs font-semibold text-secondary">En tu pedido</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onRemove}
                  className="w-8 h-8 inline-flex items-center justify-center rounded-full hover:bg-surface-hover text-secondary hover:text-primary active:scale-90 transition-transform"
                  aria-label="Restar unidad"
                >
                  <Minus size={13} />
                </button>
                <input
                  type="number"
                  min="0"
                  aria-label="Cantidad"
                  className="w-10 text-center text-xs font-extrabold text-primary bg-transparent outline-none focus:ring-1 focus:ring-accent rounded-md h-7 tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  value={quantity}
                  onChange={e => {
                    const val = parseInt(e.target.value, 10);
                    onSetQuantity(isNaN(val) ? 0 : val);
                  }}
                />
                <button
                  type="button"
                  onClick={onAdd}
                  className="w-8 h-8 inline-flex items-center justify-center rounded-full hover:bg-surface-hover text-secondary hover:text-primary active:scale-90 transition-transform"
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
              className="h-11 px-4 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] text-xs font-bold inline-flex items-center justify-center gap-1.5 sm:flex-1 transition-all active:scale-[0.98] shadow-sm"
            >
              <Plus size={15} strokeWidth={2.5} /> Agregar al pedido
            </button>
          )}

          <button
            type="button"
            onClick={onAskWhatsApp}
            className="h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 sm:flex-1 transition-all active:scale-[0.98] shadow-md shadow-emerald-600/20"
          >
            <WhatsAppIcon size={15} /> Consultar por WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
};
