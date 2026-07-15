import clsx from 'clsx';
import { ReactNode } from 'react';
import { IconChevronLeft } from '../icons';

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div>
        <h1 className="text-[22px] font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="text-[13px] text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function BackButton({
  onClick,
  className,
  label = 'Назад',
}: {
  onClick: () => void;
  className?: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'inline-flex items-center gap-1.5 text-[14px] font-semibold rounded-full px-3 py-2',
        'bg-white/95 text-slate-900 shadow-sc-card border border-white/80',
        className,
      )}
    >
      <IconChevronLeft className="w-5 h-5" />
      {label}
    </button>
  );
}

export function PageTopBar({
  onBack,
  title,
}: {
  onBack: () => void;
  title?: string;
}) {
  return (
    <div className="sticky top-0 z-30 -mx-4 px-4 py-2 bg-[#f4f6fb]/95 backdrop-blur border-b border-slate-200/60">
      <div className="max-w-lg mx-auto flex items-center gap-3">
        <BackButton onClick={onBack} className="!bg-white !shadow-none !border-slate-200 shrink-0" />
        {title && <h1 className="text-[16px] font-bold text-slate-900 truncate">{title}</h1>}
      </div>
    </div>
  );
}
