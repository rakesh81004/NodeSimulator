import { create } from 'zustand';

interface ThemeState {
  themeColor: string;
  setThemeColor: (color: string) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  themeColor: '#007aff', // Default blue theme
  setThemeColor: (color) => set({ themeColor: color }),
})); 