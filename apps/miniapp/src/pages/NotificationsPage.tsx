import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useToken } from '../lib/auth';

interface Notification {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  type: string;
}

export default function NotificationsPage() {
  const token = useToken();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () =>
      api<{ items: Notification[]; unread: number }>('/notifications', { token: token! }),
    enabled: !!token && token !== 'dev',
  });

  const markAll = useMutation({
    mutationFn: () =>
      api('/notifications/read-all', { method: 'PATCH', token: token! }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  if (isLoading) return <div className="h-40 bg-gray-100 rounded-2xl animate-pulse" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Уведомления</h1>
        {(data?.unread ?? 0) > 0 && (
          <button onClick={() => markAll.mutate()} className="text-tg-link text-sm">
            Прочитать все
          </button>
        )}
      </div>
      <div className="space-y-2">
        {data?.items.map((n) => (
          <div
            key={n.id}
            className={`bg-white rounded-2xl p-4 shadow-sm ${!n.isRead ? 'border-l-4 border-tg-button' : ''}`}
          >
            <p className="font-semibold">{n.title}</p>
            <p className="text-sm text-gray-600 mt-1">{n.body}</p>
            <p className="text-xs text-tg-hint mt-2">
              {new Date(n.createdAt).toLocaleString('ru-RU')}
            </p>
          </div>
        ))}
        {!data?.items.length && <p className="text-center text-tg-hint py-8">Нет уведомлений</p>}
      </div>
    </div>
  );
}
