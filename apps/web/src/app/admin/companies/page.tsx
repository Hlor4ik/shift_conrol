'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';

export default function CompaniesPage() {
  const { token } = useAuthStore();
  const { data, isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: () => api<{ items: Company[] }>('/companies', { token: token! }),
    enabled: !!token,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Компании</h1>
      {isLoading ? (
        <div className="animate-pulse h-32 bg-gray-100 rounded-xl" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4">Название</th>
                <th className="text-left p-4">ИНН</th>
                <th className="text-left p-4">Телефон</th>
                <th className="text-left p-4">Статус</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((c) => (
                <tr key={c.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-medium">{c.name}</td>
                  <td className="p-4">{c.inn ?? '—'}</td>
                  <td className="p-4">{c.phone ?? '—'}</td>
                  <td className="p-4">{c.isActive ? 'Активна' : 'Неактивна'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface Company {
  id: string;
  name: string;
  inn?: string;
  phone?: string;
  isActive: boolean;
}
