'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';

export default function AuditPage() {
  const { token } = useAuthStore();
  const { data, isLoading } = useQuery({
    queryKey: ['audit'],
    queryFn: () =>
      api<{ items: AuditLog[] }>('/admin/audit-logs', { token: token! }),
    enabled: !!token,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Журнал аудита</h1>
      {isLoading ? (
        <div className="animate-pulse h-40 bg-gray-100 rounded-xl" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4">Дата</th>
                <th className="text-left p-4">Пользователь</th>
                <th className="text-left p-4">Действие</th>
                <th className="text-left p-4">Сущность</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((log) => (
                <tr key={log.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">{new Date(log.createdAt).toLocaleString('ru-RU')}</td>
                  <td className="p-4">{log.user?.email}</td>
                  <td className="p-4">{log.action}</td>
                  <td className="p-4">{log.entity} {log.entityId && `#${log.entityId.slice(0, 8)}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId?: string;
  createdAt: string;
  user?: { email: string };
}
