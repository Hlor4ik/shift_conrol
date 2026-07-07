import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useToken } from '../lib/auth';

export default function MyShiftsPage() {
  const token = useToken();
  const queryClient = useQueryClient();

  const upcoming = useQuery({
    queryKey: ['my-shifts-upcoming'],
    queryFn: () => api<unknown[]>('/workers/me/shifts?upcoming=true', { token: token! }),
    enabled: !!token && token !== 'dev',
  });

  const past = useQuery({
    queryKey: ['my-shifts-past'],
    queryFn: () => api<unknown[]>('/workers/me/shifts?upcoming=false', { token: token! }),
    enabled: !!token && token !== 'dev',
  });

  const cancel = useMutation({
    mutationFn: (shiftId: string) =>
      api(`/shifts/${shiftId}/apply`, { method: 'DELETE', token: token! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-shifts-upcoming'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Мои смены</h1>

      <section>
        <h2 className="font-semibold text-tg-hint text-sm mb-3">Предстоящие</h2>
        <ShiftList
          items={upcoming.data as Array<{ id: string; shift: ShiftInfo }>}
          onCancel={(id) => cancel.mutate(id)}
          showCancel
        />
      </section>

      <section>
        <h2 className="font-semibold text-tg-hint text-sm mb-3">Прошедшие</h2>
        <ShiftList items={past.data as Array<{ id: string; shift: ShiftInfo }>} />
      </section>
    </div>
  );
}

interface ShiftInfo {
  id: string;
  title: string;
  date: string;
  startTime: string;
  cost: string;
  status: string;
}

function ShiftList({
  items,
  onCancel,
  showCancel,
}: {
  items?: Array<{ id: string; shift: ShiftInfo }>;
  onCancel?: (shiftId: string) => void;
  showCancel?: boolean;
}) {
  if (!items?.length) {
    return <p className="text-tg-hint text-sm">Нет смен</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((app) => (
        <div key={app.id} className="bg-white rounded-2xl p-4 shadow-sm">
          <Link to={`/shifts/${app.shift.id}`}>
            <p className="font-bold">{app.shift.title}</p>
            <p className="text-sm text-tg-hint">
              {new Date(app.shift.date).toLocaleDateString('ru-RU')} · {app.shift.startTime}
            </p>
            <p className="text-tg-button font-semibold mt-1">
              {Number(app.shift.cost).toLocaleString('ru-RU')} ₽
            </p>
          </Link>
          {showCancel && onCancel && (
            <button
              onClick={() => onCancel(app.shift.id)}
              className="mt-2 text-red-500 text-sm"
            >
              Отменить запись
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
