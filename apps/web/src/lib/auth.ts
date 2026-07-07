'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  role: string;
  companyId?: string;
  managerProfile?: { fullName: string };
  foremanProfile?: { fullName: string };
}

interface AuthState {
  token: string | null;
  user: User | null;
  companyId: string | null;
  setAuth: (token: string, user: User) => void;
  setCompanyId: (id: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      companyId: null,
      setAuth: (token, user) => set({ token, user, companyId: user.companyId ?? null }),
      setCompanyId: (companyId) => set({ companyId }),
      logout: () => set({ token: null, user: null, companyId: null }),
    }),
    { name: 'shiftcontrol-auth' },
  ),
);
