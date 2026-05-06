import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { EvolutionGroup } from '../../types/whatsappGroup';
import { Users, Search, Plus, RefreshCw } from 'lucide-react';

interface LinkGroupsModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableGroups: EvolutionGroup[];
  onFetch: (force?: boolean) => Promise<EvolutionGroup[]>;
  onLink: (group: EvolutionGroup) => Promise<void>;
  loading?: boolean;
}

export const LinkGroupsModal: React.FC<LinkGroupsModalProps> = ({
  isOpen,
  onClose,
  availableGroups,
  onFetch,
  onLink,
  loading = false,
}) => {
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      onFetch();
    }
  }, [isOpen]);

  const filteredGroups = Array.isArray(availableGroups) 
    ? availableGroups.filter(g => g.subject.toLowerCase().includes(search.toLowerCase()))
    : [];


  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Vincular Grupos"
      footer={
        <Button 
          variant="secondary" 
          onClick={() => onFetch(true)} 
          className="w-full" 
          icon={RefreshCw}
          loading={loading}
        >
          Actualizar Lista
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            placeholder="Buscar grupo..."
            className="w-full pl-10 pr-4 py-3 bg-[var(--surface-hover)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:border-[var(--accent)]/50 focus:ring-1 focus:ring-[var(--accent)]/50 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="max-h-[350px] overflow-y-auto space-y-2 pr-2">
          {loading && availableGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <RefreshCw size={48} className="mb-4 animate-spin text-[var(--accent)]" />
              <p className="text-xs uppercase font-bold tracking-widest text-[var(--text-primary)]">Sincronizando grupos...</p>
              <p className="text-[10px] text-gray-600 mt-2 text-center max-w-[200px]">
                Esto puede demorar unos segundos dependiendo de tu conexión a WhatsApp.
              </p>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="text-center py-12 text-[var(--text-secondary)]">
              <p className="text-sm">No se encontraron grupos disponibles.</p>
            </div>
          ) : (
            filteredGroups.map((group) => (
              <div 
                key={group.id} 
                className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--surface-hover)] border border-transparent hover:border-[var(--border)] transition-all group gap-3 w-full overflow-hidden"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="p-2 bg-[var(--surface)] rounded-lg text-gray-500 group-hover:text-[var(--accent)] transition-colors flex-shrink-0">
                    <Users size={16} />
                  </div>
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <p className="text-sm text-[var(--text-primary)] font-bold truncate">{group.subject}</p>
                    <p className="text-[10px] text-[var(--text-secondary)] uppercase">{group.size || 0} miembros</p>
                  </div>
                </div>
                <button
                  onClick={() => onLink(group)}
                  className="p-2 bg-[var(--accent)]/10 text-[var(--accent)] rounded-lg hover:bg-[var(--accent)] hover:text-black transition-all flex-shrink-0"
                >
                  <Plus size={18} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};
