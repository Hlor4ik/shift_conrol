'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import { QueryErrorBanner } from '@/components/QueryErrorBanner';

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId?: string;
  createdAt: string;
  user?: { email: string; role: string };
}

const PAGE_SIZE = 50;

export default function AuditPage() {
  const { token } = useAuthStore();
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['audit', page],
    queryFn: () =>
      api<{ items: AuditLog[]; total: number; page: number; limit: number }>(
        `/admin/audit-logs?page=${page}&limit=${PAGE_SIZE}`,
        { token: token! },
      ),
    enabled: !!token,
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Журнал аудита</h1>

      {isError && (
        <QueryErrorBanner
          message={error instanceof Error ? error.message : undefined}
          onRetry={() => refetch()}
        />
      )}

      {isLoading ? (
        <div className="animate-pulse h-40 bg-gray-100 rounded-xl" />
      ) : (
        <>
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
                    <td className="p-4">{log.user?.email ?? '—'}</td>
                    <td className="p-4">{log.action}</td>
                    <td className="p-4">
                      {log.entity}{' '}
                      {log.entityId && `#${log.entityId.slice(0, 8)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data?.items.length && (
              <p className="text-center text-gray-500 py-8">Записей нет</p>
            )}
          </div>

          {data && data.total > PAGE_SIZE && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Страница {page} из {totalPages} · всего {data.total}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="btn-secondary text-sm disabled:opacity-50"
                >
                  Назад
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="btn-secondary text-sm disabled:opacity-50"
                >
                  Вперёд
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
