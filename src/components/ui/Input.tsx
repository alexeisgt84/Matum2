import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  multiline?: boolean;
  rows?: number;
  icon?: any;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  multiline = false,
  rows,
  icon,
  className = '',
  ...props
}) => {
  const inputClasses = `
    w-full bg-surface border rounded-xl p-4 text-primary placeholder:text-secondary/50
    outline-none transition-all duration-200
    ${error ? 'border-danger/50 focus:border-danger' : 'border-border focus:border-accent focus:bg-surface-hover'}
    ${className}
  `;

  return (
    <div className="w-full space-y-2 text-primary">
      {label && <label className="text-sm font-medium text-secondary ml-1">{label}</label>}
      
      {multiline ? (
        <textarea 
          className={inputClasses} 
          rows={rows || 4} 
          {...props as any} 
        />
      ) : (
        <input 
          className={inputClasses} 
          {...props as any} 
        />
      )}

      {error ? (
        <p className="text-xs text-danger ml-1 font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-secondary ml-1">{helperText}</p>
      ) : null}
    </div>
  );
};
