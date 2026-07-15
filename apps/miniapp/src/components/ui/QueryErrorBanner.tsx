import { Button } from './Button';

interface QueryErrorBannerProps {
  message?: string;
  onRetry?: () => void;
}

export function QueryErrorBanner({
  message = 'Не удалось загрузить данные',
  onRetry,
}: QueryErrorBannerProps) {
  return (
    <div className="sc-card p-4 border-red-200 bg-red-50 text-center space-y-3">
      <p className="text-[14px] text-red-700">{message}</p>
      {onRetry && (
        <Button variant="secondary" className="!py-2 text-sm" onClick={onRetry}>
          Повторить
        </Button>
      )}
    </div>
  );
}
