'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/auth';
import { apiBlob } from '@/lib/api';
import { useToast } from '@/components/Toast';

const EXPORT_TYPES = [
  { type: 'workers', label: 'Работники', formats: ['xlsx', 'csv', 'pdf'] as const },
  { type: 'shifts', label: 'Смены', formats: ['xlsx', 'csv'] as const },
  { type: 'payments', label: 'Выплаты', formats: ['xlsx', 'csv'] as const },
];

export default function ReportsPage() {
  const { token, companyId } = useAuthStore();
  const { showToast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const download = async (type: string, format: string) => {
    const key = `${type}-${format}`;
    setLoading(key);
    try {
      const blob = await apiBlob(`/export/${type}?format=${format}`, {
        token: token!,
        companyId: companyId ?? undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}.${format === 'xlsx' ? 'xlsx' : format}`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Файл загружен');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Ошибка экспорта', 'error');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Отчёты и экспорт</h1>
      <div className="grid md:grid-cols-3 gap-4">
        {EXPORT_TYPES.map((item) => (
          <div key={item.type} className="card p-5 space-y-3">
            <h3 className="font-semibold">{item.label}</h3>
            <div className="flex gap-2 flex-wrap">
              {item.formats.map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  disabled={loading === `${item.type}-${fmt}`}
                  onClick={() => download(item.type, fmt)}
                  className="btn-secondary text-xs uppercase disabled:opacity-50"
                >
                  {loading === `${item.type}-${fmt}` ? '…' : fmt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
