import { format } from 'date-fns'
import { Lock, Eye } from 'lucide-react'
import { DecisionBadge, SensitivityBadge, ProgressBar } from '@/components/ui'
import type { Memory } from '@/types'
import clsx from 'clsx'

interface MemoryCardProps {
  memory: Memory
  onClick: () => void
}

const CATEGORY_COLORS: Record<string, string> = {
  personal:     'text-violet-400',
  factual:      'text-sky-400',
  preference:   'text-indigo-400',
  sensitive:    'text-red-400',
  task:         'text-amber-400',
  conversation: 'text-emerald-400',
  temporal:     'text-slate-400',
}

export default function MemoryCard({ memory, onClick }: MemoryCardProps) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'group relative flex flex-col gap-3 rounded-xl border p-4 cursor-pointer',
        'bg-white/[0.02] border-white/[0.07]',
        'transition-all duration-200',
        'hover:border-indigo-500/25 hover:bg-white/[0.04]',
        'hover:shadow-lg hover:shadow-indigo-500/5'
      )}
    >
      {/* Encrypted lock watermark */}
      {memory.is_encrypted && (
        <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-md bg-indigo-500/20 text-indigo-400">
          <Lock className="h-3 w-3" />
        </div>
      )}

      {/* Top row */}
      <div className="flex items-start gap-2 flex-wrap pr-6">
        <DecisionBadge decision={memory.decision} />
        <SensitivityBadge level={memory.sensitivity} />
      </div>

      {/* Content */}
      <p className="text-sm text-slate-300 leading-relaxed line-clamp-3 group-hover:text-white transition-colors">
        {memory.is_encrypted
          ? `🔒 ${memory.content.slice(0, 30)}…  [encrypted]`
          : memory.content}
      </p>

      {/* AMGS bar */}
      <ProgressBar
        value={memory.amgs_score}
        max={1}
        label="AMGS"
        showValue
        color={memory.amgs_score >= 0.7 ? 'emerald' : memory.amgs_score >= 0.4 ? 'amber' : 'red'}
        size="sm"
      />

      {/* Footer */}
      <div className="flex items-center gap-3 text-[10px] text-slate-600 pt-1 border-t border-white/[0.05]">
        <span className={clsx('capitalize font-medium', CATEGORY_COLORS[memory.memory_category])}>
          {memory.memory_category}
        </span>
        <span className="flex items-center gap-1 ml-auto">
          <Eye className="h-3 w-3" />
          {memory.access_count}
        </span>
        <span>{format(new Date(memory.created_at), 'MMM d')}</span>
      </div>
    </div>
  )
}
