import { create } from 'zustand';
import type { EvolutionInstance } from '../types/evolution';

interface EvolutionState {
  instances: Record<string, (EvolutionInstance & { server_id?: string }) | null>;
  loading: boolean;
  availableServers: any[];
  setInstance: (catalogId: string, instance: (EvolutionInstance & { server_id?: string }) | null) => void;
  setLoading: (loading: boolean) => void;
  setAvailableServers: (servers: any[]) => void;
}

export const useEvolutionStore = create<EvolutionState>((set) => ({
  instances: {},
  loading: false,
  availableServers: [],
  setInstance: (catalogId, instance) => set((state) => ({
    instances: {
      ...state.instances,
      [catalogId]: instance
    }
  })),
  setLoading: (loading) => set({ loading }),
  setAvailableServers: (servers) => set({ availableServers: servers }),
}));
