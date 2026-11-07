import React from 'react';
import type { PriceParts } from '../../lib/pricing';
import { CONSULT_PRICE_LABEL } from '../../lib/pricing';

interface PriceTagProps {
  parts: PriceParts | null;
  className?: string;
  secondaryClassName?: string;
  /** Muestra el precio secundario en una segunda línea */
  stacked?: boolean;
}

/** Precio con soporte de moneda dual (principal + equivalente). */
export const PriceTag: React.FC<PriceTagProps> = ({
  parts,
  className = 'text-base font-bold text-primary',
  secondaryClassName = 'text-xs font-medium text-secondary',
  stacked = false,
}) => {
  if (!parts) {
    return <span className={className}>{CONSULT_PRICE_LABEL}</span>;
  }

  return (
    <span className={`${stacked ? 'flex flex-col' : 'inline-flex flex-wrap items-baseline gap-x-1.5'} tabular-nums`}>
      <span className={className}>{parts.main}</span>
      {parts.secondary && <span className={secondaryClassName}>≈ {parts.secondary}</span>}
    </span>
  );
};
