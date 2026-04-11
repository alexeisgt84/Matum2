import React from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  subtitle?: string;
  disabled?: boolean;
}

export const Switch: React.FC<SwitchProps> = ({ 
  checked, 
  onChange, 
  label, 
  subtitle,
  disabled = false 
}) => {
  return (
    <div className="flex items-center justify-between gap-4">
      {(label || subtitle) && (
        <div className="flex-1">
          {label && <p className="text-sm text-gray-200 font-medium">{label}</p>}
          {subtitle && <p className="text-[10px] text-gray-500 leading-tight">{subtitle}</p>}
        </div>
      )}
      <label className={`relative inline-flex items-center ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
        <input 
          type="checkbox" 
          className="sr-only peer"
          checked={checked}
          onChange={(e) => !disabled && onChange(e.target.checked)}
          disabled={disabled}
        />
        <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:border-transparent after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#25D366] peer-checked:after:bg-white shadow-inner"></div>
      </label>
    </div>
  );
};
