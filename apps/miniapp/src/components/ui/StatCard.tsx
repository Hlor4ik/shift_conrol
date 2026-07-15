import clsx from 'clsx';
import { ReactNode } from 'react';

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent,
  wide,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: ReactNode;
  accent: 'amber' | 'blue' | 'green';
  wide?: boolean;
}) {
  const iconBg = {
    amber: 'bg-amber-50 text-amber-500',
    blue: 'bg-blue-50 text-brand-600',
    green: 'bg-emerald-50 text-emerald-600',
  };

  if (wide) {
    return (
      <div className="sc-card p-4 flex items-center gap-4">
        <div className={clsx('w-11 h-11 rounded-full flex items-center justify-center shrink-0', iconBg[accent])}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[13px] text-slate-500 font-medium">{label}</p>
          <p className="text-[26px] font-bold text-emerald-600 leading-tight mt-0.5">{value}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sc-card p-4">
      <div className={clsx('w-10 h-10 rounded-full flex items-center justify-center mb-3', iconBg[accent])}>
        {icon}
      </div>
      <p className="text-[13px] text-slate-500 font-medium">{label}</p>
      <p className="text-[28px] font-bold text-slate-900 leading-none mt-1">{value}</p>
      {hint && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}
