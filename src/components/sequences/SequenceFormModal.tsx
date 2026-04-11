import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { AutomationSequence, SequenceForm } from '../../types/sequence';
import { Save, Zap } from 'lucide-react';

interface SequenceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (form: SequenceForm, id?: string) => Promise<boolean>;
  sequence?: AutomationSequence | null;
  loading?: boolean;
}

export const SequenceFormModal: React.FC<SequenceFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  sequence,
  loading = false,
}) => {
  const [form, setForm] = useState<SequenceForm>({
    name: '',
    is_active: true,
  });

  useEffect(() => {
    if (sequence) {
      setForm({
        name: sequence.name,
        is_active: sequence.is_active,
      });
    } else {
      setForm({ name: '', is_active: true });
    }
  }, [sequence, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await onSave(form, sequence?.id);
    if (success) onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={sequence ? 'Editar Secuencia' : 'Nueva Secuencia'}
      footer={
        <Button 
          type="submit" 
          form="sequence-form"
          className="w-full" 
          loading={loading}
          icon={Save}
        >
          {sequence ? 'Guardar Cambios' : 'Crear Secuencia'}
        </Button>
      }
    >
      <form id="sequence-form" onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <Input
            label="Nombre de la Secuencia"
            placeholder="Ej: Bienvenida Nuevos Miembros"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            autoFocus
            icon={Zap}
          />

          <p className="text-xs text-gray-500 leading-relaxed italic">
            Una secuencia te permite automatizar el envío de múltiples mensajes cuando ocurre un evento (como un nuevo miembro en un grupo).
          </p>
        </div>
      </form>
    </Modal>
  );
};
