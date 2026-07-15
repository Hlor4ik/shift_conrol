'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getUserStatusLabel } from '@shiftcontrol/shared';
import { api, apiFormData } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import { QueryErrorBanner } from '@/components/QueryErrorBanner';

interface Worker {
  userId: string;
  fullName: string;
  phone: string;
  city: string;
  specialty: string;
  rating: number;
  totalShifts: number;
  user?: { status: string };
}

interface ImportResult {
  created: number;
  skipped: number;
  errors: string[];
}

export default function WorkersPage() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [city, setCity] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['workers', debouncedSearch, city],
    queryFn: () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (city) params.set('city', city);
      return api<{ items: Worker[] }>(`/workers?${params}`, { token: token! });
    },
    enabled: !!token,
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiFormData<ImportResult>('/import/workers', formData, { token: token! });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
    },
  });

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (file) importMutation.mutate(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Работники</h1>
        <button type="button" onClick={() => setImportOpen(!importOpen)} className="btn-primary">
          Импорт CSV/Excel
        </button>
      </div>

      {importOpen && (
        <form onSubmit={handleImport} className="card p-4 space-y-3">
          <p className="text-sm text-gray-500">
            Загрузите файл Excel (.xlsx) с колонками: ФИО, Телефон, Город, Специальность
          </p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="text-sm" required />
          {importMutation.isError && (
            <QueryErrorBanner
              message={
                importMutation.error instanceof Error
                  ? importMutation.error.message
                  : 'Ошибка импорта'
              }
            />
          )}
          {importMutation.isSuccess && importMutation.data && (
            <p className="text-sm text-green-700">
              Создано: {importMutation.data.created}, пропущено: {importMutation.data.skipped}
              {importMutation.data.errors.length > 0 &&
                `, ошибок: ${importMutation.data.errors.length}`}
            </p>
          )}
          <div className="flex gap-3">
            <button type="submit" disabled={importMutation.isPending} className="btn-primary">
              {importMutation.isPending ? 'Импорт...' : 'Загрузить'}
            </button>
            <button type="button" onClick={() => setImportOpen(false)} className="btn-secondary">
              Закрыть
            </button>
          </div>
        </form>
      )}

      <div className="flex gap-4">
        <input
          className="input-field max-w-xs"
          placeholder="Поиск по ФИО, телефону..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <input
          className="input-field max-w-xs"
          placeholder="Город"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
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
                <th className="text-left p-4">ФИО</th>
                <th className="text-left p-4">Телефон</th>
                <th className="text-left p-4">Город</th>
                <th className="text-left p-4">Специальность</th>
                <th className="text-left p-4">Рейтинг</th>
                <th className="text-left p-4">Смен</th>
                <th className="text-left p-4">Статус</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((w) => (
                <tr key={w.userId} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-medium">
                    <Link
                      href={`/admin/workers/${w.userId}`}
                      className="text-brand-600 hover:underline"
                    >
                      {w.fullName}
                    </Link>
                  </td>
                  <td className="p-4">{w.phone}</td>
                  <td className="p-4">{w.city}</td>
                  <td className="p-4">{w.specialty}</td>
                  <td className="p-4">{w.rating}</td>
                  <td className="p-4">{w.totalShifts}</td>
                  <td className="p-4">{getUserStatusLabel(w.user?.status ?? '')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data?.items.length && (
            <p className="text-center text-gray-500 py-8">Работники не найдены</p>
          )}
        </div>
      )}
    </div>
  );
}
