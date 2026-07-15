'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import { QueryErrorBanner } from '@/components/QueryErrorBanner';

export default function ForemanShiftsPage() {
  const { token } = useAuthStore();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['foreman-shifts'],
    queryFn: () => api<Shift[]>('/foreman/shifts', { token: token! }),
    enabled: !!token,
  });

  if (isLoading) return <div className="animate-pulse h-40 bg-gray-100 rounded-xl" />;
  if (isError) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Мои смены</h2>
        <QueryErrorBanner onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Мои смены</h2>
      {data?.map((shift) => (
        <div key={shift.id} className="card p-5">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold">{shift.title}</h3>
              <p className="text-sm text-gray-500">
                {new Date(shift.date).toLocaleDateString('ru-RU')} · {shift.startTime}–{shift.endTime}
              </p>
              <p className="text-sm text-gray-500">{shift.object?.name}</p>
            </div>
            <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">{shift.status}</span>
          </div>
          <div className="flex gap-3 mt-4">
            <Link href={`/foreman/shifts/${shift.id}`} className="btn-primary text-sm">
              Посещаемость
            </Link>
            <Link href={`/foreman/shifts/${shift.id}/qr`} className="btn-secondary text-sm">
              QR-код
            </Link>
          </div>
        </div>
      ))}
      {!data?.length && <p className="text-gray-500">Нет назначенных смен</p>}
    </div>
  );
}

interface Shift {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  object?: { name: string };
}
