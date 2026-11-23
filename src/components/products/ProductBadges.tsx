import React from 'react';
import { getProductBadgeDefs } from '../../constants/productBadges';

interface ProductBadgesOverlayProps {
  badges?: string[] | null;
  isFeatured?: boolean;
  size?: 'xs' | 'sm' | 'md';
  compact?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<'xs' | 'sm' | 'md', string> = {
  xs: 'px-2 pt-1.5 pb-1 text-[8px]',
  sm: 'px-2.5 pt-2 pb-1 text-[8px] sm:text-[9px]',
  md: 'px-3 pt-2.5 pb-1.5 text-[10px] sm:text-[11px]',
};

/**
 * Muestra la etiqueta comercial activa del producto (máximo 1) sobresaliendo desde
 * el borde superior derecho con un pliegue trasero 3D que da el efecto de venir desde atrás.
 */
export const ProductBadgesOverlay: React.FC<ProductBadgesOverlayProps> = ({
  badges,
  size = 'sm',
  compact = false,
  className = '',
}) => {
  const defs = getProductBadgeDefs(badges);
  if (defs.length === 0) return null;

  const badge = defs[0];
  const hasCustomPosition = /\b(top-|-top-|right-|-right-|inset-)/.test(className);
  const defaultPosition = compact ? '-top-1 right-1' : '-top-1.5 right-2';

  return (
    <div
      data-testid="product-badges-overlay"
      className={`absolute ${hasCustomPosition ? '' : defaultPosition} z-20 pointer-events-none ${className}`.trim()}
    >
      <span
        title={badge.label}
        data-badge-id={badge.id}
        className={`relative inline-flex items-center justify-center font-bold uppercase tracking-wider border-x border-b rounded-t-sm rounded-b-md shadow-[0_2px_6px_rgba(0,0,0,0.18)] leading-tight whitespace-nowrap select-none ${
          compact
            ? 'w-3 h-3 rounded-t-[2px] rounded-b-sm'
            : SIZE_CLASSES[size]
        } ${badge.badgeClass}`}
      >
        <span
          aria-hidden="true"
          className={`absolute top-0 ${
            compact
              ? '-left-[3px] border-b-[4px] border-l-[3px]'
              : '-left-[5px] border-b-[6px] border-l-[5px]'
          } w-0 h-0 border-l-transparent ${badge.foldTopClass}`}
        />
        {compact ? (
          <span className="sr-only">{badge.label}</span>
        ) : (
          <span>{badge.label}</span>
        )}
      </span>
    </div>
  );
};

interface ProductBadgesInlineProps {
  badges?: string[] | null;
  isFeatured?: boolean;
  className?: string;
}

/**
 * Muestra la etiqueta comercial activa en formato lineal para filas de metadatos o cabeceras.
 */
export const ProductBadgesInline: React.FC<ProductBadgesInlineProps> = ({
  badges,
  className = '',
}) => {
  const defs = getProductBadgeDefs(badges);
  if (defs.length === 0) return null;

  const badge = defs[0];

  return (
    <div
      data-testid="product-badges-inline"
      className={`inline-flex flex-wrap items-center gap-1 ${className}`.trim()}
    >
      <span
        key={badge.id}
        title={badge.description}
        data-badge-id={badge.id}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[9px] font-bold uppercase tracking-wider select-none ${badge.inlineClass}`}
      >
        <span
          aria-hidden="true"
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${badge.dotClass}`}
        />
        <span>{badge.label}</span>
      </span>
    </div>
  );
};
