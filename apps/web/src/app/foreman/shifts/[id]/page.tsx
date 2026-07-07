'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';

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

  const { data: shift } = useQuery({
    queryKey: ['shift', id],
    queryFn: () => api<ShiftDetail>(`/shifts/${id}`, { token: token! }),
    enabled: !!token && !!id,
  });

  const update = (appId: string, field: string, value: unknown) => {
    setItems((prev) => ({
      ...prev,
      [appId]: { ...prev[appId], applicationId: appId, [field]: value },
    }));
  };

  const submit = async () => {
    setSaving(true);
    try {
      const payload = Object.values(items).filter((i) => i.status);
      await api('/foreman/attendance', {
        method: 'POST',
        token: token!,
        body: JSON.stringify({ shiftId: id, items: payload }),
      });
      alert('Сохранено');
    } finally {
      setSaving(false);
    }
  };

  if (!shift) return <div className="animate-pulse h-40 bg-gray-100 rounded-xl" />;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">{shift.title}</h2>
      <p className="text-gray-500">
        {new Date(shift.date).toLocaleDateString('ru-RU')} · {shift.applications?.length ?? 0} работников
      </p>

      <div className="space-y-4">
        {shift.applications?.map((app) => (
          <div key={app.id} className="card p-5 space-y-3">
            <p className="font-semibold">{app.worker?.workerProfile?.fullName}</p>
            <select
              className="input-field"
              onChange={(e) => update(app.id, 'status', e.target.value)}
              defaultValue=""
            >
              <option value="">Статус посещаемости</option>
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <div>
              <label className="text-sm text-gray-500">Оценка</label>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => update(app.id, 'stars', star)}
                    className="text-2xl hover:scale-110 transition"
                  >
                    {(items[app.id]?.stars ?? 0) >= star ? '★' : '☆'}
                  </button>
                ))}
              </div>
            </div>
            <input
              className="input-field"
              placeholder="Комментарий"
              onChange={(e) => update(app.id, 'comment', e.target.value)}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                onChange={(e) => update(app.id, 'isBestWorker', e.target.checked)}
              />
              Лучший работник смены
            </label>
          </div>
        ))}
      </div>

      <button onClick={submit} disabled={saving} className="btn-primary w-full">
        {saving ? 'Сохранение...' : 'Завершить смену'}
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
  applications?: Array<{
    id: string;
    worker?: { workerProfile?: { fullName: string } };
  }>;
}
