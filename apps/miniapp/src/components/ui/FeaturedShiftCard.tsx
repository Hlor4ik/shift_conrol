import { Link } from 'react-router-dom';
import { formatDate, formatMoney, formatRelativeDay } from '../../lib/format';
import { Button } from './Button';
import { Badge } from './Badge';
import { IconCalendar, IconMapPin, IconBuilding } from '../icons';

interface FeaturedShiftProps {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime?: string;
  address: string;
  cost: string;
  company?: string;
  onCheckIn?: () => void;
  checkInLabel?: string;
}

export function FeaturedShiftCard({
  id,
  title,
  date,
  startTime,
  endTime,
  address,
  cost,
  company,
  onCheckIn,
  checkInLabel = 'Отметиться на смене',
}: FeaturedShiftProps) {
  const timeLabel = endTime ? `${startTime} – ${endTime}` : startTime;

  return (
    <div className="featured-shift rounded-3xl overflow-hidden shadow-glow text-white">
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-white/80">Следующая смена</p>
          <Badge className="!bg-white/20 !text-white border-0">{formatRelativeDay(date)}</Badge>
        </div>
        <Link to={`/shifts/${id}`} className="block">
          <div className="flex gap-3 items-start">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <IconBuilding className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold leading-snug">{title}</h2>
              {company && <p className="text-sm text-white/80 mt-0.5">{company}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 text-sm text-white/90">
            <IconCalendar className="w-4 h-4 shrink-0" />
            <span>
              {formatDate(date)} · {timeLabel}
            </span>
          </div>
          <div className="flex items-start gap-2 mt-2 text-sm text-white/90">
            <IconMapPin className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="line-clamp-2">{address}</span>
          </div>
          <p className="text-2xl font-bold mt-4">{formatMoney(cost)}</p>
        </Link>
      </div>
      {onCheckIn && (
        <div className="px-5 pb-5">
          <Button
            fullWidth
            className="!bg-white !text-tg-button hover:!opacity-95"
            onClick={onCheckIn}
          >
            {checkInLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
