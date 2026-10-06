import { motion } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { BarChart3, TrendingUp, PieChart as PieIcon, Calendar } from 'lucide-react'
import { useAnalyticsTrends, useAnalyticsBreakdowns } from '@/hooks/useAIMF'
import { Card, CardTitle, CardDescription, SkeletonCard, ErrorState, Badge } from '@/components/ui'

// ─── Shared tooltip style ─────────────────────────────────────────────────────

function ChartTooltip({
  active, payload, label,
}: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-white/[0.1] bg-[#141720] px-4 py-3 shadow-xl text-xs space-y-1.5">
      {label && <p className="font-semibold text-slate-400 mb-2">{label}</p>}
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-slate-400 capitalize">{p.name}:</span>
          <span className="font-mono text-white font-semibold">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Category pie colours ─────────────────────────────────────────────────────

const CAT_COLORS: Record<string, string> = {
  personal:     '#8b5cf6',
  factual:      '#38bdf8',
  preference:   '#6366f1',
  sensitive:    '#f87171',
  task:         '#fbbf24',
  conversation: '#34d399',
  temporal:     '#94a3b8',
}

const SENSITIVITY_COLORS: Record<string, string> = {
  none:     '#475569',
  low:      '#10b981',
  medium:   '#f59e0b',
  high:     '#ef4444',
  critical: '#dc2626',
}

// ─── Analytics Page ───────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const trendsQuery     = useAnalyticsTrends()
  const breakdownsQuery = useAnalyticsBreakdowns()

  const trends     = trendsQuery.data     ?? []
  const breakdowns = breakdownsQuery.data

  if (trendsQuery.isError || breakdownsQuery.isError) {
    return <ErrorState onRetry={() => { trendsQuery.refetch(); breakdownsQuery.refetch() }} />
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 border border-violet-500/20">
          <BarChart3 className="h-4.5 w-4.5 text-violet-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Analytics</h2>
          <p className="text-xs text-slate-500 mt-0.5">Charts, trends and statistical breakdowns</p>
        </div>
      </div>

      {/* ── 7-day Activity Trend (full width) ───────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        {trendsQuery.isLoading ? <SkeletonCard className="h-72" /> : (
          <Card padding="lg">
            <CardHeader>
              <TrendingUp className="h-4 w-4 text-indigo-400" />
              <CardTitle>7-Day Activity Trend</CardTitle>
              <CardDescription>Daily memory pipeline volume</CardDescription>
              <div className="ml-auto flex gap-2">
                {['stored','forgotten','encrypted','analyzed'].map((k, i) => (
                  <Badge key={k} tone={(['indigo','red','cyan','emerald'] as const)[i]} size="sm">{k}</Badge>
                ))}
              </div>
            </CardHeader>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trends} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  {[
                    { id: 'stored',   color: '#6366f1' },
                    { id: 'forgotten',color: '#ef4444' },
                    { id: 'encrypted',color: '#06b6d4' },
                    { id: 'analyzed', color: '#10b981' },
                  ].map(({ id, color }) => (
                    <linearGradient key={id} id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={color} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={color} stopOpacity={0}   />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.06)' }} />
                <Area type="monotone" dataKey="analyzed" stroke="#10b981" strokeWidth={1.5} fill="url(#grad-analyzed)" dot={false} />
                <Area type="monotone" dataKey="stored"   stroke="#6366f1" strokeWidth={1.5} fill="url(#grad-stored)"   dot={false} />
                <Area type="monotone" dataKey="encrypted"stroke="#06b6d4" strokeWidth={1.5} fill="url(#grad-encrypted)" dot={false} />
                <Area type="monotone" dataKey="forgotten"stroke="#ef4444" strokeWidth={1.5} fill="url(#grad-forgotten)"dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        )}
      </motion.div>

      {/* ── Row 2: AMGS Histogram + Category Pie ────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-5">

        {/* AMGS Score Distribution (bar) */}
        <motion.div className="lg:col-span-3" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          {breakdownsQuery.isLoading ? <SkeletonCard className="h-72" /> : (
            <Card padding="lg" className="h-full">
              <CardHeader>
                <BarChart3 className="h-4 w-4 text-amber-400" />
                <CardTitle>AMGS Score Distribution</CardTitle>
                <CardDescription>Memory count per score range</CardDescription>
              </CardHeader>
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={breakdowns?.amgs_distribution ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                  barCategoryGap="20%">
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="range" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    content={({ active, payload, label }) =>
                      active && payload?.length ? (
                        <div className="rounded-xl border border-white/[0.1] bg-[#141720] px-4 py-3 shadow-xl text-xs">
                          <p className="text-slate-400 mb-1">Range: <span className="text-white font-mono">{label}</span></p>
                          <p className="text-indigo-300 font-mono font-bold">{payload[0].value} memories</p>
                        </div>
                      ) : null
                    }
                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {(breakdowns?.amgs_distribution ?? []).map((entry, i) => {
                      const score = i / 10
                      const color = score >= 0.7 ? '#10b981' : score >= 0.4 ? '#f59e0b' : '#ef4444'
                      return <Cell key={i} fill={color} fillOpacity={0.8} />
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </motion.div>

        {/* Category Breakdown (donut) */}
        <motion.div className="lg:col-span-2" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          {breakdownsQuery.isLoading ? <SkeletonCard className="h-72" /> : (
            <Card padding="lg" className="h-full">
              <CardHeader>
                <PieIcon className="h-4 w-4 text-violet-400" />
                <CardTitle>By Category</CardTitle>
              </CardHeader>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie
                    data={breakdowns?.categories ?? []}
                    cx="50%" cy="50%"
                    innerRadius={42} outerRadius={64}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="category"
                    animationDuration={800}
                  >
                    {(breakdowns?.categories ?? []).map((entry) => (
                      <Cell key={entry.category} fill={CAT_COLORS[entry.category] ?? '#6366f1'} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) =>
                      active && payload?.length ? (
                        <div className="rounded-xl border border-white/[0.1] bg-[#141720] px-3 py-2 shadow-xl text-xs">
                          <p className="capitalize text-white font-semibold">{payload[0].name}</p>
                          <p className="text-slate-400">{payload[0].value} memories · {(payload[0].payload as { pct: number }).pct}%</p>
                        </div>
                      ) : null
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1.5">
                {(breakdowns?.categories ?? []).slice(0, 5).map((c) => (
                  <div key={c.category} className="flex items-center gap-2 text-[11px]">
                    <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: CAT_COLORS[c.category] }} />
                    <span className="text-slate-500 capitalize flex-1">{c.category}</span>
                    <span className="font-mono text-slate-400">{c.pct}%</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </motion.div>
      </div>

      {/* ── Row 3: Monthly Overview + Sensitivity ───────────────────── */}
      <div className="grid gap-5 lg:grid-cols-3">

        {/* Monthly Overview */}
        <motion.div className="lg:col-span-2" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          {breakdownsQuery.isLoading ? <SkeletonCard className="h-64" /> : (
            <Card padding="lg">
              <CardHeader>
                <Calendar className="h-4 w-4 text-cyan-400" />
                <CardTitle>Monthly Overview</CardTitle>
                <CardDescription>Total memories vs privacy events per month</CardDescription>
              </CardHeader>
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={breakdowns?.monthly ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="total"          name="Total"          fill="#6366f1" fillOpacity={0.7} radius={[3,3,0,0]} />
                  <Bar dataKey="privacy_events" name="Privacy Events" fill="#ef4444" fillOpacity={0.7} radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </motion.div>

        {/* Sensitivity Breakdown */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          {breakdownsQuery.isLoading ? <SkeletonCard className="h-64" /> : (
            <Card padding="lg" className="h-full">
              <CardHeader>
                <CardTitle>Sensitivity Levels</CardTitle>
              </CardHeader>
              <div className="space-y-3 mt-2">
                {(breakdowns?.sensitivity ?? []).map((s) => (
                  <div key={s.level} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="capitalize text-slate-400">{s.level}</span>
                      <span className="font-mono text-slate-500">{s.count} · {s.pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: SENSITIVITY_COLORS[s.level] }}
                        initial={{ width: 0 }}
                        animate={{ width: `${s.pct}%` }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary pill */}
              <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/[0.05] p-3 text-center">
                <p className="text-xs text-slate-500">Critical + High sensitivity</p>
                <p className="text-lg font-bold text-red-400 font-mono mt-0.5">
                  {((breakdowns?.sensitivity.find(s => s.level === 'critical')?.pct ?? 0) +
                    (breakdowns?.sensitivity.find(s => s.level === 'high')?.pct ?? 0)).toFixed(1)}%
                </p>
                <p className="text-[10px] text-slate-600 mt-0.5">require special handling</p>
              </div>
            </Card>
          )}
        </motion.div>
      </div>

    </div>
  )
}

// ─── CardHeader helper ────────────────────────────────────────────────────────
function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-2 mb-4 flex-wrap">{children}</div>
}
