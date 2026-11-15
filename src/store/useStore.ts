import { create } from 'zustand';

export type ThemeMode = 'dark' | 'light';

/** Resuelve el tema inicial desde localStorage, usando 'light' por defecto. */
export const getInitialTheme = (): ThemeMode => {
  if (typeof localStorage === 'undefined') return 'light';
  const saved = localStorage.getItem('theme');
  return saved === 'dark' || saved === 'light' ? saved : 'light';
};

interface AppState {
  user: any | null;
  loading: boolean;
  theme: ThemeMode;
  setUser: (user: any) => void;
  setLoading: (loading: boolean) => void;
  toggleTheme: () => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  loading: false,
  theme: getInitialTheme(),
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  toggleTheme: () => set((state) => {
    const newTheme: ThemeMode = state.theme === 'dark' ? 'light' : 'dark';
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('theme', newTheme);
    }
    return { theme: newTheme };
  }),
}));
