import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { api } from '../lib/api';
import { useToken } from '../lib/auth';
import { useTelegramBackButton } from '../hooks/useTelegramBackButton';
import { PageTopBar } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { QueryErrorBanner } from '../components/ui/QueryErrorBanner';
import { Skeleton } from '../components/ui/Skeleton';
import { IconQr, IconGps, IconMapPin } from '../components/icons';

const STEPS = ['На объекте', 'QR / GPS', 'Смена началась'] as const;

interface GpsCheckInResponse {
  gpsVerified?: boolean;
}

export default function CheckInPage() {
  const { shiftId } = useParams<{ shiftId: string }>();
  const token = useToken();
  const navigate = useNavigate();
  const [qrToken, setQrToken] = useState('');
  const [message, setMessage] = useState('');
  const [messageSuccess, setMessageSuccess] = useState(false);

  const { data: shift, isLoading, isError, refetch } = useQuery({
    queryKey: ['shift', shiftId],
    queryFn: () =>
      api<{ title: string; address: string; startTime: string }>(`/shifts/${shiftId}`, { token: token! }),
    enabled: !!shiftId && !!token,
  });

  const goBack = () => navigate(-1);
  useTelegramBackButton(goBack);

  const setStatusMessage = (text: string, success: boolean) => {
    setMessage(text);
    setMessageSuccess(success);
  };

  const qrCheckIn = useMutation({
    mutationFn: () =>
      api('/checkin/qr', {
        method: 'POST',
        token: token!,
        body: JSON.stringify({ shiftId, token: qrToken }),
      }),
    onSuccess: () => setStatusMessage('Отметка по QR успешна!', true),
    onError: (e: Error) => setStatusMessage(e.message, false),
  });

  const gpsCheckIn = useMutation({
    mutationFn: (coords: { latitude: number; longitude: number; accuracy?: number }) =>
      api<GpsCheckInResponse>('/checkin/gps', {
        method: 'POST',
        token: token!,
        body: JSON.stringify({ shiftId, ...coords }),
      }),
    onSuccess: (data) => {
      if (data.gpsVerified) {
        setStatusMessage('Отметка по GPS успешна! Местоположение подтверждено.', true);
      } else {
        setStatusMessage(
          'Отметка зафиксирована, но GPS не подтвердил нахождение на объекте. Обратитесь к бригадиру.',
          false,
        );
      }
    },
    onError: (e: Error) => setStatusMessage(e.message, false),
  });

  const handleGps = () => {
    if (!navigator.geolocation) {
      setStatusMessage('Геолокация не поддерживается', false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        gpsCheckIn.mutate({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      () => setStatusMessage('Не удалось получить геолокацию', false),
      { enableHighAccuracy: true },
    );
  };

  const checkInSuccess = qrCheckIn.isSuccess || gpsCheckIn.isSuccess;
  const checkInPending = qrCheckIn.isPending || gpsCheckIn.isPending;
  const activeStep = checkInSuccess ? 2 : checkInPending || qrToken ? 1 : 0;

  if (isLoading) return <Skeleton className="h-72 mx-4" />;

  return (
    <div className="page -mx-4">
      <PageTopBar onBack={goBack} title="Отметка прихода" />

      <div className="px-4 space-y-4">
        <p className="text-[13px] text-slate-500">Подтвердите, что вы на объекте</p>

        {isError && <QueryErrorBanner onRetry={() => refetch()} />}

        {shift && (
          <div className="sc-card p-4 bg-blue-50 border-blue-100">
            <p className="font-semibold text-slate-900">{shift.title}</p>
            <div className="flex items-start gap-2 mt-2 text-[13px] text-slate-500">
              <IconMapPin className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{shift.address}</span>
            </div>
            <p className="text-[13px] text-slate-500 mt-1">Начало смены: {shift.startTime}</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          {STEPS.map((step, i) => (
            <div
              key={step}
              className={clsx(
                'rounded-[14px] py-2 px-1 transition-colors',
                i <= activeStep
                  ? 'bg-brand-600 text-white font-medium'
                  : 'sc-card !rounded-[14px] text-slate-500',
              )}
            >
              {i + 1}. {step}
            </div>
          ))}
        </div>

        {!checkInSuccess && (
          <>
            <div className="sc-card p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                  <IconQr className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">QR-код</h3>
                  <p className="text-[13px] text-slate-500 mt-0.5">Введите код с бейджа бригадира</p>
                </div>
              </div>
              <input
                value={qrToken}
                onChange={(e) => setQrToken(e.target.value)}
                className="input mb-3"
                placeholder="Код QR"
              />
              <Button
                fullWidth
                loading={qrCheckIn.isPending}
                disabled={!qrToken}
                onClick={() => qrCheckIn.mutate()}
              >
                Отметить по QR
              </Button>
            </div>

            <div className="sc-card p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <IconGps className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">GPS-проверка</h3>
                  <p className="text-[13px] text-slate-500 mt-0.5">Подтвердите местоположение на объекте</p>
                </div>
              </div>
              <Button fullWidth variant="outline" loading={gpsCheckIn.isPending} onClick={handleGps}>
                Отметить по GPS
              </Button>
            </div>
          </>
        )}

        <div className="sc-card p-4 text-[13px] text-slate-500 leading-relaxed">
          {checkInSuccess
            ? 'Отметка зафиксирована. Можете приступать к работе на объекте.'
            : 'Отметка фиксирует время прихода. При проблемах обратитесь к бригадиру на объекте.'}
        </div>

        {message && (
          <div
            className={`rounded-[14px] px-4 py-3 text-[13px] text-center font-medium ${
              messageSuccess ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
            }`}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
