'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth';
import clsx from 'clsx';

export default function ForemanLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  if (!user || user.role !== 'FOREMAN') {
    if (typeof window !== 'undefined') router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="font-bold">Кабинет бригадира</h1>
          <p className="text-sm text-gray-500">{user.foremanProfile?.fullName}</p>
        </div>
        <button onClick={() => { logout(); router.push('/login'); }} className="text-sm text-red-500">
          Выйти
        </button>
      </header>
      <nav className="bg-white border-b px-6 flex gap-4">
        <Link
          href="/foreman/shifts"
          className={clsx(
            'py-3 text-sm font-medium border-b-2 -mb-px',
            pathname.startsWith('/foreman/shifts')
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-gray-500',
          )}
        >
          Мои смены
        </Link>
      </nav>
      <main className="p-6 max-w-4xl mx-auto">{children}</main>
    </div>
  );
}
