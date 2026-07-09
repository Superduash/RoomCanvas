import { cn } from '../../lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn('skeleton-pulse rounded-lg bg-border', className)}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={cn('rounded-xl border border-border bg-surface p-5 space-y-3 shadow-xs', className)}>
      <Skeleton className="h-40 w-full rounded-lg" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function SkeletonText({ lines = 3, className }: SkeletonProps & { lines?: number }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-3.5', i === lines - 1 ? 'w-2/3' : 'w-full')}
        />
      ))}
    </div>
  );
}

export function SkeletonAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-16 w-16' : 'h-10 w-10';
  return <Skeleton className={cn('rounded-full flex-shrink-0', s)} />;
}
