import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop overlay */}
      <div 
        className="absolute inset-0 bg-black/85 backdrop-blur-[4px] transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
      />
      
      {/* Bottom Sheet Container */}
      <div className="relative bg-surface border-t border-x sm:border border-border w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl sm:mb-6 shadow-2xl overflow-hidden z-10 transition-transform duration-300 animate-in slide-in-from-bottom max-h-[90vh] flex flex-col">
        {/* Decorative drag handle for mobile feeling */}
        <div className="flex justify-center py-2 sm:hidden cursor-pointer" onClick={onClose}>
          <div className="w-12 h-1 rounded-full bg-border/60 hover:bg-border transition-colors" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
          <h2 className="text-lg font-bold text-primary tracking-wide">{title}</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-surface-hover rounded-full transition-colors text-secondary hover:text-primary focus:outline-none focus:ring-1 focus:ring-accent/50"
          >
            <X size={18} />
          </button>
        </div>
        
        {/* Content body */}
        <div className="p-5 overflow-y-auto flex-1 pb-8">
          {children}
        </div>
      </div>
    </div>
  );
};
