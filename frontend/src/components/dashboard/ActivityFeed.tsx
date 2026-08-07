import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import {
  Database, Lock, Trash2, FileText, ShieldOff, Clock
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, DecisionBadge, SkeletonCard } from '@/components/ui'
import type { TimelineEvent } from '@/types'
import clsx from 'clsx'

const EVENT_ICONS: Record<TimelineEvent['type'], { icon: React.ReactNode; color: string; bg: string }> = {
  store:     { icon: <Database className="h-3.5 w-3.5" />,  color: 'text-emerald-400', bg: 'bg-emerald-500/12 border-emerald-500/20' },
  encrypt:   { icon: <Lock className="h-3.5 w-3.5" />,      color: 'text-indigo-400',  bg: 'bg-indigo-500/12 border-indigo-500/20' },
  forget:    { icon: <Trash2 className="h-3.5 w-3.5" />,    color: 'text-red-400',     bg: 'bg-red-500/12 border-red-500/20' },
  summarize: { icon: <FileText className="h-3.5 w-3.5" />,  color: 'text-amber-400',   bg: 'bg-amber-500/12 border-amber-500/20' },
  expire:    { icon: <Clock className="h-3.5 w-3.5" />,     color: 'text-slate-400',   bg: 'bg-slate-700/40 border-slate-600/20' },
  access:    { icon: <ShieldOff className="h-3.5 w-3.5" />, color: 'text-slate-400',   bg: 'bg-slate-700/40 border-slate-600/20' },
}

interface ActivityFeedProps {
  events: TimelineEvent[]
  loading?: boolean
}

export default function ActivityFeed({ events, loading = false }: ActivityFeedProps) {
  if (loading) return <SkeletonCard className="h-[400px]" />

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="h-full"
    >
      <Card className="h-full flex flex-col">
        <CardHeader>
          <div>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription className="mt-0.5">Latest memory pipeline decisions</CardDescription>
          </div>
          {/* Live indicator */}
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[10px] uppercase tracking-wider text-emerald-500 font-medium">Live</span>
          </div>
        </CardHeader>

        <div className="flex-1 space-y-1 overflow-y-auto max-h-[320px] pr-1">
          {events.map((event, i) => {
            const cfg = EVENT_ICONS[event.type]
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: i * 0.05 }}
                className="flex items-start gap-3 rounded-lg p-2.5 transition-colors hover:bg-white/[0.03] group"
              >
                {/* Icon */}
                <div className={clsx(
                  'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border',
                  cfg.bg, cfg.color
                )}>
                  {cfg.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-300 leading-snug line-clamp-2 group-hover:text-white transition-colors">
                    {event.memory_excerpt}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <DecisionBadge decision={event.decision} />
                    <span className="text-[10px] text-slate-600">
                      {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                {/* AMGS Score */}
                <div className="flex-shrink-0 text-right">
                  <span className={clsx(
                    'text-[11px] font-mono font-semibold',
                    event.amgs_score >= 0.7 ? 'text-emerald-400' :
                    event.amgs_score >= 0.4 ? 'text-amber-400'   : 'text-red-400'
                  )}>
                    {event.amgs_score.toFixed(3)}
                  </span>
                  <p className="text-[9px] text-slate-600 uppercase tracking-wider">AMGS</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </Card>
    </motion.div>
  )
}
