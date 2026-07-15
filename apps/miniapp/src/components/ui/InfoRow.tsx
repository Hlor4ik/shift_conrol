import { ReactNode } from 'react';

export function InfoRow({
  icon,
  label,
  value,
  action,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-brand-600 mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-slate-400 text-[12px] font-medium">{label}</p>
        <p className="font-medium text-[14px] text-slate-900 mt-0.5 leading-snug">{value}</p>
      </div>
      {action}
    </div>
  );
}
