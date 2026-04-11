import React from 'react';
import type { WhatsAppGroup } from '../../types/whatsappGroup';
import { Users, Trash2, CheckCircle2 } from 'lucide-react';

interface GroupCardProps {
  group: WhatsAppGroup;
  onUnlink: (id: string) => void;
}

export const GroupCard: React.FC<GroupCardProps> = ({ group, onUnlink }) => {
  return (
    <div className="card group hover:border-[#25D366]/30 transition-all flex items-center gap-4">
      <div className="p-3 rounded-xl bg-[#25D366]/10 text-[#25D366]">
        <Users size={24} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-white font-bold truncate group-hover:text-[#25D366] transition-colors">
              {group.name}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <CheckCircle2 size={12} className="text-[#25D366]" />
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Vinculado</span>
            </div>
          </div>
          <button 
            onClick={() => onUnlink(group.id)}
            className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
