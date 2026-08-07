import { motion } from 'framer-motion'
import { formatDistanceToNow, format } from 'date-fns'
import { Clock, Database, Lock, Trash2, FileText, ShieldOff, Archive } from 'lucide-react'
import { useRecentActivity } from '@/hooks/useAIMF'
import { Card, DecisionBadge, ErrorState, SkeletonCard } from '@/components/ui'
import type { TimelineEvent } from '@/types'
import clsx from 'clsx'

const EVENT_CONFIG: Record<TimelineEvent['type'], { icon: React.ElementType; color: string; bg: string; label: string }> = {
  store:     { icon: Database,  color: 'text-emerald-400', bg: 'bg-emerald-500/12 border-emerald-500/20', label: 'Stored'    },
  encrypt:   { icon: Lock,      color: 'text-indigo-400',  bg: 'bg-indigo-500/12 border-indigo-500/20',   label: 'Encrypted' },
  forget:    { icon: Trash2,    color: 'text-red-400',     bg: 'bg-red-500/12 border-red-500/20',         label: 'Forgotten' },
  summarize: { icon: FileText,  color: 'text-amber-400',   bg: 'bg-amber-500/12 border-amber-500/20',     label: 'Summarised'},
  expire:    { icon: Archive,   color: 'text-slate-400',   bg: 'bg-slate-700/40 border-slate-600/20',     label: 'Expired'   },
  access:    { icon: ShieldOff, color: 'text-slate-400',   bg: 'bg-slate-700/40 border-slate-600/20',     label: 'Accessed'  },
}

export default function TimelinePage() {
  const { data: events = [], isLoading, isError, refetch } = useRecentActivity()

  // Group by date
  const grouped = events.reduce<Record<string, TimelineEvent[]>>((acc, e) => {
    const day = format(new Date(e.timestamp), 'yyyy-MM-dd')
    if (!acc[day]) acc[day] = []
    acc[day].push(e)
    return acc
  }, {})

  if (isError) return <ErrorState onRetry={refetch} />

  return (
    <div className="max-w-[900px] mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/20">
          <Clock className="h-4.5 w-4.5 text-amber-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Timeline</h2>
          <p className="text-xs text-slate-500 mt-0.5">Chronological history of all memory pipeline decisions</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : (
        Object.entries(grouped).map(([day, dayEvents]) => (
          <div key={day}>
            {/* Day header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-white/[0.06]" />
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                {format(new Date(day), 'EEEE, MMMM d')}
              </span>
              <div className="h-px flex-1 bg-white/[0.06]" />
            </div>

            {/* Events */}
            <div className="relative space-y-3 pl-10">
              {/* Vertical line */}
              <div className="absolute left-[18px] top-2 bottom-2 w-px bg-white/[0.06]" />

              {dayEvents.map((event, i) => {
                const cfg = EVENT_CONFIG[event.type]
                const Icon = cfg.icon
                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="relative"
                  >
                    {/* Dot */}
                    <div className={clsx(
                      'absolute -left-10 flex h-7 w-7 items-center justify-center rounded-full border',
                      cfg.bg, cfg.color
                    )}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>

                    <Card hover className="group">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className={clsx('text-xs font-semibold', cfg.color)}>{cfg.label}</span>
                            <DecisionBadge decision={event.decision} />
                          </div>
                          <p className="text-sm text-slate-300 leading-snug group-hover:text-white transition-colors">
                            {event.memory_excerpt}
                          </p>
                        </div>
                        <div className="flex-shrink-0 text-right space-y-1">
                          <p className={clsx(
                            'text-sm font-mono font-bold',
                            event.amgs_score >= 0.7 ? 'text-emerald-400' :
                            event.amgs_score >= 0.4 ? 'text-amber-400'   : 'text-red-400'
                          )}>
                            {event.amgs_score.toFixed(3)}
                          </p>
                          <p className="text-[10px] text-slate-600">
                            {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                          </p>
                          <p className="text-[10px] text-slate-600">
                            {format(new Date(event.timestamp), 'HH:mm')}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
