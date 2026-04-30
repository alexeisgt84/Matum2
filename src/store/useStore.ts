import { create } from 'zustand';

interface AppState {
  user: any | null;
  loading: boolean;
  theme: 'dark' | 'light';
  setUser: (user: any) => void;
  setLoading: (loading: boolean) => void;
  toggleTheme: () => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  loading: false,
  theme: (localStorage.getItem('theme') as 'dark' | 'light') || 'dark',
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  toggleTheme: () => set((state) => {
    const newTheme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', newTheme);
    return { theme: newTheme };
  }),
}));
