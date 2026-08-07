import { motion } from 'framer-motion'
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { Card, CardTitle, ProgressBar } from '@/components/ui'
import clsx from 'clsx'

interface StorageSummaryProps {
  totalMemories: number
  activeMemories: number
  storageEfficiency: number
  memoriesVsYesterday: number
  miniTrend: { date: string; stored: number }[]
}

function MiniTooltip({ active, payload }: { active?: boolean; payload?: { value: number }[] }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-white/[0.1] bg-[#141720] px-2.5 py-1.5 text-xs shadow-lg">
      <span className="text-white font-mono">{payload[0].value}</span>
      <span className="text-slate-500 ml-1">stored</span>
    </div>
  )
}

export default function StorageSummary({
  totalMemories,
  activeMemories,
  storageEfficiency,
  memoriesVsYesterday,
  miniTrend,
}: StorageSummaryProps) {
  const activePct = totalMemories > 0 ? (activeMemories / totalMemories) * 100 : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <Card className="h-full">
        <div className="flex items-start justify-between mb-1">
          <CardTitle>Storage Overview</CardTitle>
          <span className={clsx(
            'text-xs font-medium font-mono',
            memoriesVsYesterday >= 0 ? 'text-emerald-400' : 'text-red-400'
          )}>
            {memoriesVsYesterday >= 0 ? '+' : ''}{memoriesVsYesterday} today
          </span>
        </div>

        {/* Mini sparkline */}
        <div className="my-3 h-16 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={miniTrend} margin={{ top: 4, bottom: 0, left: 0, right: 0 }}>
              <defs>
                <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" hide />
              <Area
                type="monotone"
                dataKey="stored"
                stroke="#6366f1"
                strokeWidth={1.5}
                fill="url(#sparkGradient)"
                dot={false}
                animationDuration={800}
              />
              <Tooltip content={<MiniTooltip />} cursor={{ stroke: 'rgba(99,102,241,0.3)', strokeWidth: 1 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Stats grid */}
        <div className="space-y-3">
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Total memories</span>
            <span className="font-mono text-white">{totalMemories.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Active</span>
            <span className="font-mono text-emerald-400">{activeMemories.toLocaleString()}</span>
          </div>

          <div className="pt-1 space-y-2">
            <ProgressBar
              value={activePct}
              label="Active ratio"
              showValue={false}
              color="indigo"
              size="sm"
            />
            <ProgressBar
              value={storageEfficiency * 100}
              label="Storage efficiency"
              showValue={false}
              color="cyan"
              size="sm"
            />
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
