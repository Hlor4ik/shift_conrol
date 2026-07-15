import { ReactNode } from 'react';
import { Button } from './Button';

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center text-center py-10 px-4">
      <div className="w-16 h-16 rounded-3xl bg-tg-button/10 text-tg-button flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-lg text-tg-text">{title}</h3>
      {description && <p className="text-sm text-tg-hint mt-2 max-w-xs">{description}</p>}
      {actionLabel && onAction && (
        <Button variant="secondary" className="mt-5" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
