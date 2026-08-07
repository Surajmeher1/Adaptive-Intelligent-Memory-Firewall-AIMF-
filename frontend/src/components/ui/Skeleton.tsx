import clsx from 'clsx'

// ─── Skeleton ─────────────────────────────────────────────────────────────────

interface SkeletonProps {
  className?: string
  width?: string
  height?: string
  rounded?: string
}

export function Skeleton({ className, width, height, rounded = 'rounded-md' }: SkeletonProps) {
  return (
    <div
      className={clsx('skeleton', rounded, className)}
      style={{ width, height }}
      aria-hidden="true"
    />
  )
}

// ─── Skeleton presets ─────────────────────────────────────────────────────────

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={clsx('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={clsx('h-3', i === lines - 1 ? 'w-3/4' : 'w-full')}
        />
      ))}
    </div>
  )
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={clsx('rounded-xl border border-white/[0.07] bg-white/[0.03] p-5 space-y-4', className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-2.5 w-1/2" />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  )
}

export function SkeletonStat({ className }: { className?: string }) {
  return (
    <div className={clsx('rounded-xl border border-white/[0.07] bg-white/[0.03] p-5 space-y-3', className)}>
      <div className="flex justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="h-7 w-16" />
      <Skeleton className="h-2.5 w-32" />
    </div>
  )
}
