import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Switch } from '../ui/Switch';
import { Clock, Save, X, Plus, Trash2 } from 'lucide-react';
import type { SequenceSchedule } from '../../types/catalog';
import { toast } from 'react-hot-toast';

interface ScheduleSequenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedules: SequenceSchedule[];
  onSave: (schedules: SequenceSchedule[]) => Promise<void>;
}

export const ScheduleSequenceModal: React.FC<ScheduleSequenceModalProps> = ({
  isOpen,
  onClose,
  schedules: initialSchedules,
  onSave
}) => {
  const [localSchedules, setLocalSchedules] = useState<SequenceSchedule[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Inicializar con 5 horarios si no hay, o completar hasta 5
      const base = [...(initialSchedules || [])];
      while (base.length < 5) {
        base.push({ time: '09:00', enabled: false });
      }
      setLocalSchedules(base.slice(0, 5));
    }
  }, [isOpen, initialSchedules]);

  const handleToggle = (index: number) => {
    const newSchedules = [...localSchedules];
    newSchedules[index].enabled = !newSchedules[index].enabled;
    setLocalSchedules(newSchedules);
  };

  const handleTimeChange = (index: number, time: string) => {
    const newSchedules = [...localSchedules];
    newSchedules[index].time = time;
    setLocalSchedules(newSchedules);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave(localSchedules);
      onClose();
    } catch (error) {
      console.error('Error saving schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Programar Secuencia"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            loading={loading}
            icon={Save}
          >
            Guardar Cambios
          </Button>
        </div>
      }
    >
      <div className="space-y-4 py-2">
        <p className="text-sm text-secondary mb-4">
          Configura hasta 5 horarios para el envío automático de tu secuencia diaria.
        </p>

        <div className="space-y-3">
          {localSchedules.map((schedule, index) => (
            <div 
              key={index}
              className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                schedule.enabled 
                  ? 'bg-accent/5 border-accent/20' 
                  : 'bg-surface-hover border-border'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-xl ${schedule.enabled ? 'bg-accent text-black' : 'bg-surface text-secondary'}`}>
                  <Clock size={20} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-secondary">
                    Horario {index + 1}
                  </span>
                  <input
                    type="time"
                    value={schedule.time}
                    onChange={(e) => handleTimeChange(index, e.target.value)}
                    disabled={!schedule.enabled}
                    className={`bg-transparent border-none p-0 text-lg font-mono focus:ring-0 ${
                      schedule.enabled ? 'text-primary' : 'text-secondary opacity-50'
                    }`}
                  />
                </div>
              </div>

              <Switch
                checked={schedule.enabled}
                onChange={() => handleToggle(index)}
              />
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
          <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
            <strong>Nota:</strong> Los mensajes se enviarán automáticamente a los grupos vinculados en cada uno de los horarios activados.
          </p>
        </div>
      </div>
    </Modal>
  );
};
