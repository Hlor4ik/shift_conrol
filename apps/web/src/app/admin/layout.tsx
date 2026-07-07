'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth';
import clsx from 'clsx';

const NAV = [
  { href: '/admin/dashboard', label: 'Дашборд' },
  { href: '/admin/companies', label: 'Компании', superadminOnly: true },
  { href: '/admin/objects', label: 'Объекты' },
  { href: '/admin/shifts', label: 'Смены' },
  { href: '/admin/workers', label: 'Работники' },
  { href: '/admin/payments', label: 'Выплаты' },
  { href: '/admin/reports', label: 'Отчёты' },
  { href: '/admin/settings', label: 'Настройки' },
  { href: '/admin/audit', label: 'Аудит', superadminOnly: true },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, companyId, setCompanyId } = useAuthStore();

  if (!user) {
    if (typeof window !== 'undefined') router.push('/login');
    return null;
  }

  const isSuperadmin = user.role === 'SUPERADMIN';
  const nav = NAV.filter((n) => !n.superadminOnly || isSuperadmin);

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
                pathname === item.href
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-50',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t">
          <button onClick={() => { logout(); router.push('/login'); }} className="text-sm text-red-500">
            Выйти
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b px-8 py-4 flex justify-between items-center">
          <h2 className="font-semibold text-gray-700">Админ-панель</h2>
          {isSuperadmin && (
            <input
              placeholder="Company ID (x-company-id)"
              value={companyId ?? ''}
              onChange={(e) => setCompanyId(e.target.value || null)}
              className="input-field max-w-xs text-sm"
            />
          )}
        </header>
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
