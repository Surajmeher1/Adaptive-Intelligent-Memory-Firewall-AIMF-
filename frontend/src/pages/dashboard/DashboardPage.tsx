import { useNavigate } from 'react-router-dom'
import {
  Brain, Lock, Trash2, Activity,
  FlaskConical, Database, ArrowRight,
} from 'lucide-react'
import { useDashboardStats, useDecisionDistribution, useRecentActivity, useAnalyticsTrends } from '@/hooks/useAIMF'
import { Button, ErrorState } from '@/components/ui'
import StatCard        from '@/components/dashboard/StatCard'
import DecisionChart   from '@/components/dashboard/DecisionChart'
import ActivityFeed    from '@/components/dashboard/ActivityFeed'
import PrivacyScore    from '@/components/dashboard/PrivacyScore'
import StorageSummary  from '@/components/dashboard/StorageSummary'

export default function DashboardPage() {
  const navigate = useNavigate()

  const statsQuery    = useDashboardStats()
  const decisionsQuery = useDecisionDistribution()
  const activityQuery  = useRecentActivity()
  const trendsQuery    = useAnalyticsTrends()

  const stats    = statsQuery.data
  const isLoading = statsQuery.isLoading

  // Top-level error
  if (statsQuery.isError) {
    return (
      <ErrorState
        title="Failed to load dashboard"
        description="Could not fetch dashboard data. Please try again."
        onRetry={() => statsQuery.refetch()}
      />
    )
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">

      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            System Overview
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Real-time view of the AIMF memory governance pipeline
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="secondary"
            size="sm"
            icon={<Database className="h-3.5 w-3.5" />}
            onClick={() => navigate('/vault')}
          >
            Vault
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<FlaskConical className="h-3.5 w-3.5" />}
            onClick={() => navigate('/lab')}
          >
            Analyze
          </Button>
        </div>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Total Memories"
          value={stats ? stats.total_memories.toLocaleString() : '—'}
          subtitle="All sessions combined"
          icon={<Brain className="h-4.5 w-4.5" />}
          iconColor="bg-indigo-500/15 text-indigo-400"
          trend={stats ? 43 : undefined}
          trendLabel=" new"
          loading={isLoading}
          delay={0}
        />
        <StatCard
          title="Active"
          value={stats ? stats.active_memories.toLocaleString() : '—'}
          subtitle="Currently in store"
          icon={<Activity className="h-4.5 w-4.5" />}
          iconColor="bg-emerald-500/15 text-emerald-400"
          trend={stats ? 12 : undefined}
          trendLabel=" added"
          loading={isLoading}
          delay={0.07}
        />
        <StatCard
          title="Encrypted"
          value={stats ? stats.encrypted_memories.toLocaleString() : '—'}
          subtitle="Privacy-protected"
          icon={<Lock className="h-4.5 w-4.5" />}
          iconColor="bg-cyan-500/15 text-cyan-400"
          trend={stats ? 7 : undefined}
          trendLabel=" new"
          loading={isLoading}
          delay={0.14}
        />
        <StatCard
          title="Forgotten"
          value={stats ? stats.forgotten_memories.toLocaleString() : '—'}
          subtitle="Cleared by AMGS"
          icon={<Trash2 className="h-4.5 w-4.5" />}
          iconColor="bg-red-500/15 text-red-400"
          trend={stats ? -11 : undefined}
          trendLabel=" vs avg"
          loading={isLoading}
          delay={0.21}
        />
      </div>

      {/* ── AMGS Score Banner ────────────────────────────────────────── */}
      {stats && (
        <div className="flex flex-wrap items-center gap-6 rounded-xl border border-indigo-500/15 bg-indigo-500/[0.04] px-5 py-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-500">Avg AMGS Score</p>
            <p className="text-3xl font-bold text-indigo-300 font-mono mt-0.5">
              {stats.avg_amgs_score.toFixed(3)}
            </p>
          </div>
          <div className="h-10 w-px bg-white/[0.07] hidden sm:block" />
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-500">Storage Efficiency</p>
            <p className="text-3xl font-bold text-cyan-300 font-mono mt-0.5">
              {(stats.storage_efficiency * 100).toFixed(1)}%
            </p>
          </div>
          <div className="h-10 w-px bg-white/[0.07] hidden sm:block" />
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-500">Memories Today</p>
            <p className="text-3xl font-bold text-white font-mono mt-0.5">
              {stats.memories_today}
            </p>
          </div>
          <div className="ml-auto hidden md:block">
            <Button
              variant="ghost"
              size="sm"
              iconRight={<ArrowRight className="h-3.5 w-3.5" />}
              onClick={() => navigate('/analytics')}
            >
              Full Analytics
            </Button>
          </div>
        </div>
      )}

      {/* ── Main Grid ────────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Activity Feed — wide */}
        <div className="lg:col-span-2">
          <ActivityFeed
            events={activityQuery.data ?? []}
            loading={activityQuery.isLoading}
          />
        </div>

        {/* Decision Chart */}
        <div>
          <DecisionChart
            data={decisionsQuery.data ?? []}
            loading={decisionsQuery.isLoading}
          />
        </div>
      </div>

      {/* ── Bottom Row ───────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <PrivacyScore
          score={stats?.privacy_score ?? 0}
          encryptedCount={stats?.encrypted_memories ?? 0}
          totalCount={stats?.total_memories ?? 0}
          privacyEventsToday={7}
        />
        <StorageSummary
          totalMemories={stats?.total_memories ?? 0}
          activeMemories={stats?.active_memories ?? 0}
          storageEfficiency={stats?.storage_efficiency ?? 0}
          memoriesVsYesterday={43}
          miniTrend={(trendsQuery.data ?? []).map((t) => ({ date: t.date, stored: t.stored }))}
        />
      </div>

    </div>
  )
}
