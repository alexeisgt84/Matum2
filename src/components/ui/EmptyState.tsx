import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Plus } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction
}) => {
  return (
    <div className="card rounded-card flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="w-12 h-12 bg-surface-hover rounded-card flex items-center justify-center mb-3 border border-border">
        <Icon size={24} className="text-secondary" />
      </div>
      <h3 className="text-sm font-bold text-primary mb-1">{title}</h3>
      <p className="text-secondary text-xs max-w-xs mb-4 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary" size="sm" icon={Plus}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
