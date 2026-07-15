'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getDocumentStatusLabel } from '@shiftcontrol/shared';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import { QueryErrorBanner } from '@/components/QueryErrorBanner';
import { useToast } from '@/components/Toast';

interface PendingWorker {
  userId: string;
  fullName: string;
  phone: string;
  city: string;
  specialty: string;
  createdAt: string;
  document: {
    id: string;
    status: string;
    url: string;
    fileName: string | null;
    createdAt: string;
  } | null;
}

export default function VerificationPage() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['verification-pending'],
    queryFn: () =>
      api<{ items: PendingWorker[]; total: number }>('/workers/verification/pending', {
        token: token!,
      }),
    enabled: !!token,
  });

  const verifyMutation = useMutation({
    mutationFn: (userId: string) =>
      api(`/workers/${userId}/verify`, { method: 'POST', token: token! }),
    onSuccess: () => {
      showToast('Работник подтверждён');
      queryClient.invalidateQueries({ queryKey: ['verification-pending'] });
      queryClient.invalidateQueries({ queryKey: ['workers'] });
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      api(`/workers/${userId}/reject`, {
        method: 'POST',
        token: token!,
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      showToast('Документ отклонён');
      setRejectId(null);
      setRejectReason('');
      queryClient.invalidateQueries({ queryKey: ['verification-pending'] });
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Проверка работников</h1>
        <p className="text-sm text-gray-500 mt-1">
          Работник не может записываться на смены, пока аккаунт и документ не подтверждены.
        </p>
      </div>

      {isError && (
        <QueryErrorBanner
          message={error instanceof Error ? error.message : undefined}
          onRetry={() => refetch()}
        />
      )}

      {isLoading ? (
        <div className="animate-pulse h-40 bg-gray-100 rounded-xl" />
      ) : !data?.items.length ? (
        <div className="card p-8 text-center text-gray-500">
          Нет работников, ожидающих проверки
        </div>
      ) : (
        <div className="space-y-4">
          {data.items.map((w) => (
            <div key={w.userId} className="card p-5 space-y-4">
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <Link
                    href={`/admin/workers/${w.userId}`}
                    className="font-semibold text-lg hover:text-brand-600"
                  >
                    {w.fullName}
                  </Link>
                  <p className="text-sm text-gray-500">
                    {w.phone} · {w.city} · {w.specialty}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Зарегистрирован: {new Date(w.createdAt).toLocaleString('ru-RU')}
                  </p>
                </div>
                <div className="flex gap-2 items-start">
                  {w.document?.status === 'PENDING' && (
                    <>
                      <button
                        type="button"
                        onClick={() => verifyMutation.mutate(w.userId)}
                        disabled={verifyMutation.isPending}
                        className="btn-primary text-sm"
                      >
                        Подтвердить
                      </button>
                      <button
                        type="button"
                        onClick={() => setRejectId(w.userId)}
                        className="btn-secondary text-sm text-red-600"
                      >
                        Отклонить
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Документ</p>
                {!w.document ? (
                  <p className="text-sm text-amber-600">Документ ещё не загружен</p>
                ) : (
                  <div className="flex flex-wrap gap-4 items-start">
                    <a href={w.document.url} target="_blank" rel="noreferrer">
                      <img
                        src={w.document.url}
                        alt="Документ"
                        className="h-32 w-auto max-w-[200px] object-cover rounded-lg border"
                      />
                    </a>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>
                        Статус:{' '}
                        <span className="font-medium">
                          {getDocumentStatusLabel(w.document.status)}
                        </span>
                      </p>
                      {w.document.fileName && <p>Файл: {w.document.fileName}</p>}
                      <p>
                        Загружен:{' '}
                        {new Date(w.document.createdAt).toLocaleString('ru-RU')}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {rejectId === w.userId && (
                <div className="border-t pt-4 space-y-2">
                  <label className="text-sm font-medium">Причина отклонения</label>
                  <textarea
                    className="input-field w-full min-h-[80px]"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Например: нечитаемое фото паспорта"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        rejectMutation.mutate({ userId: w.userId, reason: rejectReason })
                      }
                      disabled={rejectMutation.isPending || rejectReason.trim().length < 3}
                      className="btn-secondary text-sm text-red-600"
                    >
                      Отправить отклонение
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRejectId(null);
                        setRejectReason('');
                      }}
                      className="text-sm text-gray-500"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
