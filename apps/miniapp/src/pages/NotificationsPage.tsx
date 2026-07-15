import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useToken } from '../lib/auth';
import { formatDateTime } from '../lib/format';
import { SubPageLayout } from '../components/layout/SubPageLayout';
import { Button } from '../components/ui/Button';
import { SectionTitle } from '../components/ui/SectionTitle';
import { SkeletonList } from '../components/ui/Skeleton';
import { QueryErrorBanner } from '../components/ui/QueryErrorBanner';
import { EmptyState } from '../components/ui/EmptyState';
import { IconBell, IconCalendar, IconWallet, IconShift } from '../components/icons';

interface Notification {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  type: string;
  data?: { shiftId?: string } | null;
}

const typeIcons: Record<string, React.ReactNode> = {
  SHIFT: <IconCalendar className="w-5 h-5" />,
  SHIFT_REMINDER: <IconCalendar className="w-5 h-5" />,
  APPLICATION_CONFIRMED: <IconCalendar className="w-5 h-5" />,
  PAYMENT: <IconWallet className="w-5 h-5" />,
  PAYMENT_INFO: <IconWallet className="w-5 h-5" />,
  SYSTEM: <IconBell className="w-5 h-5" />,
};

const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const token = useToken();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
    useInfiniteQuery({
      queryKey: ['notifications'],
      queryFn: ({ pageParam = 1 }) =>
        api<{ items: Notification[]; unread: number; total: number; page: number; limit: number }>(
          `/notifications?page=${pageParam}&limit=${PAGE_SIZE}`,
          { token: token! },
        ),
      initialPageParam: 1,
      getNextPageParam: (last) =>
        last.page * last.limit < last.total ? last.page + 1 : undefined,
      enabled: !!token,
    });

  const markRead = useMutation({
    mutationFn: (id: string) =>
      api(`/notifications/${id}/read`, { method: 'PATCH', token: token! }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAll = useMutation({
    mutationFn: () => api('/notifications/read-all', { method: 'PATCH', token: token! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const handleTap = async (n: Notification) => {
    if (!n.isRead) {
      await markRead.mutateAsync(n.id);
    }
    const shiftId = n.data?.shiftId;
    if (shiftId) navigate(`/shifts/${shiftId}`);
  };

  if (isLoading) return <SkeletonList count={4} height="h-20" />;

  if (isError) {
    return (
      <SubPageLayout title="Уведомления">
        <QueryErrorBanner onRetry={() => refetch()} />
      </SubPageLayout>
    );
  }

  const items = data?.pages.flatMap((p) => p.items) ?? [];
  const unread = data?.pages[0]?.unread ?? 0;

  return (
    <SubPageLayout title="Уведомления">
      <div className="flex items-center justify-between gap-3 -mt-1">
        <p className="text-[13px] text-slate-500">
          {unread ? `${unread} непрочитанных` : 'Все прочитаны'}
        </p>
        {unread > 0 && (
          <Button variant="ghost" className="!py-2 !px-3 text-sm" onClick={() => markAll.mutate()}>
            Прочитать все
          </Button>
        )}
      </div>

      <div className="sc-card p-4 bg-blue-50 border-blue-100">
        <p className="text-[13px] text-slate-600 leading-relaxed">
          Напоминания о сменах, подтверждения записи и уведомления о выплатах
        </p>
      </div>

      <SectionTitle>Сообщения</SectionTitle>

      <div className="space-y-2">
        {items.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => void handleTap(n)}
            className={`sc-card p-4 w-full text-left active:scale-[0.99] transition-transform ${!n.isRead ? 'border-l-4 border-l-brand-600' : ''}`}
          >
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-brand-600 flex items-center justify-center shrink-0">
                {typeIcons[n.type] ?? <IconShift className="w-5 h-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2">
                  {!n.isRead && <span className="w-2 h-2 rounded-full bg-brand-600 mt-2 shrink-0" />}
                  <p className="font-semibold text-[15px] text-slate-900 flex-1">{n.title}</p>
                </div>
                <p className="text-[13px] text-slate-500 mt-1 leading-relaxed">{n.body}</p>
                <p className="text-[12px] text-slate-400 mt-2">{formatDateTime(n.createdAt)}</p>
              </div>
            </div>
          </button>
        ))}

        {!items.length && (
          <div className="sc-card">
            <EmptyState
              icon={<IconBell className="w-7 h-7" />}
              title="Уведомлений пока нет"
              description="Когда вы запишетесь на смену или получите выплату — сообщение появится здесь"
            />
          </div>
        )}

        {hasNextPage && (
          <Button
            variant="secondary"
            fullWidth
            loading={isFetchingNextPage}
            onClick={() => fetchNextPage()}
          >
            Загрузить ещё
          </Button>
        )}
      </div>
    </SubPageLayout>
  );
}
