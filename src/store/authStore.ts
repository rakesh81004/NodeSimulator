import { create } from 'zustand';
import { UserProfile } from '../types/simulation';
import { api } from '../persistence/api';

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, name: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('dsa_animator_token'),
  isLoading: true,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.login(email, password);
      localStorage.setItem('dsa_animator_token', data.token);
      set({ user: data.user, token: data.token, isLoading: false });
      return true;
    } catch (err: any) {
      set({ error: err.message || 'Login failed', isLoading: false });
      return false;
    }
  },

  register: async (email, name, password) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.register(email, name, password);
      localStorage.setItem('dsa_animator_token', data.token);
      set({ user: data.user, token: data.token, isLoading: false });
      return true;
    } catch (err: any) {
      set({ error: err.message || 'Registration failed', isLoading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('dsa_animator_token');
    set({ user: null, token: null, isLoading: false, error: null });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('dsa_animator_token');
    if (!token) {
      set({ user: null, token: null, isLoading: false });
      return;
    }

    try {
      const data = await api.getMe();
      set({ user: data.user, token, isLoading: false });
    } catch {
      localStorage.removeItem('dsa_animator_token');
      set({ user: null, token: null, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
