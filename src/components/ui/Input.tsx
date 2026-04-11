import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  multiline?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  multiline = false,
  className = '',
  ...props
}) => {
  const inputClasses = `
    w-full bg-[#1a1a1a] border rounded-xl p-4 text-white placeholder:text-gray-600
    outline-none transition-all duration-200
    ${error ? 'border-red-500/50 focus:border-red-500' : 'border-white/5 focus:border-[#25D366] focus:bg-[#242424]'}
    ${className}
  `;

  return (
    <div className="w-full space-y-2">
      {label && <label className="text-sm font-medium text-gray-400 ml-1">{label}</label>}
      
      {multiline ? (
        <textarea 
          className={inputClasses} 
          rows={4} 
          {...props as any} 
        />
      ) : (
        <input 
          className={inputClasses} 
          {...props as any} 
        />
      )}

      {error ? (
        <p className="text-xs text-red-500 ml-1 font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-gray-400 ml-1">{helperText}</p>
      ) : null}
    </div>
  );
};
