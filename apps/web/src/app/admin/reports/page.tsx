'use client';

import { useAuthStore } from '@/lib/auth';

export default function ReportsPage() {
  const { token, companyId } = useAuthStore();
  const base = '/api/v1/export';
  const headers = { Authorization: `Bearer ${token}`, 'x-company-id': companyId ?? '' };

  const download = async (type: string, format: string) => {
    const res = await fetch(`${base}/${type}?format=${format}`, { headers });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}.${format === 'xlsx' ? 'xlsx' : format}`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Отчёты и экспорт</h1>
      <div className="grid md:grid-cols-3 gap-4">
        {[
          { type: 'workers', label: 'Работники' },
          { type: 'shifts', label: 'Смены' },
          { type: 'payments', label: 'Выплаты' },
        ].map((item) => (
          <div key={item.type} className="card p-5 space-y-3">
            <h3 className="font-semibold">{item.label}</h3>
            <div className="flex gap-2">
              {['xlsx', 'csv', 'pdf'].map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => download(item.type, fmt)}
                  className="btn-secondary text-xs uppercase"
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
