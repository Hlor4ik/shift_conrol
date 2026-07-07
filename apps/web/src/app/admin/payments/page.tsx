'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';

export default function PaymentsPage() {
  const { token, companyId } = useAuthStore();
  const { data, isLoading } = useQuery({
    queryKey: ['payments', companyId],
    queryFn: () =>
      api<{ items: Payment[] }>('/payments', { token: token!, companyId: companyId ?? undefined }),
    enabled: !!token,
  });

  const markPaid = async (id: string) => {
    await api(`/payments/${id}`, {
      method: 'PATCH',
      token: token!,
      companyId: companyId ?? undefined,
      body: JSON.stringify({ status: 'PAID' }),
    });
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Выплаты</h1>
      {isLoading ? (
        <div className="animate-pulse h-40 bg-gray-100 rounded-xl" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4">Рабочий</th>
                <th className="text-left p-4">Смена</th>
                <th className="text-left p-4">Сумма</th>
                <th className="text-left p-4">Статус</th>
                <th className="text-left p-4"></th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((p) => (
                <tr key={p.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">{p.worker?.workerProfile?.fullName}</td>
                  <td className="p-4">{p.shift?.title}</td>
                  <td className="p-4">{Number(p.amount).toLocaleString('ru-RU')} ₽</td>
                  <td className="p-4">{p.status}</td>
                  <td className="p-4">
                    {p.status === 'PENDING' && (
                      <button onClick={() => markPaid(p.id)} className="text-brand-600 text-xs">
                        Выплатить
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface Payment {
  id: string;
  amount: string;
  status: string;
  worker?: { workerProfile?: { fullName: string } };
  shift?: { title: string };
}
