import { create } from 'zustand';

interface ProfileState {
  profile: any | null;
  loading: boolean;
  error: string | null;
  setProfile: (profile: any) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  loading: true,
  error: null,
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
