import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useToken } from '../lib/auth';

interface Payment {
  id: string;
  amount: string;
  status: string;
  paidAt: string | null;
  shift: { title: string; date: string };
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Ожидает',
  PROCESSING: 'В обработке',
  PAID: 'Выплачено',
  CANCELLED: 'Отменено',
};

export default function PaymentsPage() {
  const token = useToken();
  const { data, isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: () => api<Payment[]>('/workers/me/payments', { token: token! }),
    enabled: !!token && token !== 'dev',
  });

  if (isLoading) return <div className="h-40 bg-gray-100 rounded-2xl animate-pulse" />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Выплаты</h1>
      <div className="space-y-3">
        {data?.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex justify-between">
              <div>
                <p className="font-bold">{p.shift.title}</p>
                <p className="text-sm text-tg-hint">
                  {new Date(p.shift.date).toLocaleDateString('ru-RU')}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold">{Number(p.amount).toLocaleString('ru-RU')} ₽</p>
                <StatusBadge status={p.status} />
              </div>
            </div>
            {p.paidAt && (
              <p className="text-xs text-tg-hint mt-2">
                Выплачено: {new Date(p.paidAt).toLocaleDateString('ru-RU')}
              </p>
            )}
          </div>
        ))}
        {!data?.length && <p className="text-center text-tg-hint py-8">Нет выплат</p>}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    PROCESSING: 'bg-blue-100 text-blue-800',
    PAID: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${colors[status] ?? ''}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
