import { format } from 'date-fns'
import { Lock, Eye, ChevronRight } from 'lucide-react'
import { DecisionBadge, SensitivityBadge } from '@/components/ui'
import type { Memory } from '@/types'
import clsx from 'clsx'

interface MemoryRowProps {
  memory: Memory
  onClick: () => void
}

export default function MemoryRow({ memory, onClick }: MemoryRowProps) {
  const amgsColor =
    memory.amgs_score >= 0.7 ? 'text-emerald-400' :
    memory.amgs_score >= 0.4 ? 'text-amber-400' : 'text-red-400'

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-4 px-4 py-3.5 bg-white/[0.01] hover:bg-white/[0.04] cursor-pointer transition-colors group"
    >
      {/* Encrypted indicator */}
      {memory.is_encrypted ? (
        <Lock className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />
      ) : (
        <div className="h-3.5 w-3.5 flex-shrink-0" />
      )}

      {/* Badges */}
      <div className="flex gap-2 flex-shrink-0">
        <DecisionBadge decision={memory.decision} />
        <SensitivityBadge level={memory.sensitivity} />
      </div>

      {/* Content */}
      <p className="flex-1 text-sm text-slate-400 truncate group-hover:text-slate-200 transition-colors">
        {memory.is_encrypted
          ? `${memory.content.slice(0, 50)}… [encrypted]`
          : memory.content}
      </p>

      {/* AMGS */}
      <span className={clsx('font-mono text-xs font-semibold flex-shrink-0 w-12 text-right', amgsColor)}>
        {memory.amgs_score.toFixed(3)}
      </span>

      {/* Access */}
      <span className="flex items-center gap-1 text-[10px] text-slate-600 flex-shrink-0 w-8">
        <Eye className="h-3 w-3" />
        {memory.access_count}
      </span>

      {/* Date */}
      <span className="text-[10px] text-slate-600 flex-shrink-0 hidden sm:block w-14 text-right">
        {format(new Date(memory.created_at), 'MMM d')}
      </span>

      <ChevronRight className="h-3.5 w-3.5 text-slate-600 group-hover:text-slate-300 flex-shrink-0 transition-colors" />
    </div>
  )
}
