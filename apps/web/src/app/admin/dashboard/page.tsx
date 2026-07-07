'use client';

import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';

interface Dashboard {
  workersCount: number;
  activeShifts: number;
  freeSpots: number;
  noShows: number;
  averageRating: number;
  shiftsByMonth: { month: string; count: number }[];
  objectsStats: { id: string; name: string; completedShifts: number }[];
}

export default function DashboardPage() {
  const { token, companyId } = useAuthStore();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', companyId],
    queryFn: () => api<Dashboard>('/reports/dashboard', { token: token!, companyId: companyId ?? undefined }),
    enabled: !!token,
  });

  if (isLoading) return <div className="animate-pulse h-64 bg-gray-100 rounded-xl" />;

  const stats = [
    { label: 'Работников', value: data?.workersCount ?? 0, color: 'bg-blue-500' },
    { label: 'Активных смен', value: data?.activeShifts ?? 0, color: 'bg-green-500' },
    { label: 'Свободных мест', value: data?.freeSpots ?? 0, color: 'bg-yellow-500' },
    { label: 'Неявок', value: data?.noShows ?? 0, color: 'bg-red-500' },
    { label: 'Средний рейтинг', value: (data?.averageRating ?? 0).toFixed(1), color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Дашборд</h1>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <div className={`w-2 h-2 rounded-full ${s.color} mb-3`} />
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-sm text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-semibold mb-4">Смены по месяцам</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data?.shiftsByMonth ?? []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold mb-4">Статистика по объектам</h3>
          <div className="space-y-3">
            {data?.objectsStats.map((o) => (
              <div key={o.id} className="flex justify-between items-center">
                <span className="text-sm">{o.name}</span>
                <span className="text-sm font-medium">{o.completedShifts} смен</span>
              </div>
            ))}
            {!data?.objectsStats.length && (
              <p className="text-gray-500 text-sm">Нет данных</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
