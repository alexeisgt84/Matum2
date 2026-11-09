import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CategoryIcon } from '../ui/CategoryIcon';
import type { StoreCategory } from '../../types/store';

export type CategorySelection = number | 'none' | null;

interface CategoryRailProps {
  categories: StoreCategory[];
  selected: CategorySelection;
  onSelect: (value: CategorySelection) => void;
  showUncategorized?: boolean;
  loading?: boolean;
}

const chipBase =
  'flex-shrink-0 inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]';
const chipActive = 'bg-[var(--accent)] text-[var(--accent-text)] border-transparent shadow-sm';
const chipIdle =
  'bg-surface text-secondary border-border hover:text-primary hover:border-[var(--text-secondary)]';

/** Carrusel horizontal navegable de categorías (con scrollbar, rueda, arrastre y flechas). */
export const CategoryRail: React.FC<CategoryRailProps> = ({
  categories,
  selected,
  onSelect,
  showUncategorized = false,
  loading = false,
}) => {
  const railRef = useRef<HTMLElement | null>(null);
  const dragStateRef = useRef({ active: false, moved: false, startX: 0, scrollLeft: 0 });
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    updateScrollButtons();
    const ro = new ResizeObserver(updateScrollButtons);
    ro.observe(el);
    window.addEventListener('resize', updateScrollButtons);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, [categories.length, showUncategorized, loading, updateScrollButtons]);

  // Convertir rueda vertical del ratón en desplazamiento horizontal
  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return;
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollBy({ left: e.deltaY, behavior: 'auto' });
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [categories.length]);

  const scrollByStep = (direction: -1 | 1) => {
    const el = railRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.max(180, el.clientWidth * 0.65), behavior: 'smooth' });
  };

  const handleSelect = (value: CategorySelection, buttonEl: HTMLButtonElement | null) => {
    if (dragStateRef.current.moved) return;
    onSelect(value);
    buttonEl?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  };

  if (loading) {
    return (
      <div className="flex gap-1.5 overflow-hidden py-0.5" aria-hidden="true">
        {[56, 84, 72, 96, 64].map((w, i) => (
          <div
            key={i}
            style={{ width: w }}
            className="h-7 rounded-full bg-surface border border-border animate-pulse flex-shrink-0"
          />
        ))}
      </div>
    );
  }

  if (categories.length === 0) return null;

  return (
    <div className="relative flex items-center gap-1">
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollByStep(-1)}
          className="flex-shrink-0 w-7 h-7 inline-flex items-center justify-center rounded-full bg-surface hover:bg-surface-hover border border-border text-primary shadow-sm transition-colors active:scale-95"
          aria-label="Desplazar categorías a la izquierda"
        >
          <ChevronLeft size={14} />
        </button>
      )}

      <nav
        ref={railRef}
        aria-label="Categorías"
        onScroll={updateScrollButtons}
        onMouseDown={e => {
          const el = railRef.current;
          if (!el) return;
          dragStateRef.current = {
            active: true,
            moved: false,
            startX: e.pageX - el.offsetLeft,
            scrollLeft: el.scrollLeft,
          };
        }}
        onMouseMove={e => {
          const el = railRef.current;
          const st = dragStateRef.current;
          if (!el || !st.active) return;
          const delta = e.pageX - el.offsetLeft - st.startX;
          if (Math.abs(delta) > 5) {
            st.moved = true;
            el.scrollLeft = st.scrollLeft - delta;
          }
        }}
        onMouseUp={() => {
          dragStateRef.current.active = false;
        }}
        onMouseLeave={() => {
          dragStateRef.current.active = false;
        }}
        className="flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto overscroll-x-contain touch-pan-x scroll-smooth py-1 select-none cursor-grab active:cursor-grabbing scrollbar-none"
      >
        <button
          type="button"
          onClick={e => handleSelect(null, e.currentTarget)}
          aria-pressed={selected === null}
          className={`${chipBase} ${selected === null ? chipActive : chipIdle}`}
        >
          Todo
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            type="button"
            onClick={e => handleSelect(cat.id, e.currentTarget)}
            aria-pressed={selected === cat.id}
            className={`${chipBase} ${selected === cat.id ? chipActive : chipIdle}`}
          >
            <CategoryIcon name={cat.icon} size={12} />
            <span>{cat.name}</span>
          </button>
        ))}
        {showUncategorized && (
          <button
            type="button"
            onClick={e => handleSelect('none', e.currentTarget)}
            aria-pressed={selected === 'none'}
            className={`${chipBase} ${selected === 'none' ? chipActive : chipIdle}`}
          >
            Otros
          </button>
        )}
      </nav>

      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollByStep(1)}
          className="flex-shrink-0 w-7 h-7 inline-flex items-center justify-center rounded-full bg-surface hover:bg-surface-hover border border-border text-primary shadow-sm transition-colors active:scale-95"
          aria-label="Desplazar categorías a la derecha"
        >
          <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
};
