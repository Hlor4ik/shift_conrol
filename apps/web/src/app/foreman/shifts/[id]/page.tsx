'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import { QueryErrorBanner } from '@/components/QueryErrorBanner';

const STATUSES = [
  { value: 'PRESENT', label: 'Пришёл' },
  { value: 'ABSENT', label: 'Не пришёл' },
  { value: 'LATE', label: 'Опоздал' },
  { value: 'LEFT_EARLY', label: 'Ушёл раньше' },
  { value: 'FULL_SHIFT', label: 'Отработал полностью' },
];

export default function ForemanShiftDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuthStore();
  const [items, setItems] = useState<Record<string, AttendanceItem>>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const {
    data: shift,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['shift', id],
    queryFn: () => api<ShiftDetail>(`/shifts/${id}`, { token: token! }),
    enabled: !!token && !!id,
  });

  useEffect(() => {
    if (!shift?.applications) return;
    const prefilled: Record<string, AttendanceItem> = {};
    for (const app of shift.applications) {
      const attendance = app.attendance;
      const rating = app.rating;
      prefilled[app.id] = {
        applicationId: app.id,
        status: attendance?.status ?? '',
        stars: rating?.stars ?? 0,
        comment: rating?.comment ?? '',
        isBestWorker: rating?.isBestWorker ?? false,
      };
    }
    setItems(prefilled);
  }, [shift]);

  const update = (appId: string, field: string, value: unknown) => {
    setSubmitSuccess(false);
    setItems((prev) => ({
      ...prev,
      [appId]: { ...prev[appId], applicationId: appId, [field]: value },
    }));
  };

  const isCompleted = shift?.status === 'COMPLETED';

  const submit = async () => {
    setSubmitError('');
    setSubmitSuccess(false);

    const payload = Object.values(items).filter((i) => i.status);
    if (!payload.length) {
      setSubmitError('Укажите статус посещаемости хотя бы для одного работника');
      return;
    }

    setSaving(true);
    try {
      if (shift?.status === 'PUBLISHED') {
        await api(`/shifts/${id}/start`, { method: 'POST', token: token! });
      }

      await api('/foreman/attendance', {
        method: 'POST',
        token: token!,
        body: JSON.stringify({ shiftId: id, items: payload }),
      });

      setSubmitSuccess(true);
      await refetch();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <div className="animate-pulse h-40 bg-gray-100 rounded-xl" />;

  if (isError || !shift) {
    return (
      <div className="space-y-4">
        <QueryErrorBanner onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">{shift.title}</h2>
      <p className="text-gray-500">
        {new Date(shift.date).toLocaleDateString('ru-RU')} · {shift.applications?.length ?? 0} работников
      </p>

      {submitError && <QueryErrorBanner message={submitError} />}
      {submitSuccess && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Посещаемость сохранена
        </div>
      )}

      <div className="space-y-4">
        {shift.applications?.map((app) => (
          <div key={app.id} className="card p-5 space-y-3">
            <p className="font-semibold">{app.worker?.workerProfile?.fullName}</p>
            <select
              className="input-field"
              value={items[app.id]?.status ?? ''}
              disabled={isCompleted}
              onChange={(e) => update(app.id, 'status', e.target.value)}
            >
              <option value="">Статус посещаемости</option>
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <div>
              <label className="text-sm text-gray-500">Оценка</label>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    disabled={isCompleted}
                    onClick={() => update(app.id, 'stars', star)}
                    className="text-2xl hover:scale-110 transition disabled:opacity-50"
                  >
                    {(items[app.id]?.stars ?? 0) >= star ? '★' : '☆'}
                  </button>
                ))}
              </div>
            </div>
            <input
              className="input-field"
              placeholder="Комментарий"
              value={items[app.id]?.comment ?? ''}
              disabled={isCompleted}
              onChange={(e) => update(app.id, 'comment', e.target.value)}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={items[app.id]?.isBestWorker ?? false}
                disabled={isCompleted}
                onChange={(e) => update(app.id, 'isBestWorker', e.target.checked)}
              />
              Лучший работник смены
            </label>
          </div>
        ))}
      </div>

      <button
        onClick={submit}
        disabled={saving || isCompleted}
        className="btn-primary w-full disabled:opacity-50"
      >
        {isCompleted ? 'Смена завершена' : saving ? 'Сохранение...' : 'Завершить смену'}
      </button>
    </div>
  );
}

interface AttendanceItem {
  applicationId: string;
  status?: string;
  stars?: number;
  comment?: string;
  isBestWorker?: boolean;
}

interface ShiftDetail {
  id: string;
  title: string;
  date: string;
  status: string;
  applications?: Array<{
    id: string;
    worker?: { workerProfile?: { fullName: string } };
    attendance?: { status: string } | null;
    rating?: { stars?: number; comment?: string; isBestWorker?: boolean } | null;
  }>;
}
