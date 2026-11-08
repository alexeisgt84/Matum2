import React, { useEffect, useCallback, useState, useRef } from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string | React.ReactNode;
  subtitle?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
  maxHeight?: string;
  zIndex?: string;
  showHandle?: boolean;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  children,
  footer,
  maxWidth = 'sm:max-w-xl',
  maxHeight = 'max-h-[92vh]',
  zIndex = 'z-50',
  showHandle = true,
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width?: number; height?: number }>({});
  const resizeRef = useRef<{
    mode: 'height' | 'width-e' | 'width-w';
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
      setSize({});
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const st = resizeRef.current;
      if (!st) return;
      if (st.mode === 'height') {
        const dy = st.startY - e.clientY;
        const maxH = window.innerHeight - 16;
        setSize(prev => ({
          ...prev,
          height: Math.max(220, Math.min(maxH, st.startH + dy)),
        }));
      } else {
        const dx = e.clientX - st.startX;
        const delta = st.mode === 'width-e' ? dx * 2 : -dx * 2;
        const maxW = window.innerWidth - 16;
        setSize(prev => ({
          ...prev,
          width: Math.max(280, Math.min(maxW, st.startW + delta)),
        }));
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

  const startResize = (mode: 'height' | 'width-e' | 'width-w') => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const el = sheetRef.current;
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

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 ${zIndex} flex items-end justify-center overflow-hidden`}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-200 animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Bottom Sheet Container */}
      <div
        ref={sheetRef}
        style={{
          width: size.width ? `${size.width}px` : undefined,
          height: size.height ? `${size.height}px` : undefined,
          maxWidth: size.width ? 'calc(100vw - 8px)' : undefined,
          maxHeight: size.height ? 'calc(100vh - 8px)' : undefined,
        }}
        className={`relative bg-surface border-t border-x border-border w-full ${
          size.width ? '' : maxWidth
        } rounded-none shadow-2xl overflow-hidden z-10 flex flex-col ${
          size.height ? '' : maxHeight
        } transition-transform duration-200 animate-in slide-in-from-bottom`}
      >
        {/* Tiradores laterales e inferiores/superiores para ajustar ventana */}
        <div
          onPointerDown={startResize('height')}
          className="absolute top-0 inset-x-0 h-2 cursor-ns-resize z-20"
          title="Arrastrar para ajustar altura"
        />
        <div
          onPointerDown={startResize('width-w')}
          className="hidden sm:block absolute left-0 inset-y-2 w-2 cursor-ew-resize z-20"
          title="Arrastrar para ajustar ancho"
        />
        <div
          onPointerDown={startResize('width-e')}
          className="hidden sm:block absolute right-0 inset-y-2 w-2 cursor-ew-resize z-20"
          title="Arrastrar para ajustar ancho"
        />

        {/* Barra superior de arrastre / Handle táctil */}
        {showHandle && (
          <div
            onPointerDown={startResize('height')}
            className="flex justify-center pt-1.5 pb-1 cursor-ns-resize select-none shrink-0"
            title="Arrastra para ajustar altura"
          >
            <div className="w-10 h-1 rounded-none bg-border hover:bg-accent/60 transition-colors" />
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border shrink-0 gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            {Icon && (
              <div className="w-7 h-7 rounded-none bg-surface-hover border border-border flex items-center justify-center text-accent shrink-0">
                <Icon size={15} />
              </div>
            )}
            <div className="min-w-0">
              <div className="text-sm font-bold text-primary tracking-wide truncate">
                {title}
              </div>
              {subtitle && (
                <p className="text-[10px] text-secondary truncate">{subtitle}</p>
              )}
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-surface-hover rounded-none transition-colors text-secondary hover:text-primary focus:outline-none shrink-0 active:scale-95"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>
        
        {/* Content body scrolleable */}
        <div className="p-3.5 overflow-y-auto flex-1 overscroll-contain min-h-0">
          {children}
        </div>

        {/* Footer fijo inferior */}
        {footer && (
          <div className="px-3.5 py-2.5 border-t border-border bg-surface/95 backdrop-blur-md shrink-0 flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
