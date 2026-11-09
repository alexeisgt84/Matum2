import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: LucideIcon;
  iconSize?: number;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  iconSize,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100';
  
  const variants = {
    primary: 'bg-accent text-[var(--accent-text,black)] hover:bg-accent-hover',
    secondary: 'bg-surface-hover text-primary hover:bg-surface-hover/80 border border-border',
    danger: 'bg-danger/10 text-danger border border-danger/20 hover:bg-danger hover:text-white',
    ghost: 'bg-transparent text-secondary hover:text-primary hover:bg-surface-hover',
  };

  const sizes = {
    sm: 'px-2.5 py-1 text-[11px] gap-1 h-7',
    md: 'px-3 py-1.5 text-xs gap-1.5 h-8',
    lg: 'px-4 py-2 text-sm gap-2 h-9',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={loading || disabled}
      {...props}
    >
      {loading ? (
        <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {Icon && (
            <Icon 
              size={iconSize || (size === 'sm' ? 13 : size === 'lg' ? 17 : 15)} 
            />
          )}
          {children}
        </>
      )}
    </button>
  );
};
