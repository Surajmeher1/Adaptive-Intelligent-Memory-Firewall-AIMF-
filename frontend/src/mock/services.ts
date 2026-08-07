/**
 * Mock Service Layer
 * Simulates async API calls with realistic delays.
 * When connecting to real backend, swap `mockFetch` for `axios` calls.
 */

import type {
  Memory,
  DashboardStats,
  DecisionDistribution,
  TimelineEvent,
  AnalyticsTrend,
  AlgorithmMetric,
  AnalysisResult,
  PaginatedResponse,
} from '@/types'

import dashboardData from './dashboard.json'
import memoriesData from './memories.json'
import analyticsData from './analytics.json'
import comparisonData from './comparison.json'

// ─── Simulated network delay ────────────────────────────────────────────────

function delay(ms = 600): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ─── Dashboard Services ─────────────────────────────────────────────────────

export async function fetchDashboardStats(): Promise<DashboardStats> {
  await delay(500)
  return dashboardData.stats as DashboardStats
}

export async function fetchDecisionDistribution(): Promise<DecisionDistribution[]> {
  await delay(400)
  return dashboardData.decision_distribution as DecisionDistribution[]
}

export async function fetchRecentActivity(): Promise<TimelineEvent[]> {
  await delay(550)
  return dashboardData.recent_activity as TimelineEvent[]
}

// ─── Memory Services ────────────────────────────────────────────────────────

export async function fetchMemories(opts?: {
  page?: number
  pageSize?: number
  search?: string
  decision?: string
  sensitivity?: string
  status?: string
}): Promise<PaginatedResponse<Memory>> {
  await delay(700)

  let items = memoriesData as Memory[]

  // Filter
  if (opts?.search) {
    const q = opts.search.toLowerCase()
    items = items.filter((m) => m.content.toLowerCase().includes(q))
  }
  if (opts?.decision) {
    items = items.filter((m) => m.decision === opts.decision)
  }
  if (opts?.sensitivity) {
    items = items.filter((m) => m.sensitivity === opts.sensitivity)
  }
  if (opts?.status) {
    items = items.filter((m) => m.status === opts.status)
  }

  // Paginate
  const page = opts?.page ?? 1
  const pageSize = opts?.pageSize ?? 10
  const total = items.length
  const start = (page - 1) * pageSize
  const paginated = items.slice(start, start + pageSize)

  return {
    items: paginated,
    total,
    page,
    page_size: pageSize,
    has_next: start + pageSize < total,
    has_prev: page > 1,
  }
}

export async function fetchMemoryById(id: string): Promise<Memory | null> {
  await delay(300)
  const found = (memoriesData as Memory[]).find((m) => m.id === id)
  return found ?? null
}

// ─── Analytics Services ─────────────────────────────────────────────────────

export async function fetchAnalyticsTrends(): Promise<AnalyticsTrend[]> {
  await delay(600)
  return analyticsData.trends as AnalyticsTrend[]
}

export async function fetchAnalyticsBreakdowns() {
  await delay(500)
  return {
    categories: analyticsData.category_breakdown,
    sensitivity: analyticsData.sensitivity_breakdown,
    amgs_distribution: analyticsData.amgs_score_distribution,
    monthly: analyticsData.monthly_overview,
  }
}

// ─── Algorithm Comparison ───────────────────────────────────────────────────

export async function fetchAlgorithmComparison(): Promise<AlgorithmMetric[]> {
  await delay(400)
  return comparisonData as AlgorithmMetric[]
}

// ─── Memory Lab — Analysis ──────────────────────────────────────────────────

const DECISIONS = [
  'STORE', 'STORE_ENCRYPTED', 'LONG_TERM',
  'SUMMARIZE', 'FORGET', 'REJECT_PRIVACY',
] as const

