import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
  zIndex?: string;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  loading = false,
  zIndex = 'z-[70]',
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      zIndex={zIndex}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button 
            variant={variant}
            size="sm"
            onClick={onConfirm} 
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="items-start gap-3 flex">
        <div className={`p-2 rounded-none shrink-0 ${variant === 'danger' ? 'bg-danger/10 text-danger' : 'bg-accent/10 text-accent'}`}>
          <AlertTriangle size={18} />
        </div>
        <div>
          <p className="text-secondary text-xs leading-relaxed">
            {message}
          </p>
        </div>
      </div>
    </Modal>
  );
};
