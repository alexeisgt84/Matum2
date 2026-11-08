import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  multiline?: boolean;
  rows?: number;
  icon?: any;
  showPasswordToggle?: boolean;
  rightElement?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  multiline = false,
  rows,
  icon: Icon,
  showPasswordToggle = true,
  rightElement,
  className = '',
  type,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const isPasswordType = type === 'password';
  const currentType = isPasswordType && showPasswordToggle && showPassword ? 'text' : type;

  const inputClasses = `
    w-full bg-surface-hover border rounded-none text-primary placeholder:text-secondary/50 text-xs
    outline-none transition-all duration-150
    ${error ? 'border-danger/50 focus:border-danger' : 'border-border focus:border-accent focus:bg-surface'}
    ${multiline ? 'p-2.5' : 'h-8 py-0 px-2.5'}
    ${Icon ? 'pl-8' : ''}
    ${(isPasswordType && showPasswordToggle) || rightElement ? 'pr-8' : ''}
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

        {multiline ? (
          <textarea 
            className={inputClasses} 
            rows={rows || 3} 
            {...props as any} 
          />
        ) : (
          <input 
            type={currentType}
            className={inputClasses} 
            {...props as any} 
          />
        )}

        {isPasswordType && showPasswordToggle && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2.5 text-secondary/50 hover:text-primary transition-colors focus:outline-none flex items-center justify-center"
          >
            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}

        {rightElement && !isPasswordType && (
          <div className="absolute right-1.5 flex items-center justify-center">
            {rightElement}
          </div>
        )}
      </div>

      {error ? (
        <p className="text-[10px] text-danger ml-0.5 font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-[10px] text-secondary ml-0.5">{helperText}</p>
      ) : null}
    </div>
  );
};
