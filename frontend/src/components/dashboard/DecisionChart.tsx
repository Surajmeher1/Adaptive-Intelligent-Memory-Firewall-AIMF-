import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { motion } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardDescription, SkeletonCard } from '@/components/ui'
import type { DecisionDistribution } from '@/types'

const COLORS: Record<string, string> = {
  STORE:           '#10b981',
  STORE_ENCRYPTED: '#6366f1',
  LONG_TERM:       '#06b6d4',
  SUMMARIZE:       '#f59e0b',
  FORGET:          '#ef4444',
  REJECT_PRIVACY:  '#dc2626',
}

const LABELS: Record<string, string> = {
  STORE:           'Store',
  STORE_ENCRYPTED: 'Encrypted',
  LONG_TERM:       'Long-term',
  SUMMARIZE:       'Summarize',
  FORGET:          'Forget',
  REJECT_PRIVACY:  'Rejected',
}

interface DecisionChartProps {
  data: DecisionDistribution[]
  loading?: boolean
}

// Custom tooltip
function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: DecisionDistribution; value: number }[] }) {
  if (!active || !payload?.length) return null
  const item = payload[0].payload
  return (
    <div className="rounded-xl border border-white/[0.1] bg-[#141720] px-4 py-3 shadow-xl text-sm">
      <p className="font-semibold text-white">{LABELS[item.decision]}</p>
      <p className="text-slate-400 mt-0.5">
        <span className="font-mono text-white">{item.count.toLocaleString()}</span> memories
      </p>
      <p className="text-slate-500 text-[11px]">{item.percentage.toFixed(1)}% of total</p>
    </div>
  )
}

// Custom legend
function CustomLegend({ data }: { data: DecisionDistribution[] }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5">
      {data.map((item) => (
        <div key={item.decision} className="flex items-center gap-2 min-w-0">
          <span
            className="h-2 w-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: COLORS[item.decision] }}
          />
          <span className="text-[11px] text-slate-400 truncate">{LABELS[item.decision]}</span>
          <span className="ml-auto text-[11px] font-mono text-slate-500 flex-shrink-0">
            {item.percentage.toFixed(0)}%
          </span>
        </div>
      ))}
    </div>
  )
}

export default function DecisionChart({ data, loading = false }: DecisionChartProps) {
  if (loading) return <SkeletonCard className="h-[340px]" />

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.15 }}
    >
      <Card className="h-full">
        <CardHeader>
          <div>
            <CardTitle>Decision Distribution</CardTitle>
            <CardDescription className="mt-0.5">Memory routing outcomes across all sessions</CardDescription>
          </div>
        </CardHeader>

        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={54}
              outerRadius={80}
              paddingAngle={3}
              dataKey="count"
              animationBegin={100}
              animationDuration={800}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.decision}
                  fill={COLORS[entry.decision]}
                  stroke="transparent"
                  style={{ filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.4))' }}
                />
              ))}
            </Pie>
            <Tooltip
              content={<CustomTooltip />}
              cursor={false}
            />
          </PieChart>
        </ResponsiveContainer>

        <CustomLegend data={data} />
      </Card>
    </motion.div>
  )
}
