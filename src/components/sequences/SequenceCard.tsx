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
    <div className={`card group transition-all border-l-4 ${
      sequence.is_active ? 'border-l-[var(--accent)]' : 'border-l-gray-700 opacity-75'
    }`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${sequence.is_active ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'bg-white/5 text-gray-500'}`}>
            <Zap size={20} fill={sequence.is_active ? 'currentColor' : 'none'} />
          </div>
          <div>
            <h3 className="text-white font-bold group-hover:text-[var(--accent)] transition-colors uppercase text-[11px] tracking-widest">
              {sequence.name}
            </h3>
            <span className={`text-[10px] font-bold uppercase ${sequence.is_active ? 'text-[var(--accent)]' : 'text-gray-500'}`}>
              {sequence.is_active ? 'Activa' : 'Pausada'}
            </span>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => onToggle(sequence.id, !sequence.is_active)}
            className={`p-1 transition-colors ${sequence.is_active ? 'text-[var(--accent)]' : 'text-gray-600'}`}
          >
            {sequence.is_active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
          </button>
        </div>
      </div>

      <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
        <button 
          onClick={() => onManageSteps(sequence.id)}
          className="flex-1 py-2 px-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-gray-300 flex items-center justify-center gap-2 transition-all"
        >
          <Settings size={14} />
          Configurar Pasos
        </button>
        <button 
          onClick={() => onEdit(sequence)}
          className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 transition-all"
        >
          <Edit3 size={16} />
        </button>
        <button 
          onClick={() => onDelete(sequence.id)}
          className="p-2 bg-white/5 hover:bg-red-500/10 rounded-xl text-gray-400 hover:text-red-500 transition-all"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};
