'use client';

interface QueryErrorBannerProps {
  message?: string;
  onRetry?: () => void;
}

export function QueryErrorBanner({ message = 'Не удалось загрузить данные', onRetry }: QueryErrorBannerProps) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between gap-3">
      <span>{message}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="font-semibold underline shrink-0">
          Повторить
        </button>
      )}
    </div>
  );
}
