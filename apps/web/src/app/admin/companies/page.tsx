'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import { QueryErrorBanner } from '@/components/QueryErrorBanner';

interface Company {
  id: string;
  name: string;
  inn?: string;
  phone?: string;
  email?: string;
  address?: string;
  isActive: boolean;
}

interface CompanyForm {
  name: string;
  inn: string;
  phone: string;
  email: string;
  address: string;
  isActive: boolean;
}

const emptyForm: CompanyForm = {
  name: '',
  inn: '',
  phone: '',
  email: '',
  address: '',
  isActive: true,
};

export default function CompaniesPage() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [form, setForm] = useState<CompanyForm>(emptyForm);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['companies'],
    queryFn: () => api<{ items: Company[] }>('/companies', { token: token! }),
    enabled: !!token,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        inn: form.inn || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        address: form.address || undefined,
        ...(editing && { isActive: form.isActive }),
      };
      if (editing) {
        return api(`/companies/${editing.id}`, {
          method: 'PATCH',
          token: token!,
          body: JSON.stringify(payload),
        });
      }
      return api('/companies', {
        method: 'POST',
        token: token!,
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      closeModal();
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (company: Company) => {
    setEditing(company);
    setForm({
      name: company.name,
      inn: company.inn ?? '',
      phone: company.phone ?? '',
      email: company.email ?? '',
      address: company.address ?? '',
      isActive: company.isActive,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
    saveMutation.reset();
  };

  const set = (key: keyof CompanyForm, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Компании</h1>
        <button type="button" onClick={openCreate} className="btn-primary">
          Добавить компанию
        </button>
      </div>

      {isError && (
        <QueryErrorBanner
          message={error instanceof Error ? error.message : undefined}
          onRetry={() => refetch()}
        />
      )}

      {isLoading ? (
        <div className="animate-pulse h-32 bg-gray-100 rounded-xl" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4">Название</th>
                <th className="text-left p-4">ИНН</th>
                <th className="text-left p-4">Телефон</th>
                <th className="text-left p-4">Статус</th>
                <th className="text-left p-4"></th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((c) => (
                <tr key={c.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-medium">{c.name}</td>
                  <td className="p-4">{c.inn ?? '—'}</td>
                  <td className="p-4">{c.phone ?? '—'}</td>
                  <td className="p-4">{c.isActive ? 'Активна' : 'Неактивна'}</td>
                  <td className="p-4">
                    <button
                      type="button"
                      onClick={() => openEdit(c)}
                      className="text-brand-600 text-xs font-medium"
                    >
                      Редактировать
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data?.items.length && (
            <p className="text-center text-gray-500 py-8">Нет компаний</p>
          )}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card p-6 w-full max-w-lg space-y-4">
            <h2 className="text-lg font-semibold">
              {editing ? 'Редактирование компании' : 'Новая компания'}
            </h2>
            {saveMutation.isError && (
              <QueryErrorBanner
                message={
                  saveMutation.error instanceof Error
                    ? saveMutation.error.message
                    : 'Не удалось сохранить'
                }
              />
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate();
              }}
              className="space-y-3"
            >
              <Field label="Название">
                <input
                  className="input-field"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  required
                />
              </Field>
              <Field label="ИНН">
                <input
                  className="input-field"
                  value={form.inn}
                  onChange={(e) => set('inn', e.target.value)}
                />
              </Field>
              <Field label="Телефон">
                <input
                  className="input-field"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  className="input-field"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                />
              </Field>
              <Field label="Адрес">
                <input
                  className="input-field"
                  value={form.address}
                  onChange={(e) => set('address', e.target.value)}
                />
              </Field>
              {editing && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => set('isActive', e.target.checked)}
                  />
                  Активна
                </label>
              )}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saveMutation.isPending} className="btn-primary">
                  {saveMutation.isPending ? 'Сохранение...' : 'Сохранить'}
                </button>
                <button type="button" onClick={closeModal} className="btn-secondary">
                  Отмена
                </button>
              </div>
            </form>
          </div>
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
