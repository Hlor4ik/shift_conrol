'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import { useToast } from '@/components/Toast';
import { QueryErrorBanner } from '@/components/QueryErrorBanner';

interface BackupLog {
  id: string;
  fileName: string;
  fileSize: string;
  status: string;
  error: string | null;
  createdAt: string;
}

export default function BackupsPage() {
  const { token } = useAuthStore();
  const { showToast } = useToast();
  const [running, setRunning] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['backups'],
    queryFn: () => api<BackupLog[]>('/admin/backups', { token: token! }),
    enabled: !!token,
  });

  const runBackup = async () => {
    setRunning(true);
    try {
      await api('/admin/backups/run', { method: 'POST', token: token! });
      showToast('Резервная копия создана');
      refetch();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Ошибка резервного копирования', 'error');
    } finally {
      setRunning(false);
    }
  };

  const formatSize = (bytes: string) => {
    const n = Number(bytes);
    if (!n) return '—';
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4">
        <h1 className="text-2xl font-bold">Резервные копии</h1>
        <button type="button" onClick={runBackup} disabled={running} className="btn-primary">
          {running ? 'Создание…' : 'Создать копию'}
        </button>
      </div>

      {isError && (
        <QueryErrorBanner
          message={error instanceof Error ? error.message : undefined}
          onRetry={() => refetch()}
        />
      )}

      {isLoading ? (
        <div className="animate-pulse h-40 bg-gray-100 rounded-xl" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4 font-medium">Файл</th>
                <th className="text-left p-4 font-medium">Размер</th>
                <th className="text-left p-4 font-medium">Статус</th>
                <th className="text-left p-4 font-medium">Дата</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((b) => (
                <tr key={b.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="p-4 font-mono text-xs">{b.fileName}</td>
                  <td className="p-4">{formatSize(b.fileSize)}</td>
                  <td className="p-4">
                    <span
                      className={
                        b.status === 'SUCCESS' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'
                      }
                    >
                      {b.status === 'SUCCESS' ? 'Успешно' : 'Ошибка'}
                    </span>
                    {b.error && <p className="text-xs text-red-500 mt-1">{b.error}</p>}
                  </td>
                  <td className="p-4">{new Date(b.createdAt).toLocaleString('ru-RU')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data?.length && <p className="text-center text-gray-500 py-8">Резервных копий пока нет</p>}
        </div>
      )}
    </div>
  );
}
