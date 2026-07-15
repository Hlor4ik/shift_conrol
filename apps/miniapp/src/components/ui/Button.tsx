import clsx from 'clsx';
import { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white shadow-sm active:scale-[0.98] hover:bg-brand-700',
  secondary: 'bg-white text-slate-700 border border-slate-200 active:scale-[0.98]',
  outline: 'border-2 border-brand-600 text-brand-600 bg-transparent active:scale-[0.98]',
  ghost: 'text-brand-600 bg-transparent',
  danger: 'bg-red-50 text-red-600 border border-red-100 active:scale-[0.98]',
};

export function Button({
  variant = 'primary',
  fullWidth,
  loading,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-[14px] px-5 py-3.5 text-[15px] font-semibold transition-all disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        fullWidth && 'w-full',
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? 'Загрузка...' : children}
    </button>
  );
}
