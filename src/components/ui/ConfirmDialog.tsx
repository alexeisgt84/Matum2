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
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button 
            variant={variant} 
            onClick={onConfirm} 
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="items-start gap-4 flex">
        <div className={`p-3 rounded-2xl ${variant === 'danger' ? 'bg-danger/10 text-danger' : 'bg-accent/10 text-accent'}`}>
          <AlertTriangle size={24} />
        </div>
        <div>
          <p className="text-secondary leading-relaxed">
            {message}
          </p>
        </div>
      </div>
    </Modal>
  );
};
