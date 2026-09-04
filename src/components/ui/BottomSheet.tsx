import React, { useEffect, useCallback } from 'react';
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
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 ${zIndex} flex items-end justify-center overflow-hidden`}>
      {/* Backdrop con desenfoque suave */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Bottom Sheet Container */}
      <div className={`relative bg-surface border-t border-x border-border w-full ${maxWidth} rounded-t-[28px] sm:rounded-t-[32px] shadow-2xl overflow-hidden z-10 flex flex-col ${maxHeight} transition-transform duration-300 animate-in slide-in-from-bottom`}>
        {/* Barra superior de arrastre / Handle táctil */}
        {showHandle && (
          <div className="flex justify-center pt-2.5 pb-1 cursor-pointer select-none shrink-0" onClick={onClose}>
            <div className="w-12 h-1.5 rounded-full bg-border hover:bg-surface-hover transition-colors active:scale-95" />
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {Icon && (
              <div className="w-9 h-9 rounded-xl bg-surface-hover border border-border flex items-center justify-center text-accent shrink-0 shadow-sm">
                <Icon size={18} />
              </div>
            )}
            <div className="min-w-0">
              <div className="text-base sm:text-lg font-bold text-primary tracking-wide truncate">
                {title}
              </div>
              {subtitle && (
                <p className="text-xs text-secondary truncate mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-surface-hover rounded-full transition-colors text-secondary hover:text-primary focus:outline-none focus:ring-1 focus:ring-accent/50 shrink-0 active:scale-95"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>
        
        {/* Content body scrolleable */}
        <div className="p-5 overflow-y-auto flex-1 overscroll-contain">
          {children}
        </div>

        {/* Footer fijo inferior */}
        {footer && (
          <div className="px-5 py-3.5 border-t border-border bg-surface/95 backdrop-blur-md shrink-0 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
