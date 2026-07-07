import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useToken } from '../lib/auth';

interface Shift {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  cost: string;
  address: string;
  bookedWorkers: number;
  maxWorkers: number;
  company: { name: string };
}

export default function ShiftsPage() {
  const token = useToken();
  const { data, isLoading } = useQuery({
    queryKey: ['shifts-available'],
    queryFn: () =>
      api<{ items: Shift[] }>('/shifts/available', { token: token! }),
    enabled: !!token && token !== 'dev',
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Доступные смены</h1>
      <div className="space-y-3">
        {data?.items.map((shift) => (
          <Link
            key={shift.id}
            to={`/shifts/${shift.id}`}
            className="block bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold">{shift.title}</p>
                <p className="text-sm text-tg-hint">{shift.company.name}</p>
              </div>
              <p className="font-bold text-tg-button">
                {Number(shift.cost).toLocaleString('ru-RU')} ₽
              </p>
            </div>
            <p className="text-sm mt-2">
              {new Date(shift.date).toLocaleDateString('ru-RU')} · {shift.startTime}–{shift.endTime}
            </p>
            <p className="text-sm text-tg-hint mt-1 truncate">{shift.address}</p>
            <p className="text-xs text-tg-hint mt-2">
              Мест: {shift.maxWorkers - shift.bookedWorkers} из {shift.maxWorkers}
            </p>
          </Link>
        ))}
        {!data?.items.length && (
          <p className="text-center text-tg-hint py-8">Нет доступных смен</p>
        )}
      </div>
    </div>
  );
}
