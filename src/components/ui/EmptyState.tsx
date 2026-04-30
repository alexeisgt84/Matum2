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
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="w-20 h-20 bg-surface-hover rounded-3xl flex items-center justify-center mb-6 border border-border">
        <Icon size={40} className="text-secondary" />
      </div>
      <h3 className="text-xl font-bold text-primary mb-2">{title}</h3>
      <p className="text-secondary max-w-xs mb-8">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary" icon={Plus}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
