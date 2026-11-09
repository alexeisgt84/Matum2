import React, { useEffect, useState, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string | React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  zIndex?: string;
}

type ResizeDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  zIndex = 'z-50',
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
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      setSize({});
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

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
        width: Math.max(260, Math.min(maxW, nextW)),
        height: Math.max(180, Math.min(maxH, nextH)),
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

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 ${zIndex} flex items-center justify-center p-2 sm:p-3`}>
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Content */}
      <div
        ref={modalRef}
        style={{
          width: size.width ? `${size.width}px` : undefined,
          height: size.height ? `${size.height}px` : undefined,
          maxWidth: size.width ? 'calc(100vw - 16px)' : undefined,
          maxHeight: size.height ? 'calc(100vh - 16px)' : '90vh',
        }}
        className={`relative bg-surface border border-border w-full ${
          size.width ? '' : 'max-w-lg'
        } rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150`}
      >
        {/* Tiradores de redimensionamiento en las 8 direcciones */}
        <div
          onPointerDown={startResize('n')}
          className="absolute top-0 inset-x-2 h-1.5 cursor-ns-resize z-20"
        />
        <div
          onPointerDown={startResize('s')}
          className="absolute bottom-0 inset-x-2 h-1.5 cursor-ns-resize z-20"
        />
        <div
          onPointerDown={startResize('w')}
          className="absolute left-0 inset-y-2 w-1.5 cursor-ew-resize z-20"
        />
        <div
          onPointerDown={startResize('e')}
          className="absolute right-0 inset-y-2 w-1.5 cursor-ew-resize z-20"
        />
        <div
          onPointerDown={startResize('nw')}
          className="absolute top-0 left-0 w-3 h-3 cursor-nwse-resize z-30"
        />
        <div
          onPointerDown={startResize('ne')}
          className="absolute top-0 right-0 w-3 h-3 cursor-nesw-resize z-30"
        />
        <div
          onPointerDown={startResize('sw')}
          className="absolute bottom-0 left-0 w-3 h-3 cursor-nesw-resize z-30"
        />
        <div
          onPointerDown={startResize('se')}
          className="absolute bottom-0 right-0 w-3.5 h-3.5 cursor-nwse-resize z-30 flex items-end justify-end p-0.5 opacity-50 hover:opacity-100"
          title="Redimensionar ventana"
        >
          <span className="w-2 h-2 border-r border-b border-secondary" />
        </div>

        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border shrink-0">
          <h2 className="text-sm font-bold text-primary truncate">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-surface-hover rounded-full transition-colors text-secondary hover:text-primary"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-3.5 overflow-y-auto flex-1 min-h-0">
          {children}
        </div>

        {footer && (
          <div className="px-3.5 py-2.5 border-t border-border flex justify-end gap-2 bg-surface shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
