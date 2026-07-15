'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/auth';
import clsx from 'clsx';
import { CompanySelector } from '@/components/CompanySelector';

const NAV = [
  { href: '/admin/dashboard', label: 'Дашборд' },
  { href: '/admin/companies', label: 'Компании', superadminOnly: true },
  { href: '/admin/objects', label: 'Объекты' },
  { href: '/admin/shifts', label: 'Смены' },
  { href: '/admin/workers', label: 'Работники' },
  { href: '/admin/verification', label: 'Проверка' },
  { href: '/admin/payments', label: 'Выплаты' },
  { href: '/admin/reports', label: 'Отчёты' },
  { href: '/admin/settings', label: 'Настройки' },
  { href: '/admin/staff', label: 'Сотрудники' },
  { href: '/admin/audit', label: 'Аудит', superadminOnly: true },
  { href: '/admin/backups', label: 'Резервные копии', superadminOnly: true },
];

const ADMIN_ROLES = new Set(['SUPERADMIN', 'MANAGER']);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!ADMIN_ROLES.has(user.role)) {
      if (user.role === 'FOREMAN') router.replace('/foreman/shifts');
      else router.replace('/login');
    }
  }, [user, router]);

  if (!user || !ADMIN_ROLES.has(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Загрузка...
      </div>
    );
  }

  const isSuperadmin = user.role === 'SUPERADMIN';
  const nav = NAV.filter((n) => !n.superadminOnly || isSuperadmin);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b">
          <h1 className="font-bold text-lg">ShiftControl</h1>
          <p className="text-xs text-gray-500 mt-1">{user.email}</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'block px-3 py-2 rounded-lg text-sm font-medium transition',
                pathname === item.href || pathname.startsWith(`${item.href}/`)
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-50',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t">
          <button type="button" onClick={handleLogout} className="text-sm text-red-500">
            Выйти
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b px-8 py-4 flex justify-between items-center gap-4">
          <h2 className="font-semibold text-gray-700">Админ-панель</h2>
          <CompanySelector />
        </header>
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
