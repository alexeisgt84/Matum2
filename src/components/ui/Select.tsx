import React from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: any;
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  helperText,
  icon: Icon,
  className = '',
  children,
  ...props
}) => {
  const selectClasses = `
    w-full bg-surface-hover border rounded-xl text-primary text-sm
    outline-none transition-all duration-200 appearance-none cursor-pointer pr-10
    ${error ? 'border-danger/50 focus:border-danger' : 'border-border focus:border-accent focus:bg-surface'}
    h-11 py-0 px-3.5
    ${Icon ? 'pl-10' : ''}
    ${className}
  `;

  return (
    <div className="w-full space-y-1.5 text-primary">
      {label && <label className="text-sm font-medium text-secondary ml-1 block">{label}</label>}
      
      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3.5 text-secondary/50 pointer-events-none flex items-center justify-center">
            <Icon size={18} />
          </div>
        )}

        <select 
          className={selectClasses} 
          {...props}
        >
          {children}
        </select>

        <div className="absolute right-3.5 text-secondary/50 pointer-events-none flex items-center justify-center">
          <ChevronDown size={18} />
        </div>
      </div>

      {error ? (
        <p className="text-xs text-danger ml-1 font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-secondary ml-1">{helperText}</p>
      ) : null}
    </div>
  );
};
