import { Link } from 'react-router-dom';
import { formatDateShort, formatMoney } from '../../lib/format';
import { Badge } from './Badge';
import { IconCalendar, IconMapPin, shiftIconColors, shiftIcons } from '../icons';

export interface ShiftListItem {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  cost: string;
  address: string;
  bookedWorkers: number;
  maxWorkers: number;
  company: { name: string };
}

export function ShiftCard({ shift, index = 0 }: { shift: ShiftListItem; index?: number }) {
  const free = shift.maxWorkers - shift.bookedWorkers;
  const Icon = shiftIcons[index % shiftIcons.length];
  const color = shiftIconColors[index % shiftIconColors.length];

  return (
    <Link to={`/shifts/${shift.id}`} className="block">
      <article className="sc-card p-4 active:scale-[0.99] transition-transform">
        <div className="flex gap-3">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1 flex flex-col">
            <div>
              <p className="font-bold text-[15px] text-slate-900 leading-snug">{shift.title}</p>
              <p className="text-[13px] text-slate-500 mt-0.5">{shift.company.name}</p>
            </div>
            <div className="mt-2">
              <Badge variant={free > 0 ? 'success' : 'danger'}>
                {free > 0 ? `${free} мест из ${shift.maxWorkers}` : 'Мест нет'}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 mt-2.5 text-[13px] text-slate-500">
              <IconCalendar className="w-3.5 h-3.5 shrink-0" />
              <span>
                {formatDateShort(shift.date)} · {shift.startTime} – {shift.endTime}
              </span>
            </div>
            <div className="flex items-start gap-1.5 mt-1 text-[13px] text-slate-500">
              <IconMapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span className="line-clamp-1 flex-1">{shift.address}</span>
            </div>
            <p className="text-[18px] font-bold text-brand-600 mt-2 self-end">{formatMoney(shift.cost)}</p>
          </div>
        </div>
      </article>
    </Link>
  );
}
