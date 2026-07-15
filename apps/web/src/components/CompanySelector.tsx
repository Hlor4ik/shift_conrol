'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';

interface Company {
  id: string;
  name: string;
}

export function CompanySelector() {
  const { token, user, companyId, setCompanyId } = useAuthStore();

  const { data } = useQuery({
    queryKey: ['companies'],
    queryFn: () => api<{ items: Company[] }>('/companies', { token: token! }),
    enabled: !!token && user?.role === 'SUPERADMIN',
  });

  const companies = data?.items ?? [];
  const selectedCompany = companies.find((c) => c.id === companyId);

  useEffect(() => {
    if (user?.role !== 'SUPERADMIN' || companyId || !companies.length) return;
    setCompanyId(companies[0].id);
  }, [user?.role, companyId, companies, setCompanyId]);

  if (user?.role === 'MANAGER') {
    const name = user.company?.name;
    if (!name) return null;
    return <span className="text-sm text-gray-500">Компания: {name}</span>;
  }

  if (user?.role !== 'SUPERADMIN') {
    return null;
  }

  if (!companyId) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        Компания не выбрана — выберите компанию для просмотра данных
      </div>
    );
  }

  if (!companies.length) {
    return (
      <span className="text-sm text-amber-600">
        {selectedCompany ? `Компания: ${selectedCompany.name}` : 'Выберите компанию в разделе «Компании»'}
      </span>
    );
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-gray-500 shrink-0">Компания:</span>
      <select
        value={companyId ?? ''}
        onChange={(e) => setCompanyId(e.target.value || null)}
        className="input-field max-w-xs text-sm py-1.5"
      >
        <option value="">— выберите —</option>
        {companies.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  );
}
