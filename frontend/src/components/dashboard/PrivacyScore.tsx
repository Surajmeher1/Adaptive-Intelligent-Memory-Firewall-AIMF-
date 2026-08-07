import { motion } from 'framer-motion'
import { Shield, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react'
import { Card, CardTitle, ProgressBar } from '@/components/ui'
import clsx from 'clsx'

interface PrivacyScoreProps {
  score: number          // 0–1
  encryptedCount: number
  totalCount: number
  privacyEventsToday: number
}

function getScoreConfig(score: number) {
  if (score >= 0.85) return { label: 'Excellent',  icon: ShieldCheck, color: 'text-emerald-400', barColor: 'emerald' as const, bg: 'bg-emerald-500/10 border-emerald-500/20' }
  if (score >= 0.65) return { label: 'Good',       icon: Shield,      color: 'text-indigo-400',  barColor: 'indigo'  as const, bg: 'bg-indigo-500/10 border-indigo-500/20'  }
  if (score >= 0.40) return { label: 'Fair',       icon: ShieldAlert, color: 'text-amber-400',   barColor: 'amber'   as const, bg: 'bg-amber-500/10 border-amber-500/20'   }
  return              { label: 'At Risk',           icon: ShieldX,     color: 'text-red-400',     barColor: 'red'     as const, bg: 'bg-red-500/10 border-red-500/20'       }
}

export default function PrivacyScore({ score, encryptedCount, totalCount, privacyEventsToday }: PrivacyScoreProps) {
  const cfg = getScoreConfig(score)
  const Icon = cfg.icon
  const encryptedPct = totalCount > 0 ? (encryptedCount / totalCount) * 100 : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
    >
      <Card className="h-full">
        <div className="flex items-start justify-between mb-4">
          <div>
            <CardTitle>Privacy Score</CardTitle>
            <p className="text-[11px] text-slate-600 mt-0.5">Computed across all stored memories</p>
          </div>
          <div className={clsx('flex h-9 w-9 items-center justify-center rounded-xl border', cfg.bg)}>
            <Icon className={clsx('h-4.5 w-4.5', cfg.color)} />
          </div>
        </div>

        {/* Big score */}
        <div className="flex items-end gap-3 mb-4">
          <span className={clsx('text-4xl font-bold tracking-tight', cfg.color)}>
            {Math.round(score * 100)}
          </span>
          <span className="text-slate-500 text-sm mb-1">/100</span>
          <span className={clsx(
            'ml-auto mb-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border',
            cfg.bg, cfg.color
          )}>
            {cfg.label}
          </span>
        </div>

        {/* Score bar */}
        <ProgressBar value={score * 100} color={cfg.barColor} size="md" />

        {/* Breakdown */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 text-center">
            <p className="text-lg font-bold text-indigo-400 font-mono">{encryptedCount}</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-600 mt-0.5">Encrypted</p>
            <p className="text-[10px] text-slate-500">{encryptedPct.toFixed(0)}% of total</p>
          </div>
          <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 text-center">
            <p className={clsx('text-lg font-bold font-mono', privacyEventsToday > 10 ? 'text-amber-400' : 'text-emerald-400')}>
              {privacyEventsToday}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-slate-600 mt-0.5">Events Today</p>
            <p className="text-[10px] text-slate-500">Privacy triggers</p>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