export async function analyzeMemoryContent(content: string): Promise<AnalysisResult> {
  await delay(1400) // Simulate pipeline processing time

  const privacyKeywords = ['password', 'credit card', 'address', 'aadhar', 'passport', 'phone', 'email', 'bank', 'ssn', 'medical']
  const temporalKeywords = ['today', 'tomorrow', 'yesterday', 'monday', 'tuesday', 'wednesday', 'meeting', 'appointment', 'schedule']
  const preferenceKeywords = ['prefer', 'like', 'love', 'hate', 'always', 'never', 'favourite', 'favorite']

  const lower = content.toLowerCase()
  const isPrivacy = privacyKeywords.some((k) => lower.includes(k))
  const isTemporal = temporalKeywords.some((k) => lower.includes(k))
  const isPreference = preferenceKeywords.some((k) => lower.includes(k))

  // Deterministic-ish score based on content
  const baseScore = Math.min(0.99, Math.max(0.01, (content.length / 200) * 0.5 + Math.random() * 0.3 + 0.2))
  const privacyRisk = isPrivacy ? 0.8 + Math.random() * 0.2 : Math.random() * 0.15
  const temporalDecay = isTemporal ? 0.05 + Math.random() * 0.1 : 0.6 + Math.random() * 0.35
  const usefulness = isPreference ? 0.7 + Math.random() * 0.25 : baseScore * 0.8

  const amgs = Math.max(0.01, Math.min(0.99,
    usefulness * 0.25 + (1 - privacyRisk) * 0.1 + temporalDecay * 0.05 + Math.random() * 0.15
  ))

  let decision: Memory['decision']
  if (privacyRisk > 0.85) {
    decision = content.length < 30 ? 'REJECT_PRIVACY' : 'STORE_ENCRYPTED'
  } else if (amgs < 0.15) {
    decision = 'FORGET'
  } else if (amgs < 0.35) {
    decision = 'SUMMARIZE'
  } else if (amgs > 0.75 && isPreference) {
    decision = 'LONG_TERM'
  } else {
    decision = 'STORE'
  }

  const memory: Memory = {
    id: `mem-lab-${Date.now()}`,
    content,
    decision,
    amgs_score: amgs,
    confidence: 0.75 + Math.random() * 0.24,
    sensitivity: privacyRisk > 0.85 ? 'critical' : privacyRisk > 0.5 ? 'high' : privacyRisk > 0.2 ? 'medium' : 'none',
    memory_category: isPrivacy ? 'sensitive' : isTemporal ? 'temporal' : isPreference ? 'preference' : 'factual',
    status: decision === 'FORGET' || decision === 'REJECT_PRIVACY' ? 'forgotten' : 'active',
    is_encrypted: decision === 'STORE_ENCRYPTED',
    created_at: new Date().toISOString(),
    expires_at: isTemporal ? new Date(Date.now() + 86400000).toISOString() : null,
    last_accessed: new Date().toISOString(),
    access_count: 0,
    explanation: `AMGS pipeline completed. Decision: ${decision}. ${isPrivacy ? 'Privacy keywords detected. ' : ''}${isTemporal ? 'Temporal content identified. ' : ''}Score reflects ${Math.round(amgs * 100)}% composite utility.`,
    session_id: 'sess-lab',
    factors: {
      usefulness: Math.min(0.99, usefulness),
      context_relevance: 0.3 + Math.random() * 0.6,
      frequency: 0.05 + Math.random() * 0.3,
      novelty: 0.4 + Math.random() * 0.5,
      redundancy: 0.05 + Math.random() * 0.4,
      privacy_risk: Math.min(0.99, privacyRisk),
      temporal_decay: Math.min(0.99, temporalDecay),
    },
  }

  return {
    memory,
    pipeline_stages: [
      { name: 'Content Ingestion',      status: 'completed', duration_ms: 12  },
      { name: 'Privacy Scan',           status: 'completed', duration_ms: 89  },
      { name: 'Semantic Embedding',     status: 'completed', duration_ms: 234 },
      { name: 'AMGS Score Computation', status: 'completed', duration_ms: 156 },
      { name: 'Decision Engine',        status: 'completed', duration_ms: 43  },
      { name: 'Storage Routing',        status: decision === 'REJECT_PRIVACY' ? 'skipped' : 'completed', duration_ms: 18 },
    ],
    processing_time_ms: 552,
  }
}
