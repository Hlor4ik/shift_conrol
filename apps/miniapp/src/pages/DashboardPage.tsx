import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useToken } from '../lib/auth';

interface Dashboard {
  rating: number;
  totalShifts: number;
  totalEarnings: string;
  unreadNotifications: number;
  nextShift: {
    id: string;
    title: string;
    date: string;
    startTime: string;
    address: string;
    cost: string;
  } | null;
}

export default function DashboardPage() {
  const token = useToken();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api<Dashboard>('/workers/me/dashboard', { token: token! }),
    enabled: !!token && token !== 'dev',
  });

  if (token === 'dev') {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">ShiftControl</h1>
        <p className="text-tg-hint">Режим разработки — подключите Telegram для полного функционала</p>
      </div>
    );
  }

  if (isLoading) return <div className="animate-pulse h-40 bg-gray-100 rounded-xl" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <h1 className="text-2xl font-bold">Привет!</h1>
        <Link to="/notifications" className="relative p-2">
          <span className="text-xl">🔔</span>
          {(data?.unreadNotifications ?? 0) > 0 && (
            <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {data?.unreadNotifications}
            </span>
          )}
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Рейтинг" value={String(data?.rating ?? 100)} icon="⭐" />
        <StatCard label="Смен" value={String(data?.totalShifts ?? 0)} icon="📋" />
        <StatCard
          label="Заработок"
          value={`${Number(data?.totalEarnings ?? 0).toLocaleString('ru-RU')} ₽`}
          icon="💰"
          className="col-span-2"
        />
      </div>

      {data?.nextShift ? (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-sm text-tg-hint mb-2">Ближайшая смена</h2>
          <Link to={`/shifts/${data.nextShift.id}`} className="block">
            <p className="font-bold text-lg">{data.nextShift.title}</p>
            <p className="text-tg-hint text-sm mt-1">
              {new Date(data.nextShift.date).toLocaleDateString('ru-RU')} в {data.nextShift.startTime}
            </p>
            <p className="text-sm mt-1">{data.nextShift.address}</p>
            <p className="text-tg-button font-semibold mt-2">
              {Number(data.nextShift.cost).toLocaleString('ru-RU')} ₽
            </p>
          </Link>
          <Link
            to={`/checkin/${data.nextShift.id}`}
            className="mt-3 block text-center bg-tg-button text-tg-buttonText py-2 rounded-xl font-medium"
          >
            Отметиться
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
          <p className="text-tg-hint">Нет предстоящих смен</p>
          <Link to="/shifts" className="text-tg-link font-medium mt-2 inline-block">
            Найти смену →
          </Link>
        </div>
      )}

      <div className="flex gap-3">
        <Link
          to="/payments"
          className="flex-1 bg-white rounded-xl p-3 text-center shadow-sm text-sm font-medium"
        >
          Выплаты
        </Link>
        <Link
          to="/my-shifts"
          className="flex-1 bg-white rounded-xl p-3 text-center shadow-sm text-sm font-medium"
        >
          Мои смены
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  className,
}: {
  label: string;
  value: string;
  icon: string;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-2xl p-4 shadow-sm ${className ?? ''}`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-tg-hint">{label}</div>
    </div>
  );
}
