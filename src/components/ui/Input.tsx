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
    w-full bg-surface-hover border rounded-xl text-primary placeholder:text-secondary/50 text-sm
    outline-none transition-all duration-200
    ${error ? 'border-danger/50 focus:border-danger' : 'border-border focus:border-accent focus:bg-surface'}
    ${multiline ? 'p-3.5' : 'h-11 py-0 px-3.5'}
    ${Icon ? 'pl-10' : ''}
    ${(isPasswordType && showPasswordToggle) || rightElement ? 'pr-11' : ''}
    ${className}
  `;

  return (
    <div className="w-full space-y-1.5 text-primary">
      {label && <label className="text-sm font-medium text-secondary ml-1">{label}</label>}
      
      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3.5 text-secondary/50 pointer-events-none flex items-center justify-center">
            <Icon size={18} />
          </div>
        )}

        {multiline ? (
          <textarea 
            className={inputClasses} 
            rows={rows || 4} 
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
            className="absolute right-3.5 text-secondary/50 hover:text-primary transition-colors focus:outline-none flex items-center justify-center"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}

        {rightElement && !isPasswordType && (
          <div className="absolute right-2 flex items-center justify-center">
            {rightElement}
          </div>
        )}
      </div>

      {error ? (
        <p className="text-xs text-danger ml-1 font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-secondary ml-1">{helperText}</p>
      ) : null}
    </div>
  );
};

