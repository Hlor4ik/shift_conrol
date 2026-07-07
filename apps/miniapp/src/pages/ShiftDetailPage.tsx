import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useToken } from '../lib/auth';

interface Shift {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  cost: string;
  address: string;
  description: string;
  requirements: string;
  latitude: number;
  longitude: number;
  bookedWorkers: number;
  maxWorkers: number;
  foreman: { foremanProfile: { fullName: string } } | null;
  photos: { url: string }[];
}

export default function ShiftDetailPage() {
  const { id } = useParams<{ id: string }>();
  const token = useToken();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: shift, isLoading } = useQuery({
    queryKey: ['shift', id],
    queryFn: () => api<Shift>(`/shifts/${id}`, { token: token! }),
    enabled: !!id && !!token && token !== 'dev',
  });

  const apply = useMutation({
    mutationFn: () =>
      api(`/shifts/${id}/apply`, { method: 'POST', token: token! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  if (isLoading) return <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />;
  if (!shift) return <p>Смена не найдена</p>;

  const mapUrl =
    shift.latitude && shift.longitude
      ? `https://yandex.ru/map-widget/v1/?ll=${shift.longitude}%2C${shift.latitude}&z=15&pt=${shift.longitude}%2C${shift.latitude}%2Cpm2rdm`
      : null;

  return (
    <div className="space-y-4">
      <button onClick={() => navigate(-1)} className="text-tg-link text-sm">
        ← Назад
      </button>
      <h1 className="text-2xl font-bold">{shift.title}</h1>
      <p className="text-2xl font-bold text-tg-button">
        {Number(shift.cost).toLocaleString('ru-RU')} ₽
      </p>

      <div className="bg-white rounded-2xl p-4 space-y-2 shadow-sm">
        <Row label="Дата" value={new Date(shift.date).toLocaleDateString('ru-RU')} />
        <Row label="Время" value={`${shift.startTime} – ${shift.endTime}`} />
        <Row label="Адрес" value={shift.address} />
        {shift.foreman?.foremanProfile && (
          <Row label="Бригадир" value={shift.foreman.foremanProfile.fullName} />
        )}
        <Row
          label="Мест"
          value={`${shift.maxWorkers - shift.bookedWorkers} свободно из ${shift.maxWorkers}`}
        />
      </div>

      {mapUrl && (
        <iframe
          src={mapUrl}
          className="w-full h-48 rounded-2xl border-0"
          title="Карта"
        />
      )}

      {shift.description && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold mb-2">Описание</h3>
          <p className="text-sm text-gray-600">{shift.description}</p>
        </div>
      )}

      {shift.requirements && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold mb-2">Что взять с собой</h3>
          <p className="text-sm text-gray-600">{shift.requirements}</p>
        </div>
      )}

      {shift.photos.length > 0 && (
        <div className="flex gap-2 overflow-x-auto">
          {shift.photos.map((p, i) => (
            <img key={i} src={p.url} alt="" className="h-24 w-32 object-cover rounded-xl" />
          ))}
        </div>
      )}

      <button
        onClick={() => apply.mutate()}
        disabled={apply.isPending || shift.bookedWorkers >= shift.maxWorkers}
        className="w-full bg-tg-button text-tg-buttonText py-3 rounded-xl font-semibold disabled:opacity-50"
      >
        {apply.isPending
          ? 'Запись...'
          : shift.bookedWorkers >= shift.maxWorkers
            ? 'Мест нет'
            : 'Записаться на смену'}
      </button>
      {apply.isError && (
        <p className="text-red-500 text-sm text-center">
          {(apply.error as Error).message}
        </p>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-tg-hint">{label}</span>
      <span className="font-medium text-right max-w-[60%]">{value}</span>
    </div>
  );
}
