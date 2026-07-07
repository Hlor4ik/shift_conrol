import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useToken } from '../lib/auth';

export default function CheckInPage() {
  const { shiftId } = useParams<{ shiftId: string }>();
  const token = useToken();
  const [qrToken, setQrToken] = useState('');
  const [message, setMessage] = useState('');

  const qrCheckIn = useMutation({
    mutationFn: () =>
      api('/checkin/qr', {
        method: 'POST',
        token: token!,
        body: JSON.stringify({ shiftId, token: qrToken }),
      }),
    onSuccess: () => setMessage('Отметка по QR успешна!'),
    onError: (e: Error) => setMessage(e.message),
  });

  const gpsCheckIn = useMutation({
    mutationFn: (coords: { latitude: number; longitude: number; accuracy?: number }) =>
      api('/checkin/gps', {
        method: 'POST',
        token: token!,
        body: JSON.stringify({ shiftId, ...coords }),
      }),
    onSuccess: () => setMessage('Отметка по GPS успешна!'),
    onError: (e: Error) => setMessage(e.message),
  });

  const handleGps = () => {
    if (!navigator.geolocation) {
      setMessage('Геолокация не поддерживается');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        gpsCheckIn.mutate({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      () => setMessage('Не удалось получить геолокацию'),
      { enableHighAccuracy: true },
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Отметка прихода</h1>

      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
        <h2 className="font-semibold">QR-код</h2>
        <p className="text-sm text-tg-hint">Введите код с QR-бейджа бригадира</p>
        <input
          value={qrToken}
          onChange={(e) => setQrToken(e.target.value)}
          className="input"
          placeholder="Код QR"
        />
        <button
          onClick={() => qrCheckIn.mutate()}
          disabled={!qrToken || qrCheckIn.isPending}
          className="w-full bg-tg-button text-tg-buttonText py-3 rounded-xl font-semibold disabled:opacity-50"
        >
          Отметить по QR
        </button>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
        <h2 className="font-semibold">GPS-проверка</h2>
        <p className="text-sm text-tg-hint">Подтвердите, что вы на объекте</p>
        <button
          onClick={handleGps}
          disabled={gpsCheckIn.isPending}
          className="w-full border-2 border-tg-button text-tg-button py-3 rounded-xl font-semibold disabled:opacity-50"
        >
          {gpsCheckIn.isPending ? 'Проверка...' : 'Отметить по GPS'}
        </button>
      </div>

      {message && (
        <p className={`text-center text-sm ${message.includes('успешн') ? 'text-green-600' : 'text-red-500'}`}>
          {message}
        </p>
      )}
    </div>
  );
}
