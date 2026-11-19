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
  xs: 'pl-2 pr-2 py-[2px] text-[8px]',
  sm: 'pl-2.5 pr-2 py-0.5 text-[8px] sm:text-[9px]',
  md: 'pl-3 pr-2.5 py-0.5 sm:py-1 text-[9px] sm:text-[10px]',
};

/**
 * Muestra las etiquetas comerciales activas superpuestas en la esquina superior derecha
 * como cintas envolventes que sobresalen ligeramente por el borde derecho con pliegue trasero 3D.
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

  const hasCustomPosition = /\b(top-|-top-|right-|-right-|inset-)/.test(className);
  const defaultPosition = compact ? 'top-1 -right-1' : 'top-2 -right-1.5';

  return (
    <div
      data-testid="product-badges-overlay"
      className={`absolute ${hasCustomPosition ? '' : defaultPosition} z-20 flex flex-col items-end ${
        compact ? 'gap-1' : 'gap-1.5'
      } pointer-events-none max-w-[88%] ${className}`.trim()}
    >
      {defs.map((badge) => (
        <span
          key={badge.id}
          title={badge.label}
          data-badge-id={badge.id}
          className={`relative inline-flex items-center font-extrabold uppercase tracking-wider border-y border-l rounded-l-full rounded-tr-sm rounded-br-none shadow-[0_3px_8px_rgba(0,0,0,0.32)] leading-tight whitespace-nowrap select-none ${
            compact
              ? 'w-3.5 h-1.5 rounded-l-full rounded-r-none'
              : SIZE_CLASSES[size]
          } ${badge.badgeClass}`}
        >
          {compact ? (
            <span className="sr-only">{badge.label}</span>
          ) : (
            <span>{badge.label}</span>
          )}
          <span
            aria-hidden="true"
            className={`absolute right-0 top-full w-0 h-0 ${
              compact
                ? 'border-t-[3px] border-r-[4px]'
                : 'border-t-[5px] border-r-[6px]'
            } border-r-transparent ${badge.foldClass}`}
          />
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
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[9px] font-bold uppercase tracking-wider select-none ${badge.inlineClass}`}
        >
          <span
            aria-hidden="true"
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${badge.dotClass}`}
          />
          <span>{badge.label}</span>
        </span>
      ))}
    </div>
  );
};
