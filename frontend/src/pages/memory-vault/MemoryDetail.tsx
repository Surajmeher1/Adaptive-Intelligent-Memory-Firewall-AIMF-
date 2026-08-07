import { format } from 'date-fns'
import { Lock, Calendar, Eye, Hash, Clock, Activity } from 'lucide-react'
import { Modal, DecisionBadge, SensitivityBadge, StatusBadge, ProgressBar, Divider } from '@/components/ui'
import type { Memory } from '@/types'
import clsx from 'clsx'

interface MemoryDetailProps {
  memory: Memory | null
  onClose: () => void
}

const FACTORS = [
  { key: 'usefulness',        label: 'Usefulness',         color: 'indigo'  as const },
  { key: 'context_relevance', label: 'Context Relevance',  color: 'cyan'    as const },
  { key: 'frequency',         label: 'Frequency',          color: 'emerald' as const },
  { key: 'novelty',           label: 'Novelty',            color: 'indigo'  as const },
  { key: 'redundancy',        label: 'Redundancy',         color: 'amber'   as const },
  { key: 'privacy_risk',      label: 'Privacy Risk',       color: 'red'     as const },
  { key: 'temporal_decay',    label: 'Temporal Longevity', color: 'cyan'    as const },
] as const

export default function MemoryDetail({ memory, onClose }: MemoryDetailProps) {
  if (!memory) return null

  const amgsColor =
    memory.amgs_score >= 0.7 ? 'text-emerald-400' :
    memory.amgs_score >= 0.4 ? 'text-amber-400' : 'text-red-400'

  const amgsBarColor: 'emerald' | 'amber' | 'red' =
    memory.amgs_score >= 0.7 ? 'emerald' :
    memory.amgs_score >= 0.4 ? 'amber' : 'red'

  return (
    <Modal
      isOpen={!!memory}
      onClose={onClose}
      size="lg"
      title="Memory Detail"
      description={`ID: ${memory.id} · Session: ${memory.session_id}`}
    >
      <div className="space-y-5 max-h-[70vh] overflow-y-auto -mx-1 px-1">

        {/* ── Badges ─────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2">
          <DecisionBadge decision={memory.decision} size="md" />
          <SensitivityBadge level={memory.sensitivity} />
          <StatusBadge status={memory.status} />
          {memory.is_encrypted && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/25 bg-indigo-500/15 px-2.5 py-1 text-xs font-medium text-indigo-300">
              <Lock className="h-3 w-3" /> Encrypted
            </span>
          )}
        </div>

        {/* ── Content ────────────────────────────────────────────── */}
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Memory Content</p>
          <p className="text-sm text-slate-200 leading-relaxed">
            {memory.is_encrypted ? (
              <span className="text-indigo-300 italic">
                🔒 Content is encrypted and cannot be displayed in plaintext.
              </span>
            ) : memory.content}
          </p>
        </div>

        {/* ── Explanation ─────────────────────────────────────────── */}
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">AIMF Explanation</p>
          <p className="text-sm text-slate-400 leading-relaxed">{memory.explanation}</p>
        </div>

        {/* ── AMGS Score ──────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3 text-center">
            <p className="text-[10px] uppercase tracking-widest text-slate-600">AMGS Score</p>
            <p className={clsx('text-2xl font-bold font-mono mt-1', amgsColor)}>
              {memory.amgs_score.toFixed(3)}
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3 text-center">
            <p className="text-[10px] uppercase tracking-widest text-slate-600">Confidence</p>
            <p className="text-2xl font-bold font-mono mt-1 text-white">
              {(memory.confidence * 100).toFixed(0)}%
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3 text-center">
            <p className="text-[10px] uppercase tracking-widest text-slate-600">Accesses</p>
            <p className="text-2xl font-bold font-mono mt-1 text-white">
              {memory.access_count}
            </p>
          </div>
        </div>

        {/* ── AMGS Factors ────────────────────────────────────────── */}
        <div>
          <p className="text-xs font-semibold text-white mb-3">AMGS Factor Breakdown</p>
          <div className="space-y-2.5">
            {FACTORS.map((f) => {
              const val = memory.factors[f.key as keyof typeof memory.factors] as number
              const isNegative = f.key === 'redundancy' || f.key === 'privacy_risk'
              const color = isNegative && val > 0.5 ? 'red' as const : f.color
              return (
                <ProgressBar
                  key={f.key}
                  value={val}
                  max={1}
                  label={f.label}
                  showValue
                  color={color}
                  size="sm"
                />
              )
            })}
          </div>
        </div>

        <Divider />

        {/* ── Metadata ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          {[
            { icon: Calendar, label: 'Created',       value: format(new Date(memory.created_at), 'PPp') },
            { icon: Eye,      label: 'Last Accessed', value: format(new Date(memory.last_accessed), 'PPp') },
            { icon: Clock,    label: 'Expires',       value: memory.expires_at ? format(new Date(memory.expires_at), 'PP') : 'Never' },
            { icon: Activity, label: 'Category',      value: memory.memory_category.replace('_', ' ') },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label}>
              <p className="text-[10px] uppercase tracking-wider text-slate-600 flex items-center gap-1.5 mb-1">
                <Icon className="h-3 w-3" /> {label}
              </p>
              <p className="text-slate-300 capitalize">{value}</p>
            </div>
          ))}
        </div>

      </div>
    </Modal>
  )
}
