import React from 'react';
import type { WhatsAppGroup } from '../../types/whatsappGroup';
import { Users, Trash2, CheckCircle2, Power } from 'lucide-react';
import { Switch } from '../ui/Switch';

interface GroupCardProps {
  group: WhatsAppGroup;
  onUnlink: (id: string) => void;
  onToggle: (id: string, isActive: boolean) => void;
}

export const GroupCard: React.FC<GroupCardProps> = ({ group, onUnlink, onToggle }) => {
  return (
    <div className={`card rounded-card w-full overflow-hidden group hover:border-accent/30 transition-all flex items-center gap-2.5 p-2.5 ${!group.is_active ? 'opacity-70 bg-surface/50' : ''}`}>
      <div className={`p-2 rounded-none transition-colors flex-shrink-0 ${group.is_active ? 'bg-accent/10 text-accent' : 'bg-gray-500/10 text-gray-500'}`}>
        <Users size={16} />
      </div>

      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex justify-between items-center gap-2 min-w-0">
          <div className="min-w-0 flex-1 overflow-hidden">
            <h3 className={`text-xs sm:text-sm text-primary font-bold truncate transition-colors ${group.is_active ? 'group-hover:text-accent' : 'text-gray-400'}`}>
              {group.name}
            </h3>
            <div className="flex items-center gap-1 mt-0.5">
              {group.is_active ? (
                <>
                  <CheckCircle2 size={9} className="text-accent" />
                  <span className="text-[9px] text-secondary uppercase font-bold tracking-widest">Activo</span>
                </>
              ) : (
                <>
                  <Power size={9} className="text-gray-500" />
                  <span className="text-[9px] text-gray-500 uppercase font-bold tracking-widest">Desactivado</span>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Switch 
              checked={group.is_active} 
              onChange={(checked) => onToggle(group.id, checked)}
            />
            <button 
              onClick={() => onUnlink(group.id)}
              className="p-1.5 text-secondary hover:text-danger hover:bg-danger/10 rounded-none transition-colors"
              title="Desvincular"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
