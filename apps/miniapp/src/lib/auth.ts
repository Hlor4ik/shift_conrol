import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import WebApp from '@twa-dev/sdk';
import { isInsideTelegram } from './telegram';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api/v1';
const LOGGED_OUT_KEY = 'shiftcontrol-logged-out';

interface AuthState {
  token: string | null;
  needsRegistration: boolean;
  isLoading: boolean;
  isOutsideTelegram: boolean;
  authError: string | null;
  loggedOut: boolean;
  login: () => Promise<void>;
  refreshSession: () => Promise<string | null>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export function isAccessTokenExpired(token: string, skewSeconds = 30): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1] ?? '')) as { exp?: number };
    if (!payload.exp) return true;
    return payload.exp * 1000 <= Date.now() + skewSeconds * 1000;
  } catch {
    return true;
  }
}

function readStoredToken(): string | null {
  if (localStorage.getItem(LOGGED_OUT_KEY) === '1') return null;
  const token = localStorage.getItem('token');
  if (!token || isAccessTokenExpired(token)) {
    localStorage.removeItem('token');
    return null;
  }
  return token;
}

async function authRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string>),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    const msg = err.message;
    throw new Error(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Request failed'));
  }
  return res.json();
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      token: readStoredToken(),
      needsRegistration: false,
      isLoading: false,
      isOutsideTelegram: false,
      authError: null,
      loggedOut: localStorage.getItem(LOGGED_OUT_KEY) === '1',
      login: async () => {
        if (get().loggedOut) return;
        set({ isLoading: true, authError: null });
        try {
          WebApp.ready();

          if (!isInsideTelegram()) {
            localStorage.removeItem('token');
            set({ token: null, isOutsideTelegram: true, needsRegistration: false });
            return;
          }

          const result = await authRequest<{ accessToken: string; needsRegistration: boolean }>(
            '/auth/telegram',
            { method: 'POST', body: JSON.stringify({ initData: WebApp.initData }) },
          );
          localStorage.removeItem(LOGGED_OUT_KEY);
          localStorage.setItem('token', result.accessToken);
          set({
            token: result.accessToken,
            needsRegistration: result.needsRegistration,
            isOutsideTelegram: false,
            loggedOut: false,
          });
        } catch (err) {
          localStorage.removeItem('token');
          set({
            token: null,
            authError: err instanceof Error ? err.message : 'Ошибка авторизации',
          });
        } finally {
          set({ isLoading: false });
        }
      },
      refreshSession: async () => {
        if (get().loggedOut) return null;
        try {
          const result = await authRequest<{ accessToken: string | null }>('/auth/refresh', {
            method: 'POST',
          });
          if (result.accessToken) {
            localStorage.setItem('token', result.accessToken);
            set({ token: result.accessToken });
            return result.accessToken;
          }
        } catch {
          // fall through
        }

        if (isInsideTelegram() && WebApp.initData && !get().loggedOut) {
          await get().login();
          return get().token;
        }

        localStorage.removeItem('token');
        set({ token: null, authError: 'Сессия истекла. Перезапустите приложение.' });
        return null;
      },
      logout: async () => {
        const token = get().token;
        try {
          if (token) {
            await fetch(`${API_URL}/auth/logout`, {
              method: 'POST',
              credentials: 'include',
              headers: { Authorization: `Bearer ${token}` },
            });
          }
        } catch {
          // ignore
        }
        localStorage.setItem(LOGGED_OUT_KEY, '1');
        localStorage.removeItem('token');
        set({
          token: null,
          needsRegistration: false,
          authError: null,
          loggedOut: true,
          isOutsideTelegram: true,
        });
      },
      clearError: () => set({ authError: null }),
    }),
    {
      name: 'shiftcontrol-miniapp-auth',
      partialize: (s) => ({ needsRegistration: s.needsRegistration, loggedOut: s.loggedOut }),
    },
  ),
);

export function useToken() {
  return useAuth((s) => s.token);
}
