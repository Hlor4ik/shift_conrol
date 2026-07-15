import clsx from 'clsx';

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('skeleton', className)} />;
}

export function SkeletonList({ count = 3, height = 'h-28' }: { count?: number; height?: string }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={height} />
      ))}
    </div>
  );
}

export function LoadingScreen({ message = 'Загрузка...' }: { message?: string }) {
  return (
    <div className="min-h-[60dvh] flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 rounded-2xl bg-tg-button/10 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-tg-button border-t-transparent rounded-full animate-spin" />
      </div>
      <p className="text-sm text-tg-hint">{message}</p>
    </div>
  );
}
