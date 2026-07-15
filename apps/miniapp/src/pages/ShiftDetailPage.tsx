import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useToken } from '../lib/auth';
import { formatDate, formatDateTime, formatMoney } from '../lib/format';
import { confirmAction } from '../lib/telegram';
import { useTelegramBackButton } from '../hooks/useTelegramBackButton';
import { PageTopBar } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { InfoRow } from '../components/ui/InfoRow';
import { MapPlaceholder } from '../components/ui/Extras';
import { Skeleton } from '../components/ui/Skeleton';
import { QueryErrorBanner } from '../components/ui/QueryErrorBanner';
import { IconMapPin, IconClock, IconUser, IconPhone, IconBuilding, IconCheckCircle, IconStar } from '../components/icons';

interface WorkerContext {
  applied: boolean;
  canApply: boolean;
  accountVerified: boolean;
  cancelPenaltyApplies: boolean;
  cancelPenaltyPoints: number;
  conflictCancelPenaltyApplies: boolean;
  conflictCancelPenaltyPoints: number;
  conflictShift: {
    id: string;
    title: string;
    date: string;
    startTime: string;
    address: string;
  } | null;
}

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
  foreman: { foremanProfile: { fullName: string; phone?: string } } | null;
  photos: { url: string }[];
  company?: { name: string };
  minRating?: number;
  registrationDeadline?: string | null;
  workerContext: WorkerContext;
}

function invalidateShiftQueries(queryClient: ReturnType<typeof useQueryClient>, shiftId: string) {
  queryClient.invalidateQueries({ queryKey: ['shift', shiftId] });
  queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  queryClient.invalidateQueries({ queryKey: ['my-shifts-upcoming'] });
  queryClient.invalidateQueries({ queryKey: ['my-shifts-past'] });
  queryClient.invalidateQueries({ queryKey: ['shifts-available'] });
}

