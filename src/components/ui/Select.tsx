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
    w-full bg-surface-hover border rounded-none text-primary text-xs
    outline-none transition-all duration-150 appearance-none cursor-pointer pr-8
    ${error ? 'border-danger/50 focus:border-danger' : 'border-border focus:border-accent focus:bg-surface'}
    h-8 py-0 px-2.5
    ${Icon ? 'pl-8' : ''}
    ${className}
  `;

  return (
    <div className="w-full space-y-1 text-primary">
      {label && <label className="text-[11px] font-medium text-secondary ml-0.5 block">{label}</label>}
      
      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-2.5 text-secondary/50 pointer-events-none flex items-center justify-center">
            <Icon size={14} />
          </div>
        )}

        <select 
          className={selectClasses} 
          {...props}
        >
          {children}
        </select>

        <div className="absolute right-2.5 text-secondary/50 pointer-events-none flex items-center justify-center">
          <ChevronDown size={14} />
        </div>
      </div>

      {error ? (
        <p className="text-[10px] text-danger ml-0.5 font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-[10px] text-secondary ml-0.5">{helperText}</p>
      ) : null}
    </div>
  );
};
