'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';

export default function WorkersPage() {
  const { token } = useAuthStore();
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['workers', search, city],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (city) params.set('city', city);
      return api<{ items: Worker[] }>(`/workers?${params}`, { token: token! });
    },
    enabled: !!token,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Работники</h1>
      <div className="flex gap-4">
        <input
          className="input-field max-w-xs"
          placeholder="Поиск по ФИО, телефону..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <input
          className="input-field max-w-xs"
          placeholder="Город"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
      </div>
      {isLoading ? (
        <div className="animate-pulse h-40 bg-gray-100 rounded-xl" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4">ФИО</th>
                <th className="text-left p-4">Телефон</th>
                <th className="text-left p-4">Город</th>
                <th className="text-left p-4">Специальность</th>
                <th className="text-left p-4">Рейтинг</th>
                <th className="text-left p-4">Смен</th>
                <th className="text-left p-4">Статус</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((w) => (
                <tr key={w.userId} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-medium">{w.fullName}</td>
                  <td className="p-4">{w.phone}</td>
                  <td className="p-4">{w.city}</td>
                  <td className="p-4">{w.specialty}</td>
                  <td className="p-4">{w.rating}</td>
                  <td className="p-4">{w.totalShifts}</td>
                  <td className="p-4">{w.user?.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface Worker {
  userId: string;
  fullName: string;
  phone: string;
  city: string;
  specialty: string;
  rating: number;
  totalShifts: number;
  user?: { status: string };
}
