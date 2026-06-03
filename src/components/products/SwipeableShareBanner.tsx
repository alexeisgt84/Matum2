import React, { useState, useRef } from 'react';
import { Sparkles, MessageSquare, Trash2 } from 'lucide-react';
import type { ProcessedSharedContent } from '../../lib/shareReceiver';

interface SwipeableShareBannerProps {
  item: ProcessedSharedContent;
  onRegister: () => void;
  onDelete: () => void;
}

export const SwipeableShareBanner: React.FC<SwipeableShareBannerProps> = ({
  item,
  onRegister,
  onDelete,
}) => {
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const dragThreshold = -100; // threshold in pixels to trigger delete

  // Touch handlers for mobile devices (extremely reliable)
  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    const touch = e.touches[0];
    if (touch) {
      setStartX(touch.clientX);
      setCurrentX(0);
      setIsDragging(true);
      if (cardRef.current) {
        cardRef.current.style.transition = 'none';
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    if (touch) {
      const deltaX = touch.clientX - startX;
      // Only drag left
      if (deltaX < 0) {
        setCurrentX(deltaX);
        if (cardRef.current) {
          cardRef.current.style.transform = `translateX(${deltaX}px)`;
        }
      }
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    if (cardRef.current) {
      cardRef.current.style.transition = 'transform 0.25s ease-out';
      if (currentX < dragThreshold) {
        cardRef.current.style.transform = 'translateX(-120%)';
        setIsDeleted(true);
        setTimeout(() => {
          onDelete();
        }, 250);
      } else {
        cardRef.current.style.transform = 'translateX(0)';
        setCurrentX(0);
      }
    }
  };

  // Mouse handlers for PC
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setStartX(e.clientX);
    setCurrentX(0);
    setIsDragging(true);
    if (cardRef.current) {
      cardRef.current.style.transition = 'none';
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - startX;
    if (deltaX < 0) {
      setCurrentX(deltaX);
      if (cardRef.current) {
        cardRef.current.style.transform = `translateX(${deltaX}px)`;
      }
    }
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (cardRef.current) {
      cardRef.current.style.transition = 'transform 0.25s ease-out';
      if (currentX < dragThreshold) {
        cardRef.current.style.transform = 'translateX(-120%)';
        setIsDeleted(true);
        setTimeout(() => {
          onDelete();
        }, 250);
      } else {
        cardRef.current.style.transform = 'translateX(0)';
        setCurrentX(0);
      }
    }
  };

  return (
    <div className={`relative rounded-2xl overflow-hidden mb-3 select-none ${isDeleted ? 'h-0 mb-0 opacity-0' : 'h-auto opacity-100'} transition-all duration-300`}>
      {/* Background Reveal (Red delete button) */}
      <div className="absolute inset-0 bg-red-500/90 flex items-center justify-end px-6 text-white rounded-2xl border border-red-500/20">
        <div className="flex flex-col items-center gap-1">
          <Trash2 size={20} className="animate-pulse" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Eliminar</span>
        </div>
      </div>

      {/* Main swipeable banner card */}
      <div
        ref={cardRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ touchAction: 'pan-y' }}
        className="relative p-4 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-purple-500/30 hover:border-purple-500/40 rounded-2xl flex items-center justify-between gap-4 shadow-lg shadow-purple-500/5 active:scale-[0.99] cursor-grab active:cursor-grabbing z-10 bg-[var(--surface)]"
      >
        <div className="flex items-center gap-3.5 min-w-0 pointer-events-none">
          {item.preview ? (
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/5 border border-purple-500/20 flex-shrink-0">
              <img src={item.preview} alt="Shared preview" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
              <MessageSquare size={22} />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-bold text-white flex items-center gap-1.5">
              <Sparkles size={13} className="text-purple-300" />
              <span>Producto compartido en espera</span>
            </p>
            <p className="text-[10px] text-gray-400 truncate max-w-[200px] mt-0.5 leading-normal">
              {item.description || 'Contenido compartido'}
            </p>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onRegister();
          }}
          className="relative z-20 text-[9px] font-bold uppercase tracking-widest text-purple-300 bg-purple-500/10 border border-purple-500/20 px-3 py-1.5 rounded-xl hover:bg-purple-500/20 active:scale-95 transition-all flex-shrink-0 cursor-pointer"
        >
          Registrar
        </button>
      </div>
    </div>
  );
};
