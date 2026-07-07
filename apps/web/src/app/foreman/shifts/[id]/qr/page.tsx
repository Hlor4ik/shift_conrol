'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';

export default function ForemanQrPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuthStore();

  const { data } = useQuery({
    queryKey: ['shift-qr', id],
    queryFn: () => api<{ token: string; shiftId: string }>(`/foreman/shifts/${id}/qr`, { token: token! }),
    enabled: !!token && !!id,
  });

  const qrUrl = data?.token
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data.token)}`
    : null;

  return (
    <div className="text-center space-y-6">
      <h2 className="text-xl font-bold">QR-код для отметки</h2>
      <p className="text-gray-500 text-sm">Покажите этот код работникам для check-in</p>
      {qrUrl ? (
        <img src={qrUrl} alt="QR Code" className="mx-auto rounded-xl border" />
      ) : (
        <div className="animate-pulse w-72 h-72 bg-gray-100 rounded-xl mx-auto" />
      )}
      {data?.token && (
        <p className="text-xs text-gray-400 font-mono break-all max-w-sm mx-auto">{data.token}</p>
      )}
    </div>
  );
}
