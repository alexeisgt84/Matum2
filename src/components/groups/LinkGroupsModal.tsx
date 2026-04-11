import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { EvolutionGroup } from '../../types/whatsappGroup';
import { Users, Search, Plus, RefreshCw } from 'lucide-react';

interface LinkGroupsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFetch: (force?: boolean) => Promise<EvolutionGroup[]>;
  onLink: (group: EvolutionGroup) => Promise<void>;
  loading?: boolean;
}

export const LinkGroupsModal: React.FC<LinkGroupsModalProps> = ({
  isOpen,
  onClose,
  onFetch,
  onLink,
  loading = false,
}) => {
  const [availableGroups, setAvailableGroups] = useState<EvolutionGroup[]>([]);
  const [search, setSearch] = useState('');
  const [fetching, setFetching] = useState(false);

  const loadGroups = async (force = false) => {
    setFetching(true);
    const groups = await onFetch(force);
    setAvailableGroups(groups);
    setFetching(false);
  };

  useEffect(() => {
    if (isOpen) loadGroups();
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
          onClick={() => loadGroups(true)} 
          className="w-full" 
          icon={RefreshCw}
          loading={fetching}
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
            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:border-[#25D366]/50 focus:ring-1 focus:ring-[#25D366]/50 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="max-h-[350px] overflow-y-auto space-y-2 pr-2">
          {fetching ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <RefreshCw size={48} className="mb-4 animate-spin text-[#25D366]" />
              <p className="text-xs uppercase font-bold tracking-widest text-white">Sincronizando grupos...</p>
              <p className="text-[10px] text-gray-600 mt-2 text-center max-w-[200px]">
                Esto puede demorar unos segundos dependiendo de tu conexión a WhatsApp.
              </p>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              <p className="text-sm">No se encontraron grupos disponibles.</p>
            </div>
          ) : (
            filteredGroups.map((group) => (
              <div 
                key={group.id} 
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-transparent hover:border-white/10 transition-all group"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="p-2 bg-white/5 rounded-lg text-gray-500 group-hover:text-[#25D366] transition-colors">
                    <Users size={18} />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm text-white font-bold truncate">{group.subject}</p>
                    <p className="text-[10px] text-gray-500 uppercase">{group.size || 0} miembros</p>
                  </div>
                </div>
                <button
                  onClick={() => onLink(group)}
                  className="p-2 bg-[#25D366]/10 text-[#25D366] rounded-lg hover:bg-[#25D366] hover:text-black transition-all"
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