export default function ShiftDetailPage() {
  const { id } = useParams<{ id: string }>();
  const token = useToken();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: shift, isLoading, isError, error } = useQuery({
    queryKey: ['shift', id],
    queryFn: () => api<Shift>(`/shifts/${id}`, { token: token! }),
    enabled: !!id && !!token,
  });

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/shifts');
  };
  useTelegramBackButton(goBack);

  const apply = useMutation({
    mutationFn: () => api(`/shifts/${id}/apply`, { method: 'POST', token: token! }),
    onSuccess: () => invalidateShiftQueries(queryClient, id!),
  });

  const cancel = useMutation({
    mutationFn: () =>
      api<{ penaltyApplied?: boolean; penaltyPoints?: number }>(`/shifts/${id}/apply`, {
        method: 'DELETE',
        token: token!,
      }),
    onSuccess: (data) => {
      invalidateShiftQueries(queryClient, id!);
      if (data.penaltyApplied) {
        apply.reset();
      }
    },
  });

  const handleCancel = async () => {
    if (!shift) return;
    const ctx = shift.workerContext;
    const message = ctx.cancelPenaltyApplies
      ? `Отмена менее чем за 24 часа до смены: ${ctx.cancelPenaltyPoints} баллов к рейтингу. Продолжить?`
      : 'Отменить запись на эту смену?';
    if (await confirmAction(message)) {
      cancel.mutate();
    }
  };

  if (isLoading) return <Skeleton className="h-72 mx-4" />;
  if (isError) {
    return (
      <div className="page pt-2 -mx-4 px-4">
        <PageTopBar onBack={goBack} title="Смена" />
        <QueryErrorBanner message={(error as Error).message} onRetry={() => void queryClient.invalidateQueries({ queryKey: ['shift', id] })} />
        <Button variant="secondary" className="mt-4" onClick={goBack}>
          К списку смен
        </Button>
      </div>
    );
  }
  if (!shift) {
    return (
      <div className="page pt-2">
        <PageTopBar onBack={goBack} title="Смена" />
        <div className="text-center py-16">
          <p className="text-slate-500">Смена не найдена</p>
          <Button variant="secondary" className="mt-4" onClick={goBack}>
            К списку смен
          </Button>
        </div>
      </div>
    );
  }

  const ctx = shift.workerContext;
  const freeSlots = shift.maxWorkers - shift.bookedWorkers;
  const isFull = freeSlots <= 0;
  const mapUrl =
    shift.latitude && shift.longitude
      ? `https://yandex.ru/map-widget/v1/?ll=${shift.longitude}%2C${shift.latitude}&z=15&pt=${shift.longitude}%2C${shift.latitude}%2Cpm2rdm`
      : null;

  const foremanName = shift.foreman?.foremanProfile.fullName ?? 'Будет назначен';
  const foremanPhone = shift.foreman?.foremanProfile.phone;
  const description = shift.description?.trim() || 'Описание будет добавлено бригадиром перед началом смены.';
  const requirements = shift.requirements?.trim() || 'Спецодежда, перчатки, паспорт.';

  const durationHours = (() => {
    const [sh, sm] = shift.startTime.split(':').map(Number);
    const [eh, em] = shift.endTime.split(':').map(Number);
    return Math.max(1, Math.round((eh * 60 + em - (sh * 60 + sm)) / 60));
  })();

  return (
    <div className="pb-28 -mx-4 animate-slide-up">
      <PageTopBar onBack={goBack} title={shift.title} />

      <div className="detail-hero h-32 relative mx-4 rounded-[20px] overflow-hidden mt-1" />

      <div className="px-4 -mt-6 space-y-4 relative z-10">
        <div className="sc-card p-4">
          <div className="flex flex-wrap gap-2 mb-2">
            {ctx.applied ? (
              <Badge variant="info">Вы записаны</Badge>
            ) : (
              <Badge variant={isFull ? 'danger' : 'success'}>
                {isFull ? 'Мест нет' : `${freeSlots} мест из ${shift.maxWorkers}`}
              </Badge>
            )}
          </div>
          <div className="flex gap-3 items-start">
            <div className="w-11 h-11 rounded-full bg-blue-50 text-brand-600 flex items-center justify-center shrink-0">
              <IconBuilding className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-[20px] font-bold text-slate-900 leading-snug">{shift.title}</h1>
              {shift.company?.name && (
                <p className="text-[13px] text-slate-500 mt-0.5">{shift.company.name}</p>
              )}
            </div>
          </div>
        </div>

        {ctx.conflictShift && (
          <div className="sc-card p-4 bg-amber-50 border-amber-200">
            <p className="text-[14px] font-semibold text-amber-900">На этот день уже есть смена</p>
            <p className="text-[13px] text-amber-800 mt-1 leading-relaxed">
              «{ctx.conflictShift.title}» ({formatDate(ctx.conflictShift.date)},{' '}
              {ctx.conflictShift.startTime}). Отмените её, чтобы записаться сюда
              {ctx.conflictCancelPenaltyApplies
                ? ` (−${Math.abs(ctx.conflictCancelPenaltyPoints)} к рейтингу при отмене < 24 ч)`
                : ''}
              .
            </p>
            <Link to={`/shifts/${ctx.conflictShift.id}`}>
              <Button variant="secondary" className="mt-3 w-full">
                Перейти к текущей смене
              </Button>
            </Link>
          </div>
        )}

        <div className="sc-card p-4">
          <p className="text-[28px] font-bold text-brand-600">{formatMoney(shift.cost)}</p>
          <p className="text-[13px] text-slate-500 mt-0.5">за смену</p>
          <div className="mt-4 space-y-3.5 pt-4 border-t border-slate-100">
            <InfoRow icon={<IconClock className="w-4 h-4" />} label="Дата" value={formatDate(shift.date)} />
            <InfoRow
              icon={<IconClock className="w-4 h-4" />}
              label="Время"
              value={`${shift.startTime} – ${shift.endTime} (${durationHours} ч.)`}
            />
            <InfoRow icon={<IconMapPin className="w-4 h-4" />} label="Адрес" value={shift.address} />
            {shift.minRating != null && shift.minRating > 0 && (
              <InfoRow
                icon={<IconStar className="w-4 h-4" />}
                label="Мин. рейтинг"
                value={`${shift.minRating} баллов`}
              />
            )}
            {shift.registrationDeadline && (
              <InfoRow
                icon={<IconClock className="w-4 h-4" />}
                label="Запись до"
                value={formatDateTime(shift.registrationDeadline)}
              />
            )}
            <InfoRow
              icon={<IconUser className="w-4 h-4" />}
              label="Прораб"
              value={foremanName}
              action={
                foremanPhone ? (
                  <a
                    href={`tel:${foremanPhone}`}
                    className="w-9 h-9 rounded-full bg-blue-50 text-brand-600 flex items-center justify-center shrink-0"
                  >
                    <IconPhone className="w-4 h-4" />
                  </a>
                ) : undefined
              }
            />
          </div>
        </div>

        {mapUrl ? (
          <div className="sc-card overflow-hidden">
            <iframe src={mapUrl} className="w-full h-44 border-0" title="Карта" />
          </div>
        ) : (
          <MapPlaceholder address={shift.address} />
        )}

        <div className="sc-card p-4">
          <h3 className="font-semibold text-slate-900 mb-2">Описание</h3>
          <p className="text-[13px] text-slate-500 leading-relaxed">{description}</p>
        </div>

        <div className="sc-card p-4">
          <h3 className="font-semibold text-slate-900 mb-2">Что взять с собой</h3>
          <p className="text-[13px] text-slate-500 leading-relaxed">{requirements}</p>
        </div>

        {shift.photos.length > 0 && (
          <div className="sc-card p-4">
            <h3 className="font-semibold text-slate-900 mb-3">Фото объекта</h3>
            <div className="flex gap-2 overflow-x-auto">
              {shift.photos.map((p, i) => (
                <img key={i} src={p.url} alt="" className="h-28 w-36 object-cover rounded-[14px] shrink-0" />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 px-4 py-3 safe-bottom">
        <div className="max-w-lg mx-auto space-y-2">
          {ctx.applied ? (
            <>
              <Button fullWidth onClick={() => navigate(`/checkin/${shift.id}`)} className="gap-2">
                <IconCheckCircle className="w-5 h-5" />
                Отметиться на смене
              </Button>
              <Button
                fullWidth
                variant="danger"
                loading={cancel.isPending}
                onClick={handleCancel}
              >
                Отменить запись
              </Button>
              {ctx.cancelPenaltyApplies && (
                <p className="text-[12px] text-amber-600 text-center">
                  Отмена менее чем за 24 ч: {ctx.cancelPenaltyPoints} баллов к рейтингу
                </p>
              )}
            </>
          ) : ctx.canApply ? (
            <Button fullWidth loading={apply.isPending} onClick={() => apply.mutate()}>
              Записаться на смену
            </Button>
          ) : !ctx.accountVerified ? (
            <>
              <Button fullWidth variant="secondary" disabled>
                Запись недоступна
              </Button>
              <p className="text-[12px] text-amber-600 text-center">
                Подтвердите аккаунт: загрузите документ в профиле и дождитесь проверки
              </p>
              <Link to="/profile/settings">
                <Button fullWidth variant="secondary" type="button">
                  Перейти в настройки
                </Button>
              </Link>
            </>
          ) : ctx.conflictShift ? (
            <Button fullWidth variant="secondary" disabled>
              Сначала отмените другую смену
            </Button>
          ) : (
            <Button fullWidth disabled>
              {isFull ? 'Мест нет' : 'Запись недоступна'}
            </Button>
          )}

          {apply.isSuccess && (
            <p className="text-center text-[13px] text-emerald-600 font-medium">Вы записаны на смену!</p>
          )}
          {apply.isError && (
            <p className="text-red-500 text-[13px] text-center">{(apply.error as Error).message}</p>
          )}
          {cancel.isSuccess && (
            <p className="text-center text-[13px] text-slate-600 font-medium">
              Запись отменена
              {cancel.data?.penaltyApplied
                ? ` (−${Math.abs(cancel.data.penaltyPoints ?? 0)} к рейтингу)`
                : ''}
            </p>
          )}
          {cancel.isError && (
            <p className="text-red-500 text-[13px] text-center">{(cancel.error as Error).message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
