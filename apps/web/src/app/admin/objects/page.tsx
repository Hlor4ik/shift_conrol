'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import { QueryErrorBanner } from '@/components/QueryErrorBanner';
import { useToast } from '@/components/Toast';

interface ObjectItem {
  id: string;
  name: string;
  address: string;
  description?: string;
  isActive?: boolean;
  _count?: { shifts: number };
}

interface ObjectForm {
  name: string;
  address: string;
  description: string;
}

export default function ObjectsPage() {
  const { token, companyId } = useAuthStore();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ObjectItem | null>(null);
  const [form, setForm] = useState<ObjectForm>({ name: '', address: '', description: '' });

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['objects', companyId],
    queryFn: () =>
      api<{ items: ObjectItem[] }>('/objects?activeOnly=false', {
        token: token!,
        companyId: companyId ?? undefined,
      }),
    enabled: !!token,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api('/objects', {
        method: 'POST',
        token: token!,
        companyId: companyId ?? undefined,
        body: JSON.stringify(form),
      }),
    onSuccess: () => {
      showToast('Объект создан');
      queryClient.invalidateQueries({ queryKey: ['objects', companyId] });
      setForm({ name: '', address: '', description: '' });
      setShowForm(false);
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      api(`/objects/${editing!.id}`, {
        method: 'PATCH',
        token: token!,
        companyId: companyId ?? undefined,
        body: JSON.stringify(form),
      }),
    onSuccess: () => {
      showToast('Объект обновлён');
      queryClient.invalidateQueries({ queryKey: ['objects', companyId] });
      setEditing(null);
      setForm({ name: '', address: '', description: '' });
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) =>
      api(`/objects/${id}`, {
        method: 'DELETE',
        token: token!,
        companyId: companyId ?? undefined,
      }),
    onSuccess: () => {
      showToast('Объект деактивирован');
      queryClient.invalidateQueries({ queryKey: ['objects', companyId] });
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  const startEdit = (obj: ObjectItem) => {
    setEditing(obj);
    setForm({
      name: obj.name,
      address: obj.address,
      description: obj.description ?? '',
    });
    setShowForm(false);
  };

  const activeMutation = updateMutation.isPending ? updateMutation : createMutation;

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">Объекты</h1>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setForm({ name: '', address: '', description: '' });
            setShowForm(!showForm);
          }}
          className="btn-primary"
        >
          Добавить
        </button>
      </div>

      {isError && (
        <QueryErrorBanner
          message={error instanceof Error ? error.message : undefined}
          onRetry={() => refetch()}
        />
      )}

      {(showForm || editing) && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (editing) updateMutation.mutate();
            else createMutation.mutate();
          }}
          className="card p-4 space-y-4"
        >
          {activeMutation.isError && (
            <QueryErrorBanner
              message={
                activeMutation.error instanceof Error
                  ? activeMutation.error.message
                  : 'Не удалось сохранить'
              }
            />
          )}
          <div className="flex gap-4 items-end flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium">Название</label>
              <input
                className="input-field mt-1"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium">Адрес</label>
              <input
                className="input-field mt-1"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                required
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium">Описание</label>
              <input
                className="input-field mt-1"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <button type="submit" disabled={activeMutation.isPending} className="btn-primary">
              {activeMutation.isPending ? 'Сохранение...' : editing ? 'Сохранить' : 'Создать'}
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setForm({ name: '', address: '', description: '' });
                }}
                className="btn-secondary"
              >
                Отмена
              </button>
            )}
          </div>
        </form>
      )}

      {deactivateMutation.isError && (
        <QueryErrorBanner
          message={
            deactivateMutation.error instanceof Error
              ? deactivateMutation.error.message
              : 'Не удалось деактивировать объект'
          }
        />
      )}

      {isLoading ? (
        <div className="animate-pulse h-32 bg-gray-100 rounded-xl" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data?.items.map((o) => (
            <div key={o.id} className="card p-5">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <h3 className="font-semibold">{o.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{o.address}</p>
                  <p className="text-xs text-gray-400 mt-2">{o._count?.shifts ?? 0} смен</p>
                  {o.isActive === false && (
                    <span className="inline-block mt-2 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded">
                      Неактивен
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => startEdit(o)}
                    className="text-brand-600 text-xs font-medium"
                  >
                    Редактировать
                  </button>
                  {o.isActive !== false && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Деактивировать объект?')) deactivateMutation.mutate(o.id);
                      }}
                      disabled={deactivateMutation.isPending}
                      className="text-red-600 text-xs font-medium"
                    >
                      Деактивировать
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
