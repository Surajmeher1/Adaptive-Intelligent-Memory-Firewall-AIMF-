import { motion } from 'framer-motion'
import {
  CheckCircle2, XCircle, SkipForward, Clock, Zap,
} from 'lucide-react'
import {
  DecisionBadge, SensitivityBadge, StatusBadge, Card, CardTitle, ProgressBar,
} from '@/components/ui'
import type { AnalysisResult as AnalysisResultType } from '@/types'
import clsx from 'clsx'

// ─── AMGS Factor labels & descriptions ───────────────────────────────────────

const FACTORS = [
  { key: 'usefulness',         label: 'Usefulness',          color: 'indigo'  as const, desc: 'How useful will this memory be in future contexts?' },
  { key: 'context_relevance',  label: 'Context Relevance',   color: 'cyan'    as const, desc: 'How relevant is this to the current session context?' },
  { key: 'frequency',          label: 'Access Frequency',    color: 'emerald' as const, desc: 'How often has similar content been accessed?' },
  { key: 'novelty',            label: 'Novelty',             color: 'indigo'  as const, desc: 'Does this introduce new, non-redundant information?' },
  { key: 'redundancy',         label: 'Redundancy',          color: 'amber'   as const, desc: 'Overlap with existing stored memories (lower = better)' },
  { key: 'privacy_risk',       label: 'Privacy Risk',        color: 'red'     as const, desc: 'Likelihood of containing sensitive/private data' },
  { key: 'temporal_decay',     label: 'Temporal Longevity',  color: 'cyan'    as const, desc: 'Expected relevance lifespan of this memory' },
] as const

// ─── Decision config ──────────────────────────────────────────────────────────

