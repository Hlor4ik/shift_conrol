'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import QRCode from 'qrcode';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import { QueryErrorBanner } from '@/components/QueryErrorBanner';

export default function ForemanQrPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuthStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrError, setQrError] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['shift-qr', id],
    queryFn: () => api<{ token: string; shiftId: string }>(`/foreman/shifts/${id}/qr`, { token: token! }),
    enabled: !!token && !!id,
  });

  useEffect(() => {
    if (!data?.token || !canvasRef.current) return;

    setQrError('');
    QRCode.toCanvas(canvasRef.current, data.token, {
      width: 300,
      margin: 2,
      errorCorrectionLevel: 'M',
    }).catch(() => setQrError('Не удалось сгенерировать QR-код'));
  }, [data?.token]);

  if (isLoading) {
    return <div className="animate-pulse w-72 h-72 bg-gray-100 rounded-xl mx-auto" />;
  }

  if (isError) {
    return (
      <div className="text-center space-y-6">
        <h2 className="text-xl font-bold">QR-код для отметки</h2>
        <QueryErrorBanner onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="text-center space-y-6">
      <h2 className="text-xl font-bold">QR-код для отметки</h2>
      <p className="text-gray-500 text-sm">Покажите этот код работникам для check-in</p>

      {qrError ? (
        <QueryErrorBanner message={qrError} />
      ) : data?.token ? (
        <canvas ref={canvasRef} className="mx-auto rounded-xl border" />
      ) : (
        <div className="animate-pulse w-72 h-72 bg-gray-100 rounded-xl mx-auto" />
      )}

      {data?.token && (
        <p className="text-xs text-gray-400 font-mono break-all max-w-sm mx-auto">{data.token}</p>
      )}
    </div>
  );
}
