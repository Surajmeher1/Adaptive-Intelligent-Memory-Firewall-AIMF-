import { motion } from 'framer-motion'
import clsx from 'clsx'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Skeleton } from '@/components/ui'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  iconColor?: string
  trend?: number        // positive = up, negative = down, 0 = neutral
  trendLabel?: string
  loading?: boolean
  delay?: number
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconColor = 'bg-indigo-500/15 text-indigo-400',
  trend,
  trendLabel,
  loading = false,
  delay = 0,
}: StatCardProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-5 space-y-4">
        <div className="flex justify-between">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-9 w-9 rounded-xl" />
        </div>
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-2.5 w-36" />
      </div>
    )
  }

  const trendPositive = trend !== undefined && trend > 0
  const trendNegative = trend !== undefined && trend < 0
  const trendNeutral  = trend === 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      className={clsx(
        'relative overflow-hidden rounded-xl border border-white/[0.07]',
        'bg-white/[0.03] p-5 transition-all duration-200',
        'hover:border-white/[0.12] hover:bg-white/[0.05]',
        'group'
      )}
    >
      {/* Subtle background glow */}
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-indigo-500/5 blur-2xl transition-all duration-500 group-hover:bg-indigo-500/10" />

      {/* Header row */}
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{title}</p>
        <div className={clsx('flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0', iconColor)}>
          {icon}
        </div>
      </div>

      {/* Value */}
      <div className="mt-3">
        <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
        {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
      </div>

      {/* Trend */}
      {trend !== undefined && (
        <div className="mt-3 flex items-center gap-1.5">
          {trendPositive && <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />}
          {trendNegative && <TrendingDown className="h-3.5 w-3.5 text-red-400" />}
          {trendNeutral  && <Minus className="h-3.5 w-3.5 text-slate-500" />}
          <span
            className={clsx(
              'text-[11px] font-medium',
              trendPositive ? 'text-emerald-400' : trendNegative ? 'text-red-400' : 'text-slate-500'
            )}
          >
            {trend > 0 ? '+' : ''}{trend}{trendLabel ?? ''}
          </span>
          <span className="text-[11px] text-slate-600">vs yesterday</span>
        </div>
      )}
    </motion.div>
  )
}
