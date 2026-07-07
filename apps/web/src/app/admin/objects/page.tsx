'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';

export default function ObjectsPage() {
  const { token, companyId } = useAuthStore();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['objects', companyId],
    queryFn: () =>
      api<{ items: ObjectItem[] }>('/objects', { token: token!, companyId: companyId ?? undefined }),
    enabled: !!token,
  });

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    await api('/objects', {
      method: 'POST',
      token: token!,
      companyId: companyId ?? undefined,
      body: JSON.stringify({ name, address }),
    });
    setName('');
    setAddress('');
    setShowForm(false);
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">Объекты</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">Добавить</button>
      </div>
      {showForm && (
        <form onSubmit={create} className="card p-4 flex gap-4 items-end">
          <div className="flex-1">
            <label className="text-sm font-medium">Название</label>
            <input className="input-field mt-1" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium">Адрес</label>
            <input className="input-field mt-1" value={address} onChange={(e) => setAddress(e.target.value)} required />
          </div>
          <button type="submit" className="btn-primary">Создать</button>
        </form>
      )}
      {isLoading ? (
        <div className="animate-pulse h-32 bg-gray-100 rounded-xl" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data?.items.map((o) => (
            <div key={o.id} className="card p-5">
              <h3 className="font-semibold">{o.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{o.address}</p>
              <p className="text-xs text-gray-400 mt-2">{o._count?.shifts ?? 0} смен</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface ObjectItem {
  id: string;
  name: string;
  address: string;
  _count?: { shifts: number };
}
