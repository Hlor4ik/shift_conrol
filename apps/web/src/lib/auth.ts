'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';

interface User {
  id: string;
  email: string;
  role: string;
  companyId?: string;
  company?: { id: string; name: string };
  managerProfile?: { fullName: string };
  foremanProfile?: { fullName: string };
}

interface AuthState {
  token: string | null;
  user: User | null;
  companyId: string | null;
  setAuth: (token: string, user: User) => void;
  setToken: (token: string) => void;
  setCompanyId: (id: string | null) => void;
  refreshSession: () => Promise<string | null>;
  logout: () => Promise<void>;
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
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('token');
  if (!token || isAccessTokenExpired(token)) {
    localStorage.removeItem('token');
    return null;
  }
  return token;
}

async function refreshRequest(): Promise<string | null> {
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { accessToken: string | null };
  return data.accessToken ?? null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      companyId: null,
      setAuth: (token, user) => {
        localStorage.setItem('token', token);
        set({ token, user, companyId: user.companyId ?? get().companyId });
      },
      setToken: (token) => {
        localStorage.setItem('token', token);
        set({ token });
      },
      setCompanyId: (companyId) => set({ companyId }),
      refreshSession: async () => {
        const newToken = await refreshRequest();
        if (newToken) {
          localStorage.setItem('token', newToken);
          set({ token: newToken });
          return newToken;
        }
        localStorage.removeItem('token');
        set({ token: null, user: null });
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
        localStorage.removeItem('token');
        set({ token: null, user: null, companyId: null });
      },
    }),
    {
      name: 'shiftcontrol-auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        companyId: state.companyId,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.token && isAccessTokenExpired(state.token)) {
          state.token = null;
          state.user = null;
        }
      },
    },
  ),
);

export { readStoredToken };
