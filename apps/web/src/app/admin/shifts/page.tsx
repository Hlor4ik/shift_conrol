'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { getShiftStatusLabel } from '@shiftcontrol/shared';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import { QueryErrorBanner } from '@/components/QueryErrorBanner';
import { useToast } from '@/components/Toast';

interface Shift {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  cost: string;
  bookedWorkers: number;
  maxWorkers: number;
  status: string;
}

export default function ShiftsPage() {
  const { token, companyId } = useAuthStore();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['shifts', companyId],
    queryFn: () =>
      api<{ items: Shift[] }>('/shifts', { token: token!, companyId: companyId ?? undefined }),
    enabled: !!token,
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Смены</h1>
        <Link href="/admin/shifts/new" className="btn-primary">
          Создать смену
        </Link>
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
                <th className="text-left p-4 font-medium">Название</th>
                <th className="text-left p-4 font-medium">Дата</th>
                <th className="text-left p-4 font-medium">Время</th>
                <th className="text-left p-4 font-medium">Стоимость</th>
                <th className="text-left p-4 font-medium">Записано / свободно</th>
                <th className="text-left p-4 font-medium">Статус</th>
                <th className="text-left p-4 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((shift) => (
                <tr key={shift.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="p-4 font-medium">
                    <Link href={`/admin/shifts/${shift.id}`} className="text-brand-600 hover:underline">
                      {shift.title}
                    </Link>
                  </td>
                  <td className="p-4">{new Date(shift.date).toLocaleDateString('ru-RU')}</td>
                  <td className="p-4">
                    {shift.startTime}–{shift.endTime}
                  </td>
                  <td className="p-4">{Number(shift.cost).toLocaleString('ru-RU')} ₽</td>
                  <td className="p-4">
                    {shift.bookedWorkers} / {Math.max(0, shift.maxWorkers - shift.bookedWorkers)} св.
                    <span className="text-gray-400 text-xs ml-1">(всего {shift.maxWorkers})</span>
                  </td>
                  <td className="p-4">
                    <StatusBadge status={shift.status} />
                  </td>
                  <td className="p-4">
                    <ShiftActions shift={shift} token={token!} companyId={companyId} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data?.items.length && <p className="text-center text-gray-500 py-8">Нет смен</p>}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700',
    PUBLISHED: 'bg-green-100 text-green-700',
    IN_PROGRESS: 'bg-blue-100 text-blue-700',
    COMPLETED: 'bg-purple-100 text-purple-700',
    CANCELLED: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] ?? ''}`}>
      {getShiftStatusLabel(status)}
    </span>
  );
}

function ShiftActions({
  shift,
  token,
  companyId,
}: {
  shift: Shift;
  token: string;
  companyId: string | null;
}) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const publishMutation = useMutation({
    mutationFn: () =>
      api(`/shifts/${shift.id}/publish`, {
        method: 'POST',
        token,
        companyId: companyId ?? undefined,
      }),
    onSuccess: () => {
      showToast('Смена опубликована');
      queryClient.invalidateQueries({ queryKey: ['shifts', companyId] });
    },
    onError: (err: Error) => {
      showToast(err.message, 'error');
    },
  });

  return (
    <div className="flex gap-2 items-center">
      <Link href={`/admin/shifts/${shift.id}`} className="text-gray-600 text-xs font-medium">
        Подробнее
      </Link>
      {shift.status === 'DRAFT' && (
        <button
          type="button"
          onClick={() => publishMutation.mutate()}
          disabled={publishMutation.isPending}
          className="text-brand-600 text-xs font-medium"
        >
          {publishMutation.isPending ? '...' : 'Опубликовать'}
        </button>
      )}
    </div>
  );
}
