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
    <div className="flex items-center justify-between gap-2.5">
      {(label || subtitle) && (
        <div className="flex-1 min-w-0">
          {label && <p className="text-xs text-primary font-medium leading-tight">{label}</p>}
          {subtitle && <p className="text-[10px] text-secondary leading-tight mt-0.5">{subtitle}</p>}
        </div>
      )}
      <label className={`relative inline-flex items-center shrink-0 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
        <input 
          type="checkbox" 
          className="sr-only peer"
          checked={checked}
          onChange={(e) => !disabled && onChange(e.target.checked)}
          disabled={disabled}
        />
        <div className="w-8 h-4 bg-surface-hover border border-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-secondary after:border-transparent after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-accent peer-checked:border-accent peer-checked:after:bg-black shadow-inner"></div>
      </label>
    </div>
  );
};