const DECISION_CONFIG = {
  STORE:           { label: 'Store',           emoji: '💾', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/25' },
  STORE_ENCRYPTED: { label: 'Store Encrypted', emoji: '🔒', color: 'text-indigo-300',  bg: 'bg-indigo-500/10 border-indigo-500/25'  },
  LONG_TERM:       { label: 'Long-term Store', emoji: '📌', color: 'text-cyan-300',    bg: 'bg-cyan-500/10 border-cyan-500/25'      },
  SUMMARIZE:       { label: 'Summarise',       emoji: '📝', color: 'text-amber-300',   bg: 'bg-amber-500/10 border-amber-500/25'    },
  FORGET:          { label: 'Forget',          emoji: '🗑️', color: 'text-red-300',     bg: 'bg-red-500/10 border-red-500/25'        },
  REJECT_PRIVACY:  { label: 'Reject (Privacy)',emoji: '🚫', color: 'text-red-400',     bg: 'bg-red-500/12 border-red-500/30'        },
} as const

interface AnalysisResultProps {
  result: AnalysisResultType
}

export default function AnalysisResult({ result }: AnalysisResultProps) {
  const { memory, pipeline_stages, processing_time_ms } = result
  const factors = memory.factors
  const dcfg = DECISION_CONFIG[memory.decision]
  const amgsPct = memory.amgs_score * 100
  const amgsColor = amgsPct >= 70 ? '#10b981' : amgsPct >= 40 ? '#f59e0b' : '#ef4444'

  return (
    <div className="space-y-5">

      {/* ── Decision Result Banner ──────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35 }}
        className={clsx('rounded-xl border p-5', dcfg.bg)}
      >
        <div className="flex items-start gap-4">
          <span className="text-3xl flex-shrink-0 mt-0.5">{dcfg.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h3 className={clsx('text-lg font-bold', dcfg.color)}>
                Decision: {dcfg.label}
              </h3>
              <DecisionBadge decision={memory.decision} size="md" />
              <SensitivityBadge level={memory.sensitivity} />
              <StatusBadge status={memory.status} />
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">{memory.explanation}</p>
          </div>
        </div>
      </motion.div>

      {/* ── Scores Grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">

        {/* AMGS Score gauge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="col-span-2 sm:col-span-1 rounded-xl border border-white/[0.07] bg-white/[0.03] p-5 flex flex-col items-center justify-center"
        >
          <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-3">AMGS Score</p>
          <AMGSGauge score={memory.amgs_score} color={amgsColor} />
          <p className="text-[11px] text-slate-500 mt-3">
            Confidence: <span className="text-white font-mono">{(memory.confidence * 100).toFixed(0)}%</span>
          </p>
        </motion.div>

        {/* Memory category */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4 space-y-3"
        >
          <p className="text-[10px] uppercase tracking-widest text-slate-500">Category</p>
          <p className="text-sm font-semibold text-white capitalize">{memory.memory_category.replace('_', ' ')}</p>
          <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-2">Encrypted</p>
          <p className={clsx('text-sm font-semibold', memory.is_encrypted ? 'text-indigo-300' : 'text-slate-400')}>
            {memory.is_encrypted ? '🔒 Yes' : 'No'}
          </p>
        </motion.div>

        {/* Processing time */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4 space-y-3"
        >
          <p className="text-[10px] uppercase tracking-widest text-slate-500">Pipeline Time</p>
          <p className="text-2xl font-bold text-white font-mono">{processing_time_ms}<span className="text-sm text-slate-500 ml-1">ms</span></p>
          <p className="text-[10px] text-slate-600">{pipeline_stages.filter(s => s.status === 'completed').length} stages completed</p>
        </motion.div>
      </div>

      {/* ── AMGS Factor Breakdown ─────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Card>
          <CardTitle className="mb-4">AMGS Factor Breakdown</CardTitle>
          <div className="space-y-3.5">
            {FACTORS.map((f, i) => {
              const val = factors[f.key as keyof typeof factors] as number
              const isRedFactor = f.key === 'redundancy' || f.key === 'privacy_risk'
              const effectiveColor = isRedFactor && val > 0.5 ? 'red' as const : f.color
              return (
                <motion.div
                  key={f.key}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.04 }}
                >
                  <ProgressBar
                    value={val}
                    max={1}
                    label={f.label}
                    showValue
                    color={effectiveColor}
                    size="md"
                  />
                  <p className="text-[10px] text-slate-600 mt-1 ml-0.5">{f.desc}</p>
                </motion.div>
              )
            })}
          </div>
        </Card>
      </motion.div>

      {/* ── Pipeline Stages ───────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <Card>
          <CardTitle className="mb-4">Pipeline Stage Log</CardTitle>
          <div className="space-y-2">
            {pipeline_stages.map((stage, i) => (
              <motion.div
                key={stage.name}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.05 }}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 bg-white/[0.02] border border-white/[0.05]"
              >
                {/* Status icon */}
                {stage.status === 'completed' && <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />}
                {stage.status === 'failed'    && <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />}
                {stage.status === 'skipped'   && <SkipForward className="h-4 w-4 text-slate-500 flex-shrink-0" />}

                <span className="flex-1 text-xs text-slate-300">{stage.name}</span>

                <span className={clsx(
                  'text-[10px] capitalize rounded-full px-2 py-0.5 border font-medium',
                  stage.status === 'completed' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                  stage.status === 'skipped'   ? 'text-slate-500 bg-white/[0.04] border-white/[0.08]'     :
                  'text-red-400 bg-red-500/10 border-red-500/20'
                )}>
                  {stage.status}
                </span>

                {stage.duration_ms > 0 && (
                  <div className="flex items-center gap-1 text-[10px] text-slate-600 w-16 justify-end flex-shrink-0">
                    <Clock className="h-3 w-3" />
                    {stage.duration_ms}ms
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Total */}
          <div className="mt-3 flex items-center gap-1.5 justify-end border-t border-white/[0.06] pt-3">
            <Zap className="h-3.5 w-3.5 text-indigo-400" />
            <span className="text-xs text-slate-500">Total pipeline time:</span>
            <span className="text-xs font-mono text-indigo-300 font-semibold">{processing_time_ms}ms</span>
          </div>
        </Card>
      </motion.div>

    </div>
  )
}

// ─── AMGS Gauge (SVG arc) ─────────────────────────────────────────────────────

function AMGSGauge({ score, color }: { score: number; color: string }) {
  const SIZE = 120
  const STROKE = 9
  const R = (SIZE - STROKE * 2) / 2
  const CIRCUMFERENCE = Math.PI * R           // Half-circle
  const OFFSET = CIRCUMFERENCE * (1 - score)  // How much to hide

  return (
    <div className="relative flex items-center justify-center" style={{ width: SIZE, height: SIZE / 2 + STROKE }}>
      <svg width={SIZE} height={SIZE / 2 + STROKE} viewBox={`0 0 ${SIZE} ${SIZE / 2 + STROKE}`} overflow="visible">
        {/* Track */}
        <path
          d={`M ${STROKE} ${SIZE / 2} A ${R} ${R} 0 0 1 ${SIZE - STROKE} ${SIZE / 2}`}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={STROKE}
          strokeLinecap="round"
        />
        {/* Fill */}
        <motion.path
          d={`M ${STROKE} ${SIZE / 2} A ${R} ${R} 0 0 1 ${SIZE - STROKE} ${SIZE / 2}`}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          initial={{ strokeDashoffset: CIRCUMFERENCE }}
          animate={{ strokeDashoffset: OFFSET }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
          style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
        />
      </svg>
      {/* Centre label */}
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-0">
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-2xl font-bold font-mono"
          style={{ color }}
        >
          {score.toFixed(3)}
        </motion.span>
      </div>
    </div>
  )
}
