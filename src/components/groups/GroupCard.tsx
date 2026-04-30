import React from 'react';
import type { WhatsAppGroup } from '../../types/whatsappGroup';
import { Users, Trash2, CheckCircle2 } from 'lucide-react';

interface GroupCardProps {
  group: WhatsAppGroup;
  onUnlink: (id: string) => void;
}

export const GroupCard: React.FC<GroupCardProps> = ({ group, onUnlink }) => {
  return (
    <div className="card group hover:border-accent/30 transition-all flex items-center gap-4">
      <div className="p-3 rounded-xl bg-accent/10 text-accent">
        <Users size={24} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-primary font-bold truncate group-hover:text-accent transition-colors">
              {group.name}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <CheckCircle2 size={12} className="text-accent" />
              <span className="text-[10px] text-secondary uppercase font-bold tracking-widest">Vinculado</span>
            </div>
          </div>
          <button 
            onClick={() => onUnlink(group.id)}
            className="p-2 text-secondary hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
