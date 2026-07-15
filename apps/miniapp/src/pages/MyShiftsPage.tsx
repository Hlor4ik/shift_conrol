import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  CANCEL_LESS_24H_PENALTY,
  attendanceStatusLabel,
  paymentStatusLabel,
} from '@shiftcontrol/shared';
import { api } from '../lib/api';
import { useToken } from '../lib/auth';
import { formatDateShort, formatMoney } from '../lib/format';
import { confirmAction } from '../lib/telegram';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Badge, attendanceStatusVariant, paymentStatusVariant } from '../components/ui/Badge';
import { SectionTitle } from '../components/ui/SectionTitle';
import { SkeletonList } from '../components/ui/Skeleton';
import { QueryErrorBanner } from '../components/ui/QueryErrorBanner';
import { EmptyState } from '../components/ui/EmptyState';
import { IconBriefcase, IconCalendar, IconChevronRight, IconCheckCircle } from '../components/icons';

interface ShiftInfo {
  id: string;
  title: string;
  date: string;
  startTime: string;
  cost: string;
  status: string;
  address?: string;
}

interface MyShiftApplication {
  id: string;
  shift: ShiftInfo;
  attendance?: { status: string } | null;
  payment?: { status: string; amount: string } | null;
}

export default function MyShiftsPage() {
  const token = useToken();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const upcoming = useQuery({
    queryKey: ['my-shifts-upcoming'],
    queryFn: () =>
      api<MyShiftApplication[]>('/workers/me/shifts?upcoming=true', { token: token! }),
    enabled: !!token,
  });

  const past = useQuery({
    queryKey: ['my-shifts-past'],
    queryFn: () =>
      api<MyShiftApplication[]>('/workers/me/shifts?upcoming=false', { token: token! }),
    enabled: !!token,
  });

  const cancel = useMutation({
    mutationFn: (shiftId: string) =>
      api<{ penaltyApplied?: boolean; penaltyPoints?: number }>(`/shifts/${shiftId}/apply`, {
        method: 'DELETE',
        token: token!,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-shifts-upcoming'] });
      queryClient.invalidateQueries({ queryKey: ['my-shifts-past'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['shifts-available'] });
      queryClient.invalidateQueries({ queryKey: ['shift'] });
    },
    onSettled: () => setCancelingId(null),
  });

  const handleCancel = async (shiftId: string, shiftDate: string) => {
    const hoursUntil = (new Date(shiftDate).getTime() - Date.now()) / (1000 * 60 * 60);
    const cancelPenaltyApplies = hoursUntil < 24 && hoursUntil > 0;
    const message = cancelPenaltyApplies
      ? `Отмена менее чем за 24 часа до смены: ${CANCEL_LESS_24H_PENALTY} баллов к рейтингу. Продолжить?`
      : 'Отменить запись на эту смену?';
    if (await confirmAction(message)) {
      setCancelingId(shiftId);
      cancel.mutate(shiftId);
    }
  };

  if (upcoming.isLoading || past.isLoading) return <SkeletonList count={3} />;

  if (upcoming.isError || past.isError) {
    return (
      <div className="page pt-2">
        <PageHeader title="Мои смены" />
        <QueryErrorBanner
          onRetry={() => {
            void upcoming.refetch();
            void past.refetch();
          }}
        />
      </div>
    );
  }

  const upcomingItems = upcoming.data ?? [];
  const pastItems = past.data ?? [];

  return (
    <div className="page pt-2">
      <PageHeader title="Мои смены" subtitle="Предстоящие и завершённые" />

      <div className="grid grid-cols-2 gap-3">
        <div className="sc-card p-4 text-center">
          <p className="text-[26px] font-bold text-brand-600">{upcomingItems.length}</p>
          <p className="text-[12px] text-slate-500 mt-1">Предстоящих</p>
        </div>
        <div className="sc-card p-4 text-center">
          <p className="text-[26px] font-bold text-slate-900">{pastItems.length}</p>
          <p className="text-[12px] text-slate-500 mt-1">Завершённых</p>
        </div>
      </div>

      <section className="space-y-3">
        <SectionTitle>Предстоящие</SectionTitle>
        <ShiftList
          items={upcomingItems}
          onCancel={handleCancel}
          showCancel
          cancelingId={cancelingId}
          showCheckIn
          emptyTitle="Нет предстоящих смен"
          emptyDescription="Запишитесь на смену из каталога"
          emptyAction={() => navigate('/shifts')}
          emptyActionLabel="Найти смену"
        />
      </section>

      <section className="space-y-3">
        <SectionTitle>Прошедшие</SectionTitle>
        <ShiftList
          items={pastItems}
          emptyTitle="История пуста"
          emptyDescription="Завершённые смены появятся здесь"
        />
      </section>
    </div>
  );
}

function ShiftList({
  items,
  onCancel,
  showCancel,
  cancelingId,
  showCheckIn,
  emptyTitle,
  emptyDescription,
  emptyAction,
  emptyActionLabel,
}: {
  items: MyShiftApplication[];
  onCancel?: (shiftId: string, shiftDate: string) => void;
  showCancel?: boolean;
  cancelingId?: string | null;
  showCheckIn?: boolean;
  emptyTitle: string;
  emptyDescription: string;
  emptyAction?: () => void;
  emptyActionLabel?: string;
}) {
  const navigate = useNavigate();

  if (!items.length) {
    return (
      <div className="sc-card">
        <EmptyState
          icon={<IconBriefcase className="w-6 h-6" />}
          title={emptyTitle}
          description={emptyDescription}
          actionLabel={emptyActionLabel}
          onAction={emptyAction}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((app) => (
        <div key={app.id} className="sc-card p-4">
          <Link to={`/shifts/${app.shift.id}`} className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-bold text-[15px] text-slate-900">{app.shift.title}</p>
              <div className="flex items-center gap-2 mt-1.5 text-[13px] text-slate-500">
                <IconCalendar className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {formatDateShort(app.shift.date)} · {app.shift.startTime}
                </span>
              </div>
              <p className="text-brand-600 font-bold mt-2">{formatMoney(app.shift.cost)}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {app.attendance?.status && (
                  <Badge variant={attendanceStatusVariant[app.attendance.status] ?? 'default'}>
                    {attendanceStatusLabel[app.attendance.status] ?? app.attendance.status}
                  </Badge>
                )}
                {app.payment?.status && (
                  <Badge variant={paymentStatusVariant[app.payment.status] ?? 'default'}>
                    {paymentStatusLabel[app.payment.status] ?? app.payment.status}
                  </Badge>
                )}
              </div>
            </div>
            <IconChevronRight className="w-5 h-5 text-slate-400 shrink-0 mt-1" />
          </Link>
          {showCheckIn && (
            <Button
              fullWidth
              className="mt-3 !py-2.5 text-sm gap-2"
              onClick={() => navigate(`/checkin/${app.shift.id}`)}
            >
              <IconCheckCircle className="w-4 h-4" />
              Отметиться на смене
            </Button>
          )}
          {showCancel && onCancel && (
            <Button
              variant="danger"
              fullWidth
              className="mt-3 !py-2.5 text-sm"
              loading={cancelingId === app.shift.id}
              onClick={() => onCancel(app.shift.id, app.shift.date)}
            >
              Отменить запись
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
