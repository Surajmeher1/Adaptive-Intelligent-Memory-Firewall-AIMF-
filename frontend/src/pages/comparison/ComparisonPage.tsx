import { motion } from 'framer-motion'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  ResponsiveContainer,
} from 'recharts'
import { GitCompare, Trophy } from 'lucide-react'
import { useAlgorithmComparison } from '@/hooks/useAIMF'
import { Card, CardTitle, CardDescription, Badge, SkeletonCard, ErrorState } from '@/components/ui'
import clsx from 'clsx'

const METRICS = ['precision','recall','f1_score','privacy_preservation','storage_efficiency'] as const
const METRIC_LABELS: Record<string, string> = {
  precision:             'Precision',
  recall:                'Recall',
  f1_score:              'F1 Score',
  privacy_preservation:  'Privacy',
  storage_efficiency:    'Efficiency',
}

const ALGO_COLORS: Record<string, string> = {
  'AIMF (Proposed)':      '#6366f1',
  'Full Storage (Baseline)':'#ef4444',
  'LRU Eviction':          '#f59e0b',
  'Forget-All':            '#94a3b8',
  'TF-IDF Scoring':        '#06b6d4',
  'Semantic Similarity':   '#10b981',
}

function MetricTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-white/[0.1] bg-[#141720] px-4 py-3 shadow-xl text-xs space-y-1.5">
      <p className="font-semibold text-white mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-slate-400">{p.name}:</span>
          <span className="font-mono text-white">{(p.value * 100).toFixed(1)}%</span>
        </div>
      ))}
    </div>
  )
}

export default function ComparisonPage() {
  const { data: algorithms = [], isLoading, isError, refetch } = useAlgorithmComparison()

  if (isError) return <ErrorState onRetry={refetch} />

  // Radar data — one entry per metric
  const radarData = METRICS.map((m) => ({
    metric: METRIC_LABELS[m],
    ...Object.fromEntries(algorithms.map((a) => [a.algorithm, a[m]])),
  }))

  const aimf = algorithms.find((a) => a.algorithm === 'AIMF (Proposed)')

  return (
    <div className="max-w-[1300px] mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 border border-violet-500/20">
          <GitCompare className="h-4.5 w-4.5 text-violet-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Algorithm Comparison</h2>
          <p className="text-xs text-slate-500 mt-0.5">AIMF vs baseline memory management strategies</p>
        </div>
        {aimf && (
          <div className="ml-auto flex items-center gap-2 rounded-xl border border-indigo-500/25 bg-indigo-500/[0.07] px-4 py-2">
            <Trophy className="h-4 w-4 text-amber-400" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">AIMF F1 Score</p>
              <p className="text-lg font-bold font-mono text-indigo-300">{(aimf.f1_score * 100).toFixed(1)}%</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">

        {/* Radar chart */}
        {isLoading ? <SkeletonCard className="h-80" /> : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            <Card padding="lg">
              <CardTitle>Multi-metric Radar</CardTitle>
              <CardDescription className="mb-4">All algorithms across 5 dimensions</CardDescription>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                  <PolarGrid stroke="rgba(255,255,255,0.06)" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <PolarRadiusAxis domain={[0, 1]} tick={false} axisLine={false} />
                  {algorithms.slice(0, 3).map((algo) => (
                    <Radar
                      key={algo.algorithm}
                      name={algo.algorithm}
                      dataKey={algo.algorithm}
                      stroke={ALGO_COLORS[algo.algorithm] ?? '#6366f1'}
                      fill={ALGO_COLORS[algo.algorithm] ?? '#6366f1'}
                      fillOpacity={algo.algorithm === 'AIMF (Proposed)' ? 0.18 : 0.05}
                      strokeWidth={algo.algorithm === 'AIMF (Proposed)' ? 2 : 1}
                    />
                  ))}
                </RadarChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>
        )}

        {/* F1 + Privacy bar chart */}
        {isLoading ? <SkeletonCard className="h-80" /> : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
            <Card padding="lg">
              <CardTitle>F1 Score vs Privacy Preservation</CardTitle>
              <CardDescription className="mb-4">Higher is better for both metrics</CardDescription>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={algorithms} layout="vertical" margin={{ top: 0, right: 10, left: 60, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" horizontal={false} />
                  <XAxis type="number" domain={[0, 1]} tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => `${(v*100).toFixed(0)}%`} />
                  <YAxis type="category" dataKey="algorithm" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} width={58} />
                  <Tooltip content={<MetricTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="f1_score"            name="F1 Score" radius={[0,3,3,0]} barSize={7}>
                    {algorithms.map((a) => <Cell key={a.algorithm} fill={ALGO_COLORS[a.algorithm] ?? '#6366f1'} fillOpacity={0.9} />)}
                  </Bar>
                  <Bar dataKey="privacy_preservation" name="Privacy"  radius={[0,3,3,0]} barSize={7} fill="#10b981" fillOpacity={0.4} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Comparison table */}
      {isLoading ? <SkeletonCard className="h-56" /> : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card padding="lg">
            <CardTitle className="mb-4">Full Metrics Table</CardTitle>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.07]">
                    <th className="pb-3 text-left text-[10px] uppercase tracking-wider text-slate-500 pr-4">Algorithm</th>
                    {['Precision','Recall','F1','Privacy','Efficiency','Latency'].map(h => (
                      <th key={h} className="pb-3 text-right text-[10px] uppercase tracking-wider text-slate-500 px-2">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {algorithms.map((a) => {
                    const isAIMF = a.algorithm === 'AIMF (Proposed)'
                    return (
                      <tr key={a.algorithm} className={clsx(isAIMF && 'bg-indigo-500/[0.04]')}>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: ALGO_COLORS[a.algorithm] }} />
                            <span className={clsx('text-xs', isAIMF ? 'text-indigo-300 font-semibold' : 'text-slate-300')}>
                              {a.algorithm}
                            </span>
                            {isAIMF && <Badge tone="indigo" size="sm">Proposed</Badge>}
                          </div>
                        </td>
                        {[a.precision, a.recall, a.f1_score, a.privacy_preservation, a.storage_efficiency].map((v, i) => (
                          <td key={i} className={clsx(
                            'py-3 px-2 text-right font-mono text-xs',
                            v >= 0.85 ? 'text-emerald-400' : v >= 0.6 ? 'text-white' : 'text-red-400'
                          )}>
                            {(v * 100).toFixed(1)}%
                          </td>
                        ))}
                        <td className="py-3 px-2 text-right font-mono text-xs text-slate-400">
                          {a.latency_ms}ms
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
