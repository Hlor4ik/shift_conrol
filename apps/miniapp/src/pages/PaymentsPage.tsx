import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useToken } from '../lib/auth';
import { formatDateShort, formatMoney } from '../lib/format';
import { SubPageLayout } from '../components/layout/SubPageLayout';
import { Badge, paymentStatusLabel, paymentStatusVariant } from '../components/ui/Badge';
import { SectionTitle } from '../components/ui/SectionTitle';
import { SkeletonList } from '../components/ui/Skeleton';
import { QueryErrorBanner } from '../components/ui/QueryErrorBanner';
import { EmptyState } from '../components/ui/EmptyState';
import { IconWallet } from '../components/icons';

interface Payment {
  id: string;
  amount: string;
  status: string;
  paidAt: string | null;
  shift: { title: string; date: string };
}

export default function PaymentsPage() {
  const token = useToken();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['payments'],
    queryFn: () => api<Payment[]>('/workers/me/payments', { token: token! }),
    enabled: !!token,
  });

  if (isLoading) return <SkeletonList count={3} height="h-24" />;

  if (isError) {
    return (
      <SubPageLayout title="Выплаты">
        <QueryErrorBanner onRetry={() => refetch()} />
      </SubPageLayout>
    );
  }

  const payments = data ?? [];
  const totalPaid = payments.filter((p) => p.status === 'PAID').reduce((s, p) => s + Number(p.amount), 0);
  const totalPending = payments
    .filter((p) => p.status === 'PENDING' || p.status === 'PROCESSING')
    .reduce((s, p) => s + Number(p.amount), 0);

  return (
    <SubPageLayout title="Выплаты">
      <p className="text-[13px] text-slate-500 -mt-1">История начислений и переводов</p>

      <div className="grid grid-cols-2 gap-3">
        <div className="sc-card p-4">
          <p className="text-[12px] text-slate-500">Выплачено</p>
          <p className="text-[22px] font-bold text-brand-600 mt-1">{formatMoney(totalPaid)}</p>
        </div>
        <div className="sc-card p-4">
          <p className="text-[12px] text-slate-500">В обработке</p>
          <p className="text-[22px] font-bold text-slate-900 mt-1">{formatMoney(totalPending)}</p>
        </div>
      </div>

      <SectionTitle>История</SectionTitle>

      <div className="space-y-3">
        {payments.map((p) => (
          <div key={p.id} className="sc-card p-4">
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0">
                <p className="font-bold text-[15px] text-slate-900 truncate">{p.shift.title}</p>
                <p className="text-[13px] text-slate-500 mt-1">{formatDateShort(p.shift.date)}</p>
                <p className="text-[12px] text-slate-400 mt-1">
                  {p.paidAt ? `Выплачено: ${formatDateShort(p.paidAt)}` : 'Ожидает перевода'}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-[18px] text-brand-600">{formatMoney(p.amount)}</p>
                <Badge variant={paymentStatusVariant[p.status] ?? 'default'} className="mt-1.5">
                  {paymentStatusLabel[p.status] ?? p.status}
                </Badge>
              </div>
            </div>
          </div>
        ))}

        {!payments.length && (
          <div className="sc-card">
            <EmptyState
              icon={<IconWallet className="w-7 h-7" />}
              title="Выплат пока нет"
              description="После завершения смен начисления появятся здесь"
            />
          </div>
        )}
      </div>
    </SubPageLayout>
  );
}
