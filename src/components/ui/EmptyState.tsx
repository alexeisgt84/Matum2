import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Plus, Lock, AlertCircle } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  actionNotice?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionDisabled = false,
  actionNotice,
}) => {
  return (
    <div className="card rounded-card flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="w-12 h-12 bg-surface-hover rounded-card flex items-center justify-center mb-3 border border-border">
        <Icon size={24} className="text-secondary" />
      </div>
      <h3 className="text-sm font-bold text-primary mb-1">{title}</h3>
      <p className="text-secondary text-xs max-w-xs mb-4 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          variant="primary"
          size="sm"
          icon={actionDisabled ? Lock : Plus}
          disabled={actionDisabled}
        >
          {actionLabel}
        </Button>
      )}
      {actionNotice && (
        <div className="mt-3 max-w-xs px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[11px] font-medium flex items-center gap-1.5 text-left">
          <AlertCircle size={14} className="flex-shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}
    </div>
  );
};
