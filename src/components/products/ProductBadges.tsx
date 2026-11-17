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
  xs: 'px-1.5 py-[1px] text-[8px] gap-0.5 rounded-md',
  sm: 'px-1.5 py-0.5 text-[8px] sm:text-[9px] gap-1 rounded-md',
  md: 'px-2 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-[10px] gap-1 rounded-md',
};

/**
 * Muestra las etiquetas comerciales activas superpuestas en la esquina superior derecha
 * de la fotografía del producto, apiladas verticalmente y sin renderizar contenedor si no hay etiquetas.
 */
export const ProductBadgesOverlay: React.FC<ProductBadgesOverlayProps> = ({
  badges,
  isFeatured,
  size = 'sm',
  compact = false,
  className = '',
}) => {
  const defs = getProductBadgeDefs(badges, isFeatured);
  if (defs.length === 0) return null;

  const hasCustomPosition = /\b(top-|right-|inset-)/.test(className);
  const defaultPosition = compact ? 'top-1 right-1' : 'top-1.5 right-1.5';

  return (
    <div
      data-testid="product-badges-overlay"
      className={`absolute ${hasCustomPosition ? '' : defaultPosition} z-10 flex flex-col items-end ${
        compact ? 'gap-0.5' : 'gap-1'
      } pointer-events-none max-w-[82%] ${className}`.trim()}
    >
      {defs.map((badge) => (
        <span
          key={badge.id}
          title={badge.label}
          data-badge-id={badge.id}
          className={`inline-flex items-center font-extrabold uppercase tracking-wider border backdrop-blur-md shadow-sm leading-tight whitespace-nowrap select-none ${
            compact
              ? 'px-1 py-[1px] text-[8px] rounded-[5px]'
              : SIZE_CLASSES[size]
          } ${badge.badgeClass}`}
        >
          <span aria-hidden="true" className="leading-none">
            {badge.emoji}
          </span>
          {compact ? (
            <span className="sr-only">{badge.label}</span>
          ) : (
            <span>{badge.label}</span>
          )}
        </span>
      ))}
    </div>
  );
};

interface ProductBadgesInlineProps {
  badges?: string[] | null;
  isFeatured?: boolean;
  className?: string;
}

/**
 * Muestra las etiquetas comerciales activas en formato lineal para filas de metadatos o cabeceras.
 */
export const ProductBadgesInline: React.FC<ProductBadgesInlineProps> = ({
  badges,
  isFeatured,
  className = '',
}) => {
  const defs = getProductBadgeDefs(badges, isFeatured);
  if (defs.length === 0) return null;

  return (
    <div
      data-testid="product-badges-inline"
      className={`inline-flex flex-wrap items-center gap-1 ${className}`.trim()}
    >
      {defs.map((badge) => (
        <span
          key={badge.id}
          title={badge.description}
          data-badge-id={badge.id}
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[9px] font-bold uppercase tracking-wider select-none ${badge.inlineClass}`}
        >
          <span aria-hidden="true" className="leading-none">
            {badge.emoji}
          </span>
          <span>{badge.label}</span>
        </span>
      ))}
    </div>
  );
};
