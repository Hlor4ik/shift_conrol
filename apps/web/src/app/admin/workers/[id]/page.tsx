'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getUserStatusLabel, getDocumentStatusLabel } from '@shiftcontrol/shared';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import { QueryErrorBanner } from '@/components/QueryErrorBanner';

interface WorkerDetail {
  userId: string;
  fullName: string;
  phone: string;
  city: string;
  specialty: string;
  experience: number;
  rating: number;
  totalShifts: number;
  totalEarnings: string | number;
  birthDate: string;
  bankDetails?: { bankName?: string; accountNumber?: string; bik?: string } | null;
  documents?: {
    id: string;
    status: string;
    url: string;
    fileName?: string | null;
    rejectReason?: string | null;
    createdAt: string;
    reviewedAt?: string | null;
    reviewedByName?: string | null;
  }[];
  user?: {
    id: string;
    status: string;
    telegramUsername?: string;
    createdAt: string;
    verifiedAt?: string | null;
    verifiedByName?: string | null;
  };
}

export default function WorkerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const [ratingInput, setRatingInput] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['worker', id],
    queryFn: () => api<WorkerDetail>(`/workers/${id}`, { token: token! }),
    enabled: !!token && !!id,
  });

  const ratingMutation = useMutation({
    mutationFn: (rating: number) =>
      api(`/workers/${id}/rating`, {
        method: 'PATCH',
        token: token!,
        body: JSON.stringify({ rating }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker', id] });
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      setRatingInput('');
    },
  });

  const blockMutation = useMutation({
    mutationFn: () =>
      api(`/admin/users/${data!.user!.id}/block`, {
        method: 'PATCH',
        token: token!,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker', id] });
      queryClient.invalidateQueries({ queryKey: ['workers'] });
    },
  });

  const unblockMutation = useMutation({
    mutationFn: () =>
      api(`/admin/users/${data!.user!.id}/unblock`, {
        method: 'PATCH',
        token: token!,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker', id] });
      queryClient.invalidateQueries({ queryKey: ['workers'] });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: () => api(`/workers/${id}/verify`, { method: 'POST', token: token! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker', id] });
      queryClient.invalidateQueries({ queryKey: ['verification-pending'] });
      queryClient.invalidateQueries({ queryKey: ['workers'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () =>
      api(`/workers/${id}/reject`, {
        method: 'POST',
        token: token!,
        body: JSON.stringify({ reason: rejectReason }),
      }),
    onSuccess: () => {
      setRejectReason('');
      queryClient.invalidateQueries({ queryKey: ['worker', id] });
      queryClient.invalidateQueries({ queryKey: ['verification-pending'] });
    },
  });

  const actionError =
    ratingMutation.error ??
    blockMutation.error ??
    unblockMutation.error ??
    verifyMutation.error ??
    rejectMutation.error;

  if (isLoading) {
    return <div className="animate-pulse h-40 bg-gray-100 rounded-xl" />;
  }

  if (isError) {
    return (
      <QueryErrorBanner
        message={error instanceof Error ? error.message : undefined}
        onRetry={() => refetch()}
      />
    );
  }

  if (!data) return null;

  const isBlocked = data.user?.status === 'BLOCKED';

  return (
    <div className="space-y-6 max-w-2xl">
      <Link href="/admin/workers" className="text-sm text-gray-500 hover:text-brand-600">
        ← Работники
      </Link>

      <div className="flex justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold">{data.fullName}</h1>
          <p className="text-gray-500 mt-1">{data.specialty} · {data.city}</p>
          <span className="inline-block mt-2 px-2 py-1 rounded-full text-xs font-medium bg-gray-100">
            {getUserStatusLabel(data.user?.status ?? '')}
          </span>
        </div>
        {data.user && (
          <div className="flex gap-2">
            {isBlocked ? (
              <button
                type="button"
                onClick={() => unblockMutation.mutate()}
                disabled={unblockMutation.isPending}
                className="btn-secondary text-sm"
              >
                Разблокировать
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Заблокировать работника?')) blockMutation.mutate();
                }}
                disabled={blockMutation.isPending}
                className="btn-secondary text-sm text-red-600 border-red-200"
              >
                Заблокировать
              </button>
            )}
          </div>
        )}
      </div>

      {actionError && (
        <QueryErrorBanner
          message={actionError instanceof Error ? actionError.message : 'Ошибка операции'}
        />
      )}

      <div className="card p-6 grid grid-cols-2 gap-4 text-sm">
        <Info label="Телефон" value={data.phone} />
        <Info label="Telegram" value={data.user?.telegramUsername ? `@${data.user.telegramUsername}` : '—'} />
        <Info label="Рейтинг" value={String(data.rating)} />
        <Info label="Смен" value={String(data.totalShifts)} />
        <Info
          label="Заработано"
          value={`${Number(data.totalEarnings).toLocaleString('ru-RU')} ₽`}
        />
        <Info label="Опыт" value={`${data.experience} лет`} />
        <Info
          label="Дата рождения"
          value={new Date(data.birthDate).toLocaleDateString('ru-RU')}
        />
        <Info
          label="Зарегистрирован"
          value={
            data.user?.createdAt
              ? new Date(data.user.createdAt).toLocaleDateString('ru-RU')
              : '—'
          }
        />
        {data.user?.verifiedAt && (
          <>
            <Info
              label="Подтверждён"
              value={new Date(data.user.verifiedAt).toLocaleString('ru-RU')}
            />
            <Info label="Кем подтверждён" value={data.user.verifiedByName ?? '—'} />
          </>
        )}
      </div>

      {(data.user?.status === 'PENDING_VERIFICATION' ||
        (data.documents?.some((d) => d.status === 'PENDING'))) && (
        <div className="card p-6 space-y-3 border-amber-200 bg-amber-50">
          <h2 className="font-semibold text-amber-900">Проверка аккаунта</h2>
          <p className="text-sm text-amber-800">
            Работник не может записываться на смены до подтверждения документа.
          </p>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => verifyMutation.mutate()}
              disabled={verifyMutation.isPending || !data.documents?.some((d) => d.status === 'PENDING')}
              className="btn-primary text-sm"
            >
              Подтвердить аккаунт
            </button>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-amber-900">Причина отклонения</label>
            <textarea
              className="input-field w-full min-h-[72px]"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Укажите причину, если документ не подходит"
            />
            <button
              type="button"
              onClick={() => rejectMutation.mutate()}
              disabled={
                rejectMutation.isPending ||
                rejectReason.trim().length < 3 ||
                !data.documents?.some((d) => d.status === 'PENDING')
              }
              className="btn-secondary text-sm text-red-600"
            >
              Отклонить документ
            </button>
          </div>
        </div>
      )}

      {data.documents && data.documents.length > 0 && (
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold">Документы</h2>
          {data.documents.map((doc) => (
            <div key={doc.id} className="flex flex-wrap gap-4 border-b pb-4 last:border-0">
              <a href={doc.url} target="_blank" rel="noreferrer">
                <img
                  src={doc.url}
                  alt="Документ"
                  className="h-28 object-cover rounded-lg border"
                />
              </a>
              <div className="text-sm space-y-1">
                <p>
                  Статус:{' '}
                  <span className="font-medium">{getDocumentStatusLabel(doc.status)}</span>
                </p>
                <p>Загружен: {new Date(doc.createdAt).toLocaleString('ru-RU')}</p>
                {doc.reviewedAt && (
                  <p>
                    Проверен: {new Date(doc.reviewedAt).toLocaleString('ru-RU')}
                    {doc.reviewedByName ? ` · ${doc.reviewedByName}` : ''}
                  </p>
                )}
                {doc.rejectReason && (
                  <p className="text-red-600">Причина: {doc.rejectReason}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card p-6 space-y-3">
        <h2 className="font-semibold">Реквизиты для выплат</h2>
        {data.bankDetails?.bankName || data.bankDetails?.accountNumber || data.bankDetails?.bik ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <Info label="Банк" value={data.bankDetails.bankName ?? '—'} />
            <Info label="Счёт" value={data.bankDetails.accountNumber ?? '—'} />
            <Info label="БИК" value={data.bankDetails.bik ?? '—'} />
          </div>
        ) : (
          <p className="text-sm text-gray-500">Реквизиты не указаны</p>
        )}
      </div>

      <div className="card p-6 space-y-3">
        <h2 className="font-semibold">Корректировка рейтинга</h2>
        <p className="text-sm text-gray-500">Текущий рейтинг: {data.rating}</p>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-sm font-medium">Новый рейтинг (0–200)</label>
            <input
              type="number"
              min={0}
              max={200}
              className="input-field mt-1"
              value={ratingInput}
              onChange={(e) => setRatingInput(e.target.value)}
              placeholder={String(data.rating)}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              const rating = parseFloat(ratingInput);
              if (Number.isNaN(rating) || rating < 0 || rating > 200) return;
              ratingMutation.mutate(rating);
            }}
            disabled={ratingMutation.isPending || !ratingInput}
            className="btn-primary"
          >
            {ratingMutation.isPending ? 'Сохранение...' : 'Применить'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-gray-500 text-xs">{label}</p>
      <p className="font-medium mt-0.5">{value}</p>
    </div>
  );
}
