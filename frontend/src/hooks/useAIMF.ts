/**
 * Custom TanStack Query hooks for all AIMF data fetching.
 *
 * Strategy:
 *   - When user is authenticated → call real FastAPI backend via @/services/api
 *   - When unauthenticated (landing / demo mode) → fall back to @/mock/services
 *
 * This means the admin dashboard, memory vault, analytics, etc. all display
 * real data when logged in and demo data when not.
 */

import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'

// ─── Real API ─────────────────────────────────────────────────────────────────
import * as realApi from '@/services/api'

// ─── Mock API (fallback / demo) ────────────────────────────────────────────────
import {
  fetchDashboardStats    as mockDashboardStats,
  fetchDecisionDistribution as mockDecisionDist,
  fetchRecentActivity    as mockRecentActivity,
  fetchMemories          as mockMemories,
  fetchMemoryById        as mockMemoryById,
  fetchAnalyticsTrends   as mockAnalyticsTrends,
  fetchAnalyticsBreakdowns as mockAnalyticsBreakdowns,
  fetchAlgorithmComparison as mockAlgorithmComparison,
} from '@/mock/services'

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const QUERY_KEYS = {
  dashboardStats:       ['dashboard', 'stats'],
  decisionDistribution: ['dashboard', 'decisions'],
  recentActivity:       ['dashboard', 'activity'],
  memories:             (opts?: object) => ['memories', opts ?? {}],
  memoryById:           (id: string) => ['memories', id],
  analyticsTrends:      ['analytics', 'trends'],
  analyticsBreakdowns:  ['analytics', 'breakdowns'],
  algorithmComparison:  ['comparison'],
} as const

// ─── Dashboard Hooks ──────────────────────────────────────────────────────────

export function useDashboardStats() {
  const isAuth = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey: [...QUERY_KEYS.dashboardStats, isAuth],
    queryFn: isAuth ? realApi.fetchDashboardStats : mockDashboardStats,
    staleTime: 30_000,
    refetchInterval: isAuth ? 60_000 : false,
  })
}

export function useDecisionDistribution() {
  const isAuth = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey: [...QUERY_KEYS.decisionDistribution, isAuth],
    queryFn: isAuth ? realApi.fetchDecisionDistribution : mockDecisionDist,
    staleTime: 30_000,
    refetchInterval: isAuth ? 60_000 : false,
  })
}

export function useRecentActivity() {
  const isAuth = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey: [...QUERY_KEYS.recentActivity, isAuth],
    queryFn: isAuth ? realApi.fetchRecentActivity : mockRecentActivity,
    staleTime: 20_000,
    refetchInterval: isAuth ? 30_000 : false,
  })
}

// ─── Memory Vault Hooks ───────────────────────────────────────────────────────

export function useMemories(opts?: {
  page?: number
  pageSize?: number
  search?: string
  decision?: string
  sensitivity?: string
  status?: string
}) {
  const isAuth = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey: QUERY_KEYS.memories({ ...opts, _auth: isAuth }),
    queryFn: isAuth ? () => realApi.fetchMemories(opts) : () => mockMemories(opts),
    staleTime: 20_000,
  })
}

export function useMemoryById(id: string) {
  const isAuth = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey: [...QUERY_KEYS.memoryById(id), isAuth],
    queryFn: isAuth ? () => realApi.fetchMemoryById(id) : () => mockMemoryById(id),
    enabled: !!id,
    staleTime: 60_000,
  })
}

// ─── Analytics Hooks ──────────────────────────────────────────────────────────

export function useAnalyticsTrends() {
  const isAuth = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey: [...QUERY_KEYS.analyticsTrends, isAuth],
    queryFn: isAuth ? realApi.fetchAnalyticsTrends : mockAnalyticsTrends,
    staleTime: 5 * 60_000,
  })
}

export function useAnalyticsBreakdowns() {
  // Always use mock for breakdowns (no dedicated backend endpoint yet)
  return useQuery({
    queryKey: QUERY_KEYS.analyticsBreakdowns,
    queryFn: mockAnalyticsBreakdowns,
    staleTime: 5 * 60_000,
  })
}

// ─── Comparison Hook ──────────────────────────────────────────────────────────

export function useAlgorithmComparison() {
  // Always use static mock (research baseline data is static)
  return useQuery({
    queryKey: QUERY_KEYS.algorithmComparison,
    queryFn: mockAlgorithmComparison,
    staleTime: 10 * 60_000,
  })
}

// ─── Memory Lab analysis re-exports ─────────────────────────────────────────
// MemoryLabPage uses useMutation directly with these; re-exported here for convenience.
export { realApi }
