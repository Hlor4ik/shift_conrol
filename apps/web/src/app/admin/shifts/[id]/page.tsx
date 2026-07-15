'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getApplicationStatusLabel, getShiftStatusLabel } from '@shiftcontrol/shared';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import { QueryErrorBanner } from '@/components/QueryErrorBanner';

interface ShiftDetail {
  id: string;
  title: string;
  address: string;
  date: string;
  startTime: string;
  endTime: string;
  cost: string | number;
  maxWorkers: number;
  bookedWorkers: number;
  minRating: number;
  description?: string;
  requirements?: string;
  status: string;
  object?: { id: string; name: string };
  foreman?: { id: string; foremanProfile?: { fullName: string } };
}

interface Application {
  id: string;
  status: string;
  createdAt: string;
  worker?: {
    id: string;
    workerProfile?: { fullName: string; phone: string; rating: number };
  };
}

export default function ShiftDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { token, companyId } = useAuthStore();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: '',
    address: '',
    date: '',
    startTime: '',
    endTime: '',
    cost: '',
    maxWorkers: '',
    minRating: '',
    description: '',
    requirements: '',
  });

  const shiftQuery = useQuery({
    queryKey: ['shift', id, companyId],
    queryFn: () =>
      api<ShiftDetail>(`/shifts/${id}`, {
        token: token!,
        companyId: companyId ?? undefined,
      }),
    enabled: !!token && !!id,
  });

  const applicationsQuery = useQuery({
    queryKey: ['shift-applications', id, companyId],
    queryFn: () =>
      api<Application[]>(`/shifts/${id}/applications`, {
        token: token!,
        companyId: companyId ?? undefined,
      }),
    enabled: !!token && !!id,
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      api(`/shifts/${id}`, {
        method: 'PATCH',
        token: token!,
        companyId: companyId ?? undefined,
        body: JSON.stringify({
          title: form.title,
          address: form.address,
          date: form.date,
          startTime: form.startTime,
          endTime: form.endTime,
          cost: parseFloat(form.cost),
          maxWorkers: parseInt(form.maxWorkers, 10),
          minRating: parseFloat(form.minRating),
          description: form.description || undefined,
          requirements: form.requirements || undefined,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift', id, companyId] });
      queryClient.invalidateQueries({ queryKey: ['shifts', companyId] });
      setEditing(false);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () =>
      api(`/shifts/${id}/cancel`, {
        method: 'POST',
        token: token!,
        companyId: companyId ?? undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift', id, companyId] });
      queryClient.invalidateQueries({ queryKey: ['shifts', companyId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      api(`/shifts/${id}`, {
        method: 'DELETE',
        token: token!,
        companyId: companyId ?? undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts', companyId] });
      router.push('/admin/shifts');
    },
  });

  const publishMutation = useMutation({
    mutationFn: () =>
      api(`/shifts/${id}/publish`, {
        method: 'POST',
        token: token!,
        companyId: companyId ?? undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift', id, companyId] });
      queryClient.invalidateQueries({ queryKey: ['shifts', companyId] });
    },
  });

  const startEdit = () => {
    const shift = shiftQuery.data;
    if (!shift) return;
    setForm({
      title: shift.title,
      address: shift.address,
      date: shift.date.slice(0, 10),
      startTime: shift.startTime,
      endTime: shift.endTime,
      cost: String(shift.cost),
      maxWorkers: String(shift.maxWorkers),
      minRating: String(shift.minRating),
      description: shift.description ?? '',
      requirements: shift.requirements ?? '',
    });
    setEditing(true);
  };

  const shift = shiftQuery.data;
  const canEdit = shift && !['COMPLETED', 'CANCELLED'].includes(shift.status);
  const canCancel = shift && shift.status !== 'COMPLETED' && shift.status !== 'CANCELLED';
  const canDelete = shift && shift.status !== 'IN_PROGRESS';

  if (shiftQuery.isLoading) {
    return <div className="animate-pulse h-40 bg-gray-100 rounded-xl" />;
  }

  if (shiftQuery.isError) {
    return (
      <QueryErrorBanner
        message={shiftQuery.error instanceof Error ? shiftQuery.error.message : undefined}
        onRetry={() => shiftQuery.refetch()}
      />
    );
  }

  if (!shift) return null;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3 text-sm text-gray-500">
        <Link href="/admin/shifts" className="hover:text-brand-600">
          ← Смены
        </Link>
      </div>

      <div className="flex justify-between items-start gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{shift.title}</h1>
          <p className="text-gray-500 mt-1">
            {new Date(shift.date).toLocaleDateString('ru-RU')} · {shift.startTime}–{shift.endTime}
          </p>
          <span className="inline-block mt-2 px-2 py-1 rounded-full text-xs font-medium bg-gray-100">
            {getShiftStatusLabel(shift.status)}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {shift.status === 'DRAFT' && (
            <button
              type="button"
              onClick={() => publishMutation.mutate()}
              disabled={publishMutation.isPending}
              className="btn-primary text-sm"
            >
              Опубликовать
            </button>
          )}
          {canEdit && !editing && (
            <button type="button" onClick={startEdit} className="btn-secondary text-sm">
              Редактировать
            </button>
          )}
          {canCancel && (
            <button
              type="button"
              onClick={() => {
                if (confirm('Отменить смену?')) cancelMutation.mutate();
              }}
              disabled={cancelMutation.isPending}
              className="btn-secondary text-sm text-red-600 border-red-200"
            >
              Отменить
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={() => {
                if (confirm('Удалить смену?')) deleteMutation.mutate();
              }}
              disabled={deleteMutation.isPending}
              className="btn-secondary text-sm text-red-600 border-red-200"
            >
              Удалить
            </button>
          )}
        </div>
      </div>

      {(updateMutation.isError || cancelMutation.isError || deleteMutation.isError) && (
        <QueryErrorBanner
          message={
            (updateMutation.error ?? cancelMutation.error ?? deleteMutation.error) instanceof Error
              ? (updateMutation.error ?? cancelMutation.error ?? deleteMutation.error)?.message
              : 'Ошибка операции'
          }
        />
      )}

      {editing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateMutation.mutate();
          }}
          className="card p-6 space-y-4"
        >
          <h2 className="font-semibold">Редактирование смены</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Название">
              <input
                className="input-field"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
            </Field>
            <Field label="Адрес">
              <input
                className="input-field"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                required
              />
            </Field>
            <Field label="Дата">
              <input
                type="date"
                className="input-field"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                required
              />
            </Field>
            <Field label="Начало">
              <input
                type="time"
                className="input-field"
                value={form.startTime}
                onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                required
              />
            </Field>
            <Field label="Конец">
              <input
                type="time"
                className="input-field"
                value={form.endTime}
                onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                required
              />
            </Field>
            <Field label="Стоимость (₽)">
              <input
                type="number"
                className="input-field"
                value={form.cost}
                onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
                required
              />
            </Field>
            <Field label="Кол-во работников">
              <input
                type="number"
                className="input-field"
                value={form.maxWorkers}
                onChange={(e) => setForm((f) => ({ ...f, maxWorkers: e.target.value }))}
                required
              />
            </Field>
            <Field label="Мин. рейтинг">
              <input
                type="number"
                className="input-field"
                value={form.minRating}
                onChange={(e) => setForm((f) => ({ ...f, minRating: e.target.value }))}
              />
            </Field>
          </div>
          <Field label="Описание">
            <textarea
              className="input-field"
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </Field>
          <Field label="Что взять с собой">
            <textarea
              className="input-field"
              rows={2}
              value={form.requirements}
              onChange={(e) => setForm((f) => ({ ...f, requirements: e.target.value }))}
            />
          </Field>
          <div className="flex gap-3">
            <button type="submit" disabled={updateMutation.isPending} className="btn-primary">
              {updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="btn-secondary">
              Отмена
            </button>
          </div>
        </form>
      ) : (
        <div className="card p-6 grid grid-cols-2 gap-4 text-sm">
          <Info label="Адрес" value={shift.address} />
          <Info label="Объект" value={shift.object?.name ?? '—'} />
          <Info label="Бригадир" value={shift.foreman?.foremanProfile?.fullName ?? '—'} />
          <Info
            label="Стоимость"
            value={`${Number(shift.cost).toLocaleString('ru-RU')} ₽`}
          />
          <Info label="Записано" value={`${shift.bookedWorkers} / ${shift.maxWorkers}`} />
          <Info label="Мин. рейтинг" value={String(shift.minRating)} />
          {shift.description && <Info label="Описание" value={shift.description} className="col-span-2" />}
          {shift.requirements && (
            <Info label="Что взять" value={shift.requirements} className="col-span-2" />
          )}
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">
          Заявки ({applicationsQuery.data?.length ?? 0})
        </h2>
        {applicationsQuery.isError && (
          <QueryErrorBanner
            message={
              applicationsQuery.error instanceof Error
                ? applicationsQuery.error.message
                : undefined
            }
            onRetry={() => applicationsQuery.refetch()}
          />
        )}
        {applicationsQuery.isLoading ? (
          <div className="animate-pulse h-24 bg-gray-100 rounded-xl" />
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4">Работник</th>
                  <th className="text-left p-4">Телефон</th>
                  <th className="text-left p-4">Рейтинг</th>
                  <th className="text-left p-4">Статус</th>
                  <th className="text-left p-4">Дата заявки</th>
                </tr>
              </thead>
              <tbody>
                {applicationsQuery.data?.map((app) => (
                  <tr key={app.id} className="border-b hover:bg-gray-50">
                    <td className="p-4 font-medium">
                      {app.worker?.id ? (
                        <Link
                          href={`/admin/workers/${app.worker.id}`}
                          className="text-brand-600 hover:underline"
                        >
                          {app.worker.workerProfile?.fullName ?? '—'}
                        </Link>
                      ) : (
                        (app.worker?.workerProfile?.fullName ?? '—')
                      )}
                    </td>
                    <td className="p-4">{app.worker?.workerProfile?.phone ?? '—'}</td>
                    <td className="p-4">{app.worker?.workerProfile?.rating ?? '—'}</td>
                    <td className="p-4">{getApplicationStatusLabel(app.status)}</td>
                    <td className="p-4">
                      {new Date(app.createdAt).toLocaleString('ru-RU')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!applicationsQuery.data?.length && (
              <p className="text-center text-gray-500 py-8">Нет заявок</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {children}
    </div>
  );
}

function Info({
  label,
  value,
  className = '',
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-gray-500 text-xs">{label}</p>
      <p className="font-medium mt-0.5">{value}</p>
    </div>
  );
}
