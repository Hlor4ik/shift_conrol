import clsx from 'clsx';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

const styles: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-600',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-600',
  info: 'bg-blue-50 text-blue-700',
};

export function Badge({
  children,
  variant = 'default',
  className,
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span className={clsx('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium', styles[variant], className)}>
      {children}
    </span>
  );
}

export const paymentStatusVariant: Record<string, BadgeVariant> = {
  PENDING: 'warning',
  PROCESSING: 'info',
  PAID: 'success',
  CANCELLED: 'default',
};

export const paymentStatusLabel: Record<string, string> = {
  PENDING: 'Ожидает',
  PROCESSING: 'В обработке',
  PAID: 'Выплачено',
  CANCELLED: 'Отменено',
};

export const attendanceStatusVariant: Record<string, BadgeVariant> = {
  PRESENT: 'success',
  FULL_SHIFT: 'success',
  LATE: 'warning',
  LEFT_EARLY: 'warning',
  ABSENT: 'danger',
};

export const attendanceStatusLabel: Record<string, string> = {
  PRESENT: 'Присутствовал',
  ABSENT: 'Не пришёл',
  LATE: 'Опоздал',
  LEFT_EARLY: 'Ушёл раньше',
  FULL_SHIFT: 'Полная смена',
};
