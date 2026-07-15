'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import { useToast } from '@/components/Toast';

export default function NewShiftPage() {
  const router = useRouter();
  const { token, companyId } = useAuthStore();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    objectId: '',
    title: '',
    address: '',
    date: '',
    startTime: '08:00',
    endTime: '17:00',
    cost: '',
    maxWorkers: '10',
    description: '',
    requirements: '',
    minRating: '0',
    foremanId: '',
    gpsRadiusMeters: '200',
  });

  const { data: objects } = useQuery({
    queryKey: ['objects', companyId],
    queryFn: () =>
      api<{ items: { id: string; name: string; address: string }[] }>('/objects', {
        token: token!,
        companyId: companyId ?? undefined,
      }),
    enabled: !!token,
  });

  const { data: foremen } = useQuery({
    queryKey: ['foremen', companyId],
    queryFn: () =>
      api<{ items: { id: string; foremanProfile: { fullName: string } }[] }>(
        '/admin/users?role=FOREMAN',
        { token: token!, companyId: companyId ?? undefined },
      ),
    enabled: !!token,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const object = objects?.items.find((o) => o.id === form.objectId);
      await api('/shifts', {
        method: 'POST',
        token: token!,
        companyId: companyId ?? undefined,
        body: JSON.stringify({
          ...form,
          address: form.address || object?.address,
          cost: parseFloat(form.cost),
          maxWorkers: parseInt(form.maxWorkers, 10),
          minRating: parseFloat(form.minRating),
          gpsRadiusMeters: parseInt(form.gpsRadiusMeters, 10),
          foremanId: form.foremanId || undefined,
        }),
      });
      showToast('Смена создана');
      router.push('/admin/shifts');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Ошибка создания', 'error');
    } finally {
      setLoading(false);
    }
  };

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Создание смены</h1>
      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <Field label="Объект">
          <select className="input-field" value={form.objectId} onChange={(e) => set('objectId', e.target.value)} required>
            <option value="">Выберите объект</option>
            {objects?.items.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Название">
          <input className="input-field" value={form.title} onChange={(e) => set('title', e.target.value)} required />
        </Field>
        <Field label="Адрес">
          <input className="input-field" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Авто из объекта" />
        </Field>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Дата">
            <input type="date" className="input-field" value={form.date} onChange={(e) => set('date', e.target.value)} required />
          </Field>
          <Field label="Начало">
            <input type="time" className="input-field" value={form.startTime} onChange={(e) => set('startTime', e.target.value)} required />
          </Field>
          <Field label="Конец">
            <input type="time" className="input-field" value={form.endTime} onChange={(e) => set('endTime', e.target.value)} required />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Стоимость (₽)">
            <input type="number" className="input-field" value={form.cost} onChange={(e) => set('cost', e.target.value)} required />
          </Field>
          <Field label="Кол-во работников">
            <input type="number" className="input-field" value={form.maxWorkers} onChange={(e) => set('maxWorkers', e.target.value)} required />
          </Field>
        </div>
        <Field label="Бригадир">
          <select className="input-field" value={form.foremanId} onChange={(e) => set('foremanId', e.target.value)}>
            <option value="">Не назначен</option>
            {foremen?.items.map((f) => (
              <option key={f.id} value={f.id}>{f.foremanProfile?.fullName}</option>
            ))}
          </select>
        </Field>
        <Field label="Мин. рейтинг">
          <input type="number" className="input-field" value={form.minRating} onChange={(e) => set('minRating', e.target.value)} />
        </Field>
        <Field label="Описание">
          <textarea className="input-field" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} />
        </Field>
        <Field label="Что взять с собой">
          <textarea className="input-field" rows={2} value={form.requirements} onChange={(e) => set('requirements', e.target.value)} />
        </Field>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Создание...' : 'Создать смену'}
        </button>
      </form>
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
