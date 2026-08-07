/**
 * Custom TanStack Query hooks for all AIMF data fetching.
 * Swap the service imports → real API calls when backend is ready.
 */

import { useQuery } from '@tanstack/react-query'
import {
  fetchDashboardStats,
  fetchDecisionDistribution,
  fetchRecentActivity,
  fetchMemories,
  fetchMemoryById,
  fetchAnalyticsTrends,
  fetchAnalyticsBreakdowns,
  fetchAlgorithmComparison,
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
  return useQuery({
    queryKey: QUERY_KEYS.dashboardStats,
    queryFn: fetchDashboardStats,
    staleTime: 60_000,
  })
}

export function useDecisionDistribution() {
  return useQuery({
    queryKey: QUERY_KEYS.decisionDistribution,
    queryFn: fetchDecisionDistribution,
    staleTime: 60_000,
  })
}

export function useRecentActivity() {
  return useQuery({
    queryKey: QUERY_KEYS.recentActivity,
    queryFn: fetchRecentActivity,
    staleTime: 30_000,
    refetchInterval: 30_000,
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
  return useQuery({
    queryKey: QUERY_KEYS.memories(opts),
    queryFn: () => fetchMemories(opts),
    staleTime: 30_000,
  })
}

export function useMemoryById(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.memoryById(id),
    queryFn: () => fetchMemoryById(id),
    enabled: !!id,
    staleTime: 60_000,
  })
}

// ─── Analytics Hooks ──────────────────────────────────────────────────────────

export function useAnalyticsTrends() {
  return useQuery({
    queryKey: QUERY_KEYS.analyticsTrends,
    queryFn: fetchAnalyticsTrends,
    staleTime: 5 * 60_000,
  })
}

export function useAnalyticsBreakdowns() {
  return useQuery({
    queryKey: QUERY_KEYS.analyticsBreakdowns,
    queryFn: fetchAnalyticsBreakdowns,
    staleTime: 5 * 60_000,
  })
}

// ─── Comparison Hook ──────────────────────────────────────────────────────────

export function useAlgorithmComparison() {
  return useQuery({
    queryKey: QUERY_KEYS.algorithmComparison,
    queryFn: fetchAlgorithmComparison,
    staleTime: 10 * 60_000,
  })
}
