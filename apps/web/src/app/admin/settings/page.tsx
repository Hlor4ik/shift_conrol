'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';

export default function SettingsPage() {
  const { token, companyId } = useAuthStore();
  const { data, refetch } = useQuery({
    queryKey: ['settings', companyId],
    queryFn: () =>
      api<unknown[]>('/admin/settings', { token: token!, companyId: companyId ?? undefined }),
    enabled: !!token,
  });

  const { data: rules } = useQuery({
    queryKey: ['rating-rules', companyId],
    queryFn: () =>
      api<Record<string, number>>('/admin/settings/rating-rules', {
        token: token!,
        companyId: companyId ?? undefined,
      }),
    enabled: !!token,
  });

  const updateRules = async () => {
    if (!rules) return;
    await api('/admin/settings', {
      method: 'PATCH',
      token: token!,
      companyId: companyId ?? undefined,
      body: JSON.stringify({ key: 'rating_rules', value: rules }),
    });
    refetch();
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Настройки</h1>
      <div className="card p-6 space-y-4">
        <h3 className="font-semibold">Правила рейтинга</h3>
        {rules &&
          Object.entries(rules).map(([key, value]) => (
            <div key={key} className="flex justify-between items-center">
              <span className="text-sm">{key}</span>
              <span className="font-mono font-medium">{value > 0 ? `+${value}` : value}</span>
            </div>
          ))}
        <p className="text-xs text-gray-500">
          Для изменения правил используйте API PATCH /admin/settings
        </p>
      </div>
    </div>
  );
}
