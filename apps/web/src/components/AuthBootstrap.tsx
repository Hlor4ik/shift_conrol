'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore, isAccessTokenExpired } from '@/lib/auth';

export function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { token, user, refreshSession } = useAuthStore();

  useEffect(() => {
    if (pathname === '/login') return;
    if (!user) return;

    const stored = token ?? (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
    if (!stored || isAccessTokenExpired(stored)) {
      refreshSession().then((newToken) => {
        if (!newToken) router.replace('/login');
      });
    }
  }, [pathname, token, user, refreshSession, router]);

  return <>{children}</>;
}
