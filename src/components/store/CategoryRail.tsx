import React from 'react';
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
  'flex-shrink-0 inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-[13px] font-semibold whitespace-nowrap border transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]';
const chipActive = 'bg-[var(--accent)] text-[var(--accent-text)] border-transparent shadow-sm';
const chipIdle = 'bg-surface text-secondary border-border hover:text-primary hover:border-[var(--text-secondary)]';

/** Carrusel horizontal de categorías. */
export const CategoryRail: React.FC<CategoryRailProps> = ({
  categories,
  selected,
  onSelect,
  showUncategorized = false,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="flex gap-2 overflow-hidden py-1" aria-hidden="true">
        {[64, 96, 80, 112, 72].map((w, i) => (
          <div key={i} style={{ width: w }} className="h-9 rounded-full bg-surface border border-border animate-pulse flex-shrink-0" />
        ))}
      </div>
    );
  }

  if (categories.length === 0) return null;

  return (
    <nav
      aria-label="Categorías"
      className="flex gap-2 overflow-x-auto scrollbar-none fade-x-edges -mx-4 px-4 py-1 select-none"
    >
      <button
        type="button"
        onClick={() => onSelect(null)}
        aria-pressed={selected === null}
        className={`${chipBase} ${selected === null ? chipActive : chipIdle}`}
      >
        Todo
      </button>
      {categories.map(cat => (
        <button
          key={cat.id}
          type="button"
          onClick={() => onSelect(cat.id)}
          aria-pressed={selected === cat.id}
          className={`${chipBase} ${selected === cat.id ? chipActive : chipIdle}`}
        >
          <CategoryIcon name={cat.icon} size={14} />
          <span>{cat.name}</span>
        </button>
      ))}
      {showUncategorized && (
        <button
          type="button"
          onClick={() => onSelect('none')}
          aria-pressed={selected === 'none'}
          className={`${chipBase} ${selected === 'none' ? chipActive : chipIdle}`}
        >
          Otros
        </button>
      )}
    </nav>
  );
};
