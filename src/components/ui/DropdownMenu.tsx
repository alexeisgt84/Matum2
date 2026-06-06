import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';

export interface DropdownItem {
  label: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

interface DropdownMenuProps {
  items: DropdownItem[];
  trigger?: React.ReactNode;
}

export const DropdownMenu = ({ items, trigger }: DropdownMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      {trigger ? (
        <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      ) : (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 hover:bg-[var(--surface-hover)] rounded-full transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <MoreVertical size={24} />
        </button>
      )}

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl bg-surface border border-border shadow-2xl py-2 z-50 animate-in fade-in zoom-in duration-200">
          {items.map((item, index) => (
            <button
              key={index}
              onClick={() => {
                item.onClick();
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-surface-hover ${
                item.variant === 'danger' ? 'text-red-400' : 'text-primary'
              }`}
            >
              {item.icon && <item.icon size={18} />}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
