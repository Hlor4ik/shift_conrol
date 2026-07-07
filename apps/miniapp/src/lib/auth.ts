import { create } from 'zustand';
import WebApp from '@twa-dev/sdk';
import { api } from './api';

interface AuthState {
  token: string | null;
  needsRegistration: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => void;
}

export const useAuth = create<AuthState>((set, get) => ({
  token: localStorage.getItem('token'),
  needsRegistration: false,
  isLoading: false,
  login: async () => {
    set({ isLoading: true });
    try {
      WebApp.ready();
      const initData = WebApp.initData;
      if (!initData && import.meta.env.DEV) {
        set({ token: 'dev', needsRegistration: false, isLoading: false });
        return;
      }
      const result = await api<{ accessToken: string; needsRegistration: boolean }>(
        '/auth/telegram',
        { method: 'POST', body: JSON.stringify({ initData }) },
      );
      localStorage.setItem('token', result.accessToken);
      set({ token: result.accessToken, needsRegistration: result.needsRegistration });
    } finally {
      set({ isLoading: false });
    }
  },
  logout: () => {
    localStorage.removeItem('token');
    set({ token: null });
  },
}));

export function useToken() {
  return useAuth((s) => s.token);
}
