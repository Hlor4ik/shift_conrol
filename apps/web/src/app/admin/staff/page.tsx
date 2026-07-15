'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getUserRoleLabel, getUserStatusLabel } from '@shiftcontrol/shared';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import { QueryErrorBanner } from '@/components/QueryErrorBanner';

type StaffRole = 'MANAGER' | 'FOREMAN';

interface StaffUser {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  managerProfile?: { fullName: string; phone?: string };
  foremanProfile?: { fullName: string; phone?: string };
}

interface StaffForm {
  email: string;
  password: string;
  fullName: string;
  phone: string;
}

const emptyForm: StaffForm = { email: '', password: '', fullName: '', phone: '' };

export default function StaffPage() {
  const { token, companyId } = useAuthStore();
  const queryClient = useQueryClient();
  const [roleTab, setRoleTab] = useState<StaffRole>('MANAGER');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<StaffForm>(emptyForm);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['staff', companyId],
    queryFn: () =>
      api<{ items: StaffUser[] }>('/admin/users', {
        token: token!,
        companyId: companyId ?? undefined,
      }),
    enabled: !!token,
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const path = roleTab === 'MANAGER' ? '/admin/users/managers' : '/admin/users/foremen';
      return api(path, {
        method: 'POST',
        token: token!,
        companyId: companyId ?? undefined,
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          fullName: form.fullName,
          phone: form.phone || undefined,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', companyId] });
      queryClient.invalidateQueries({ queryKey: ['foremen', companyId] });
      setForm(emptyForm);
      setShowForm(false);
    },
  });

  const blockMutation = useMutation({
    mutationFn: (id: string) =>
      api(`/admin/users/${id}/block`, { method: 'PATCH', token: token! }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff', companyId] }),
  });

  const unblockMutation = useMutation({
    mutationFn: (id: string) =>
      api(`/admin/users/${id}/unblock`, { method: 'PATCH', token: token! }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff', companyId] }),
  });

  const set = (key: keyof StaffForm, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Сотрудники</h1>
        <button
          type="button"
          onClick={() => {
            setForm(emptyForm);
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

      {showForm && (
        <div className="card p-6 space-y-4">
          <div className="flex gap-2">
            {(['MANAGER', 'FOREMAN'] as StaffRole[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleTab(r)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  roleTab === r ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {r === 'MANAGER' ? 'Менеджер' : 'Бригадир'}
              </button>
            ))}
          </div>
          {createMutation.isError && (
            <QueryErrorBanner
              message={
                createMutation.error instanceof Error
                  ? createMutation.error.message
                  : 'Не удалось создать'
              }
            />
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
            className="grid grid-cols-2 gap-4"
          >
            <Field label="Email">
              <input
                type="email"
                className="input-field"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                required
              />
            </Field>
            <Field label="Пароль">
              <input
                type="password"
                className="input-field"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                minLength={8}
                required
              />
            </Field>
            <Field label="ФИО">
              <input
                className="input-field"
                value={form.fullName}
                onChange={(e) => set('fullName', e.target.value)}
                required
              />
            </Field>
            <Field label="Телефон">
              <input
                className="input-field"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
              />
            </Field>
            <div className="col-span-2 flex gap-3">
              <button type="submit" disabled={createMutation.isPending} className="btn-primary">
                {createMutation.isPending
                  ? 'Создание...'
                  : `Создать ${roleTab === 'MANAGER' ? 'менеджера' : 'бригадира'}`}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      {(blockMutation.isError || unblockMutation.isError) && (
        <QueryErrorBanner
          message={
            (blockMutation.error ?? unblockMutation.error) instanceof Error
              ? (blockMutation.error ?? unblockMutation.error)?.message
              : 'Ошибка операции'
          }
        />
      )}

      {isLoading ? (
        <div className="animate-pulse h-40 bg-gray-100 rounded-xl" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4">ФИО</th>
                <th className="text-left p-4">Email</th>
                <th className="text-left p-4">Роль</th>
                <th className="text-left p-4">Статус</th>
                <th className="text-left p-4">Создан</th>
                <th className="text-left p-4"></th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((s) => (
                <tr key={s.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-medium">
                    {s.managerProfile?.fullName ?? s.foremanProfile?.fullName ?? '—'}
                  </td>
                  <td className="p-4">{s.email}</td>
                  <td className="p-4">{getUserRoleLabel(s.role)}</td>
                  <td className="p-4">{getUserStatusLabel(s.status)}</td>
                  <td className="p-4">
                    {new Date(s.createdAt).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="p-4">
                    {s.status === 'BLOCKED' ? (
                      <button
                        type="button"
                        onClick={() => unblockMutation.mutate(s.id)}
                        disabled={unblockMutation.isPending}
                        className="text-brand-600 text-xs font-medium"
                      >
                        Разблокировать
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Заблокировать сотрудника?')) blockMutation.mutate(s.id);
                        }}
                        disabled={blockMutation.isPending}
                        className="text-red-600 text-xs font-medium"
                      >
                        Заблокировать
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data?.items.length && (
            <p className="text-center text-gray-500 py-8">Нет сотрудников</p>
          )}
        </div>
      )}
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
