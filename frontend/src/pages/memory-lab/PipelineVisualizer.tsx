import { motion } from 'framer-motion'
import { CheckCircle2, Loader2, SkipForward } from 'lucide-react'

const STAGES = [
  { name: 'Content Ingestion',       desc: 'Tokenising and normalising input text' },
  { name: 'Privacy Scan',            desc: 'Detecting PII, financial and medical data' },
  { name: 'Semantic Embedding',      desc: 'Computing vector representation' },
  { name: 'AMGS Score Computation',  desc: 'Weighing 7 utility factors' },
  { name: 'Decision Engine',         desc: 'Mapping score to governance decision' },
  { name: 'Storage Routing',         desc: 'Dispatching to appropriate memory tier' },
]

export default function PipelineVisualizer() {
  return (
    <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/[0.03] p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          className="h-5 w-5 rounded-full border-2 border-indigo-500 border-t-transparent"
        />
        <h3 className="text-sm font-semibold text-white">AIMF Pipeline Running</h3>
        <span className="ml-auto text-[11px] text-indigo-400 font-mono">Processing…</span>
      </div>

      {/* Stages */}
      <div className="space-y-2">
        {STAGES.map((stage, i) => (
          <StageRow key={stage.name} stage={stage} index={i} total={STAGES.length} />
        ))}
      </div>
    </div>
  )
}

function StageRow({ stage, index, total }: { stage: { name: string; desc: string }; index: number; total: number }) {
  // Stagger so stages appear to complete sequentially
  const STAGE_DURATION = 1400 / total
  const startDelay = index * (STAGE_DURATION / 1000)

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: startDelay * 0.3, duration: 0.25 }}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5"
    >
      {/* Status icon cycles: pending → active → done */}
      <StatusIcon index={index} total={total} />

      {/* Stage info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-white">{stage.name}</p>
        <p className="text-[10px] text-slate-600 mt-0.5">{stage.desc}</p>
      </div>

      {/* Stage progress bar */}
      <StageBar index={index} total={total} />
    </motion.div>
  )
}

function StatusIcon({ index, total }: { index: number; total: number }) {
  // Approximate which stage is "active" based on timing
  const activeFraction = 0.5
  const activeStage = Math.floor(activeFraction * total)

  if (index < activeStage) {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: index * 0.1 }}
      >
        <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
      </motion.div>
    )
  }
  if (index === activeStage) {
    return (
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="flex-shrink-0"
      >
        <Loader2 className="h-4 w-4 text-indigo-400" />
      </motion.div>
    )
  }
  return (
    <div className="h-4 w-4 rounded-full border border-white/[0.15] flex-shrink-0" />
  )
}

function StageBar({ index, total }: { index: number; total: number }) {
  const activeFraction = 0.5
  const activeStage = Math.floor(activeFraction * total)

  const width = index < activeStage ? '100%' : index === activeStage ? '55%' : '0%'

  return (
    <div className="w-20 flex-shrink-0">
      <div className="h-1 w-full rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          className={index < activeStage ? 'h-full bg-emerald-500' : 'h-full bg-indigo-500'}
          initial={{ width: '0%' }}
          animate={{ width }}
          transition={{ duration: 0.5, delay: index * 0.08 }}
        />
      </div>
    </div>
  )
}
