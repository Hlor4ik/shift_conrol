'use client';

import { Fragment, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getPaymentStatusLabel } from '@shiftcontrol/shared';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import { QueryErrorBanner } from '@/components/QueryErrorBanner';
import { useToast } from '@/components/Toast';

interface BankDetails {
  bankName?: string;
  accountNumber?: string;
  bik?: string;
}

interface Payment {
  id: string;
  amount: string;
  status: string;
  paidAt?: string | null;
  comment?: string | null;
  shiftId: string;
  worker?: {
    workerProfile?: {
      fullName: string;
      phone?: string;
      bankDetails?: BankDetails | null;
    };
  };
  shift?: { id: string; title: string; date: string };
  paidBy?: {
    email?: string;
    managerProfile?: { fullName: string };
  } | null;
}

interface ShiftOption {
  id: string;
  title: string;
  date: string;
  status: string;
}

function formatBankDetails(bd: BankDetails | null | undefined): string {
  if (!bd) return '—';
  const parts: string[] = [];
  if (bd.bankName) parts.push(bd.bankName);
  if (bd.accountNumber) parts.push(`счёт ${bd.accountNumber}`);
  if (bd.bik) parts.push(`БИК ${bd.bik}`);
  return parts.length ? parts.join(', ') : '—';
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ru-RU');
}

function confirmerName(p: Payment): string {
  if (!p.paidBy) return '—';
  return p.paidBy.managerProfile?.fullName ?? p.paidBy.email ?? '—';
}

export default function PaymentsPage() {
  const { token, companyId } = useAuthStore();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [statusFilter, setStatusFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const params = new URLSearchParams();
  if (statusFilter) params.set('status', statusFilter);
  if (shiftFilter) params.set('shiftId', shiftFilter);
  const queryString = params.toString();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['payments', companyId, statusFilter, shiftFilter],
    queryFn: () =>
      api<{ items: Payment[] }>(`/payments${queryString ? `?${queryString}` : ''}`, {
        token: token!,
        companyId: companyId ?? undefined,
      }),
    enabled: !!token,
  });

  const { data: shifts } = useQuery({
    queryKey: ['shifts', companyId],
    queryFn: () =>
      api<{ items: ShiftOption[] }>('/shifts?limit=100', {
        token: token!,
        companyId: companyId ?? undefined,
      }),
    enabled: !!token,
  });

  const markPaidMutation = useMutation({
    mutationFn: (id: string) =>
      api(`/payments/${id}`, {
        method: 'PATCH',
        token: token!,
        companyId: companyId ?? undefined,
        body: JSON.stringify({ status: 'PAID' }),
      }),
    onSuccess: () => {
      showToast('Выплата подтверждена');
      queryClient.invalidateQueries({ queryKey: ['payments', companyId] });
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  const bulkMutation = useMutation({
    mutationFn: (shiftId: string) =>
      api(`/payments/bulk/${shiftId}`, {
        method: 'POST',
        token: token!,
        companyId: companyId ?? undefined,
      }),
    onSuccess: () => {
      showToast('Выплаты созданы');
      queryClient.invalidateQueries({ queryKey: ['payments', companyId] });
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  const shiftIdsInPayments = new Set(data?.items.map((p) => p.shiftId) ?? []);
  const bulkShiftOptions = (shifts?.items ?? []).filter(
    (s) => shiftFilter === s.id || ['COMPLETED', 'IN_PROGRESS'].includes(s.status),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Выплаты</h1>
        <p className="text-sm text-gray-500 mt-1">
          Подтверждение фиксирует кто и когда отметил выплату. Уведомления приходят в Telegram-бот.
        </p>
      </div>

      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="text-sm font-medium">Статус</label>
          <select
            className="input-field mt-1 min-w-[160px]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Все</option>
            <option value="PENDING">Ожидает</option>
            <option value="PROCESSING">В обработке</option>
            <option value="PAID">Выплачена</option>
            <option value="CANCELLED">Отменена</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Смена</label>
          <select
            className="input-field mt-1 min-w-[220px]"
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
          >
            <option value="">Все смены</option>
            {shifts?.items.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} ({new Date(s.date).toLocaleDateString('ru-RU')})
              </option>
            ))}
          </select>
        </div>
        {shiftFilter && (
          <button
            type="button"
            onClick={() => bulkMutation.mutate(shiftFilter)}
            disabled={bulkMutation.isPending}
            className="btn-primary"
          >
            {bulkMutation.isPending ? 'Создание...' : 'Создать выплаты для смены'}
          </button>
        )}
      </div>

      {isError && (
        <QueryErrorBanner
          message={error instanceof Error ? error.message : undefined}
          onRetry={() => refetch()}
        />
      )}

      {(markPaidMutation.isError || bulkMutation.isError) && (
        <QueryErrorBanner
          message={
            (markPaidMutation.error ?? bulkMutation.error) instanceof Error
              ? (markPaidMutation.error ?? bulkMutation.error)?.message
              : 'Ошибка операции'
          }
        />
      )}

      {!shiftFilter && bulkShiftOptions.length > 0 && (
        <div className="card p-4 space-y-2">
          <p className="text-sm font-medium text-gray-700">Массовое создание выплат по сменам</p>
          <div className="flex flex-wrap gap-2">
            {bulkShiftOptions.slice(0, 8).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => bulkMutation.mutate(s.id)}
                disabled={bulkMutation.isPending}
                className="btn-secondary text-xs"
              >
                {s.title}
                {shiftIdsInPayments.has(s.id) ? '' : ' (+)'}
              </button>
            ))}
          </div>
        </div>
      )}

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
                <th className="text-left p-4">Подтверждение</th>
                <th className="text-left p-4"></th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((p) => (
                <Fragment key={p.id}>
                  <tr className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      <button
                        type="button"
                        className="text-left hover:text-brand-600"
                        onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                      >
                        {p.worker?.workerProfile?.fullName ?? '—'}
                        <span className="block text-xs text-gray-400">
                          {p.worker?.workerProfile?.phone}
                        </span>
                      </button>
                    </td>
                    <td className="p-4">{p.shift?.title ?? '—'}</td>
                    <td className="p-4 font-medium">{Number(p.amount).toLocaleString('ru-RU')} ₽</td>
                    <td className="p-4">{getPaymentStatusLabel(p.status)}</td>
                    <td className="p-4 text-xs text-gray-600">
                      {p.status === 'PAID' ? (
                        <>
                          <span className="block">{confirmerName(p)}</span>
                          <span className="text-gray-400">{formatDateTime(p.paidAt)}</span>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-4">
                      {p.status === 'PENDING' && (
                        <button
                          type="button"
                          onClick={() => markPaidMutation.mutate(p.id)}
                          disabled={markPaidMutation.isPending}
                          className="text-brand-600 text-xs font-medium"
                        >
                          Выплатить
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandedId === p.id && (
                    <tr className="bg-gray-50 border-b">
                      <td colSpan={6} className="p-4 text-xs text-gray-600 space-y-1">
                        <p>
                          <span className="font-medium text-gray-700">Реквизиты:</span>{' '}
                          {formatBankDetails(p.worker?.workerProfile?.bankDetails)}
                        </p>
                        {p.comment && (
                          <p>
                            <span className="font-medium text-gray-700">Комментарий:</span> {p.comment}
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
          {!data?.items.length && (
            <p className="text-center text-gray-500 py-8">Нет выплат</p>
          )}
        </div>
      )}
    </div>
  );
}
