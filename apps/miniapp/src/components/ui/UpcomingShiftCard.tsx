import { Link } from 'react-router-dom';
import { formatDate, formatMoney } from '../../lib/format';
import { Button } from './Button';
import { IconCalendar, IconMapPin, IconCheckCircle } from '../icons';

interface UpcomingShiftCardProps {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime?: string;
  address: string;
  cost: string;
  onCheckIn?: () => void;
}

export function UpcomingShiftCard({
  id,
  title,
  date,
  startTime,
  endTime,
  address,
  cost,
  onCheckIn,
}: UpcomingShiftCardProps) {
  const timeLabel = endTime ? `${startTime} · ${endTime}` : startTime;

  return (
    <div className="sc-card overflow-hidden">
      <Link to={`/shifts/${id}`} className="block p-4">
        <div className="flex gap-3.5">
          <div className="shift-photo w-[72px] h-[72px] rounded-[14px] shrink-0" />
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-[15px] text-slate-900 leading-snug">{title}</h3>
            <div className="flex items-center gap-1.5 mt-2 text-[13px] text-slate-500">
              <IconCalendar className="w-3.5 h-3.5 shrink-0" />
              <span>
                {formatDate(date)} · {timeLabel}
              </span>
            </div>
            <div className="flex items-start gap-1.5 mt-1 text-[13px] text-slate-500">
              <IconMapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span className="line-clamp-2 leading-snug">{address}</span>
            </div>
            <p className="text-[22px] font-bold text-brand-600 mt-2">{formatMoney(cost)}</p>
          </div>
        </div>
      </Link>
      {onCheckIn && (
        <div className="px-4 pb-4">
          <Button fullWidth onClick={onCheckIn} className="gap-2">
            <IconCheckCircle className="w-5 h-5" />
            Отметиться на смене
          </Button>
        </div>
      )}
    </div>
  );
}
