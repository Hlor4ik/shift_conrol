import { getBotUsername } from '../../lib/telegram';

export function AppFooter() {
  const bot = getBotUsername();
  return (
    <div className="text-center py-6 space-y-1">
      <p className="text-[12px] text-slate-400">ShiftControl v1.0.0</p>
      <p className="text-[12px] text-slate-400">Поддержка: @{bot}</p>
    </div>
  );
}

export function MapPlaceholder({ address }: { address?: string }) {
  return (
    <div className="sc-card overflow-hidden h-44 flex flex-col items-center justify-center gap-2 px-4 text-center bg-gradient-to-br from-blue-50 to-slate-50">
      <div className="w-11 h-11 rounded-full bg-blue-50 text-brand-600 flex items-center justify-center">
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 21s7-4.5 7-11a7 7 0 10-14 0c0 6.5 7 11 7 11z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      </div>
      <p className="text-[13px] font-medium text-slate-700">Карта объекта</p>
      {address && <p className="text-[12px] text-slate-400 line-clamp-2">{address}</p>}
    </div>
  );
}
