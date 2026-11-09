import React from 'react';
import type { AutomationSequence } from '../../types/sequence';
import { Edit3, Trash2, Zap, ToggleLeft, ToggleRight, Settings } from 'lucide-react';

interface SequenceCardProps {
  sequence: AutomationSequence;
  onEdit: (sequence: AutomationSequence) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, active: boolean) => void;
  onManageSteps: (id: string) => void;
}

export const SequenceCard: React.FC<SequenceCardProps> = ({ 
  sequence, 
  onEdit, 
  onDelete, 
  onToggle,
  onManageSteps
}) => {
  return (
    <div className={`card rounded-card group transition-all p-3 border-l-4 ${
      sequence.is_active ? 'border-l-[var(--accent)]' : 'border-l-gray-700 opacity-75'
    }`}>
      <div className="flex justify-between items-start mb-2.5">
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-xl ${sequence.is_active ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'bg-white/5 text-gray-500'}`}>
            <Zap size={16} fill={sequence.is_active ? 'currentColor' : 'none'} />
          </div>
          <div>
            <h3 className="text-white font-bold group-hover:text-[var(--accent)] transition-colors uppercase text-[11px] tracking-wider">
              {sequence.name}
            </h3>
            <span className={`text-[9px] font-bold uppercase ${sequence.is_active ? 'text-[var(--accent)]' : 'text-gray-500'}`}>
              {sequence.is_active ? 'Activa' : 'Pausada'}
            </span>
          </div>
        </div>
        
        <div className="flex gap-1.5">
          <button 
            onClick={() => onToggle(sequence.id, !sequence.is_active)}
            className={`p-0.5 transition-colors ${sequence.is_active ? 'text-[var(--accent)]' : 'text-gray-600'}`}
          >
            {sequence.is_active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
          </button>
        </div>
      </div>

      <div className="flex gap-1.5 mt-2.5 pt-2.5 border-t border-white/5">
        <button 
          onClick={() => onManageSteps(sequence.id)}
          className="flex-1 py-1.5 px-2.5 bg-white/5 hover:bg-white/10 rounded-lg text-[11px] font-bold text-gray-300 flex items-center justify-center gap-1.5 transition-all"
        >
          <Settings size={12} />
          Configurar Pasos
        </button>
        <button 
          onClick={() => onEdit(sequence)}
          className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 transition-all"
        >
          <Edit3 size={14} />
        </button>
        <button 
          onClick={() => onDelete(sequence.id)}
          className="p-1.5 bg-white/5 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-500 transition-all"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};
