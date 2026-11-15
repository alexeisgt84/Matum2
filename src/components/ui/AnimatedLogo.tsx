import React from 'react';

type LogoSize = 'sm' | 'md' | 'lg';

interface AnimatedLogoProps {
  size?: LogoSize;
  className?: string;
}

const SIZE_CLASSES: Record<LogoSize, { wrapper: string; img: string; ring: string }> = {
  sm: {
    wrapper: 'w-14 h-14',
    img: 'w-8 h-8',
    ring: 'border-2',
  },
  md: {
    wrapper: 'w-20 h-20',
    img: 'w-11 h-11',
    ring: 'border-[3px]',
  },
  lg: {
    wrapper: 'w-24 h-24',
    img: 'w-14 h-14',
    ring: 'border-[3px]',
  },
};

/**
 * Logo animado de Nazaar con halo pulsante y anillo orbital de carga.
 */
export const AnimatedLogo: React.FC<AnimatedLogoProps> = ({
  size = 'md',
  className = '',
}) => {
  const dims = SIZE_CLASSES[size];

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${dims.wrapper} ${className}`}
      aria-hidden="true"
    >
      {/* Halo difuminado detrás del logo */}
      <div className="nazaar-logo-halo absolute inset-1 rounded-full bg-[var(--accent)]/25 blur-xl pointer-events-none" />

      {/* Anillo de progreso giratorio */}
      <div
        className={`nazaar-logo-ring absolute inset-0 rounded-full ${dims.ring} border-[var(--accent)]/20 border-t-[var(--accent)]`}
      />

      {/* Logo oficial flotando suavemente */}
      <img
        src="/icon.png"
        alt="Nazaar"
        className={`nazaar-logo-float relative z-10 ${dims.img} object-contain drop-shadow-[0_4px_12px_rgba(108,56,255,0.35)]`}
        draggable={false}
      />
    </div>
  );
};

interface LoadingScreenProps {
  label?: string;
  fullScreen?: boolean;
  size?: LogoSize;
  className?: string;
}

/**
 * Pantalla o contenedor de carga centrado con el logo animado de la aplicación.
 */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  label,
  fullScreen = true,
  size = 'md',
  className = '',
}) => {
  const containerClass = fullScreen
    ? 'min-h-screen bg-background flex flex-col items-center justify-center p-4'
    : 'flex flex-col items-center justify-center p-8';

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label || 'Cargando'}
      className={`${containerClass} ${className}`}
    >
      <AnimatedLogo size={size} />
      {label ? (
        <p className="mt-4 text-secondary text-xs font-medium tracking-wide animate-pulse">
          {label}
        </p>
      ) : (
        <span className="sr-only">Cargando…</span>
      )}
    </div>
  );
};
