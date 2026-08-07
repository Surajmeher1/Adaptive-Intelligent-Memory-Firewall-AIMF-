import clsx from 'clsx'
import type { DecisionType, SensitivityLevel, MemoryStatus } from '@/types'

// ─── Badge ────────────────────────────────────────────────────────────────────

export type BadgeTone =
  | 'default'
  | 'indigo'
  | 'cyan'
  | 'emerald'
  | 'amber'
  | 'red'
  | 'violet'
  | 'slate'

interface BadgeProps {
  children: React.ReactNode
  tone?: BadgeTone
  size?: 'sm' | 'md'
  dot?: boolean
  className?: string
}

const tones: Record<BadgeTone, string> = {
  default: 'bg-white/[0.07] text-slate-300 border-white/[0.1]',
  indigo:  'bg-indigo-500/15 text-indigo-300 border-indigo-500/25',
  cyan:    'bg-cyan-500/15 text-cyan-300 border-cyan-500/25',
  emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
  amber:   'bg-amber-500/15 text-amber-300 border-amber-500/25',
  red:     'bg-red-500/15 text-red-300 border-red-500/25',
  violet:  'bg-violet-500/15 text-violet-300 border-violet-500/25',
  slate:   'bg-slate-700/60 text-slate-400 border-slate-600/40',
}

const dotColors: Record<BadgeTone, string> = {
  default: 'bg-slate-400',
  indigo:  'bg-indigo-400',
  cyan:    'bg-cyan-400',
  emerald: 'bg-emerald-400',
  amber:   'bg-amber-400',
  red:     'bg-red-400',
  violet:  'bg-violet-400',
  slate:   'bg-slate-500',
}

export function Badge({ children, tone = 'default', size = 'sm', dot = false, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        tones[tone],
        className
      )}
    >
      {dot && <span className={clsx('h-1.5 w-1.5 rounded-full flex-shrink-0', dotColors[tone])} />}
      {children}
    </span>
  )
}

// ─── Decision Badge ───────────────────────────────────────────────────────────

const decisionConfig: Record<DecisionType, { label: string; tone: BadgeTone }> = {
  STORE:           { label: 'Store',          tone: 'emerald' },
  STORE_ENCRYPTED: { label: 'Encrypted',      tone: 'indigo'  },
  SUMMARIZE:       { label: 'Summarize',      tone: 'amber'   },
  FORGET:          { label: 'Forget',         tone: 'red'     },
  REJECT_PRIVACY:  { label: 'Reject',         tone: 'red'     },
  LONG_TERM:       { label: 'Long-term',      tone: 'cyan'    },
}

export function DecisionBadge({ decision, size = 'sm' }: { decision: DecisionType; size?: 'sm' | 'md' }) {
  const config = decisionConfig[decision]
  return <Badge tone={config.tone} size={size} dot>{config.label}</Badge>
}

// ─── Sensitivity Badge ────────────────────────────────────────────────────────

const sensitivityConfig: Record<SensitivityLevel, { label: string; tone: BadgeTone }> = {
  none:     { label: 'None',     tone: 'slate'   },
  low:      { label: 'Low',      tone: 'emerald' },
  medium:   { label: 'Medium',   tone: 'amber'   },
  high:     { label: 'High',     tone: 'red'     },
  critical: { label: 'Critical', tone: 'red'     },
}

export function SensitivityBadge({ level }: { level: SensitivityLevel }) {
  const config = sensitivityConfig[level]
  return <Badge tone={config.tone} dot>{config.label}</Badge>
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

const statusConfig: Record<MemoryStatus, { label: string; tone: BadgeTone }> = {
  active:   { label: 'Active',   tone: 'emerald' },
  expired:  { label: 'Expired',  tone: 'amber'   },
  forgotten:{ label: 'Forgotten',tone: 'red'     },
  archived: { label: 'Archived', tone: 'slate'   },
}

export function StatusBadge({ status }: { status: MemoryStatus }) {
  const config = statusConfig[status]
  return <Badge tone={config.tone} dot>{config.label}</Badge>
}
