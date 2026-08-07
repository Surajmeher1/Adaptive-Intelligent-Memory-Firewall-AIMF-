import clsx from 'clsx'
import { AlertTriangle, Inbox, SearchX, WifiOff } from 'lucide-react'
import { Button } from './Button'

// ─── Empty State ──────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={clsx('flex flex-col items-center justify-center py-16 text-center px-4', className)}>
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/[0.07] text-slate-500">
        {icon ?? <Inbox className="h-7 w-7" />}
      </div>
      <h3 className="text-sm font-semibold text-slate-300">{title}</h3>
      {description && <p className="mt-1.5 text-sm text-slate-600 max-w-xs">{description}</p>}
      {action && (
        <Button variant="outline" size="sm" className="mt-5" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}

// ─── Empty Search State ───────────────────────────────────────────────────────

export function EmptySearchState({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <EmptyState
      icon={<SearchX className="h-7 w-7" />}
      title={`No results for "${query}"`}
      description="Try different keywords or remove filters."
      action={{ label: 'Clear search', onClick: onClear }}
    />
  )
}

// ─── Error State ──────────────────────────────────────────────────────────────

interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'An unexpected error occurred. Please try again.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div className={clsx('flex flex-col items-center justify-center py-16 text-center px-4', className)}>
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20">
        <AlertTriangle className="h-7 w-7 text-red-400" />
      </div>
      <h3 className="text-sm font-semibold text-red-300">{title}</h3>
      <p className="mt-1.5 text-sm text-slate-600 max-w-xs">{description}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

// ─── Offline State ────────────────────────────────────────────────────────────

export function OfflineState({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      icon={<WifiOff className="h-7 w-7" />}
      title="You're offline"
      description="Check your connection and try again."
      action={onRetry ? { label: 'Retry', onClick: onRetry } : undefined}
    />
  )
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

interface AvatarProps {
  label?: string
  src?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

const avatarSizes = {
  xs: 'h-6 w-6 text-[9px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
}

export function Avatar({ label = 'A', src, size = 'md', className }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={label}
        className={clsx('rounded-full object-cover flex-shrink-0', avatarSizes[size], className)}
      />
    )
  }
  return (
    <div
      className={clsx(
        'flex flex-shrink-0 items-center justify-center rounded-full font-bold',
        'bg-gradient-to-br from-indigo-500 to-cyan-400 text-white',
        avatarSizes[size],
        className
      )}
    >
      {label.charAt(0).toUpperCase()}
    </div>
  )
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

interface TooltipProps {
  content: string
  children: React.ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
}

export function Tooltip({ content, children, side = 'top' }: TooltipProps) {
  const positionClass = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }[side]

  return (
    <div className="group relative inline-flex">
      {children}
      <span
        className={clsx(
          'pointer-events-none absolute z-50 whitespace-nowrap rounded-lg',
          'bg-[#1a1e2e] border border-white/[0.1] px-2.5 py-1.5',
          'text-[11px] font-medium text-slate-200 shadow-lg',
          'opacity-0 group-hover:opacity-100 transition-opacity duration-150',
          positionClass
        )}
      >
        {content}
      </span>
    </div>
  )
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

interface ProgressBarProps {
  value: number        // 0–100
  max?: number
  label?: string
  showValue?: boolean
  color?: 'indigo' | 'cyan' | 'emerald' | 'amber' | 'red'
  size?: 'sm' | 'md'
  className?: string
}

const progressColors = {
  indigo:  'bg-indigo-500',
  cyan:    'bg-cyan-400',
  emerald: 'bg-emerald-400',
  amber:   'bg-amber-400',
  red:     'bg-red-400',
}

export function ProgressBar({ value, max = 100, label, showValue = false, color = 'indigo', size = 'md', className }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className={clsx('space-y-1', className)}>
      {(label || showValue) && (
        <div className="flex justify-between">
          {label && <span className="text-xs text-slate-400">{label}</span>}
          {showValue && <span className="text-xs font-mono text-slate-500">{value.toFixed(2)}</span>}
        </div>
      )}
      <div className={clsx('w-full rounded-full bg-white/[0.06]', size === 'sm' ? 'h-1' : 'h-1.5')}>
        <div
          className={clsx('h-full rounded-full transition-all duration-700', progressColors[color])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ─── Divider ─────────────────────────────────────────────────────────────────

export function Divider({ label, className }: { label?: string; className?: string }) {
  if (label) {
    return (
      <div className={clsx('flex items-center gap-3', className)}>
        <div className="flex-1 border-t border-white/[0.07]" />
        <span className="text-[11px] text-slate-600 uppercase tracking-wider">{label}</span>
        <div className="flex-1 border-t border-white/[0.07]" />
      </div>
    )
  }
  return <div className={clsx('border-t border-white/[0.07]', className)} />
}
