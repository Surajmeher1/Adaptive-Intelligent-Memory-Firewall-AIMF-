/**
 * AIMF Real API Service Layer
 * ============================
 * Mirrors the interface of @/mock/services but calls the real FastAPI backend.
 * All requests are authenticated via JWT bearer token from the auth store.
 *
 * Mapping:
 *   fetchDashboardStats()        → GET  /api/v1/memory/stats
 *   fetchDecisionDistribution()  → GET  /api/v1/memory/stats (decision_distribution field)
 *   fetchRecentActivity()        → GET  /api/v1/memory/ (last 10, mapped to TimelineEvent)
 *   fetchMemories()              → GET  /api/v1/memory/
 *   fetchMemoryById()            → GET  /api/v1/memory/{id}
 *   analyzeMemoryContent()       → POST /api/v1/memory/analyze
 *   fetchAnalyticsTrends()       → derived from GET /api/v1/memory/ (mock-augmented)
 *   fetchAlgorithmComparison()   → static (research data, kept as mock)
 */

import { authHeaders, useAuthStore } from '@/store/authStore'
import type {
  Memory,
  DashboardStats,
  DecisionDistribution,
  TimelineEvent,
  AnalyticsTrend,
  AnalysisResult,
  PaginatedResponse,
  DecisionType,
  SensitivityLevel,
  MemoryCategory,
  MemoryStatus,
  MemoryFactors,
} from '@/types'

// Re-export algorithm comparison from static mock (research baseline data)
export { fetchAlgorithmComparison, fetchAnalyticsBreakdowns } from '@/mock/services'

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8000' : '')

// ─── Internal HTTP helper ──────────────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...authHeaders(),
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    if (res.status === 401) {
      useAuthStore.getState().logout()
    }
    const body = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }))
    throw new Error(body.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

// ─── Decision normalisation ────────────────────────────────────────────────────
// Backend uses STORE_LONG_TERM / STORE_ENCRYPT / STORE_TEMPORARY
// Frontend types use LONG_TERM / STORE_ENCRYPTED
const DECISION_MAP: Record<string, DecisionType> = {
  STORE:               'STORE',
  STORE_LONG_TERM:     'LONG_TERM',
  STORE_ENCRYPT:       'STORE_ENCRYPTED',
  ENCRYPT_AND_STORE:   'STORE_ENCRYPTED',
  STORE_TEMPORARY:     'STORE',
  SUMMARIZE:           'SUMMARIZE',
  SUMMARIZE_AND_STORE: 'SUMMARIZE',
  UPDATE_EXISTING:     'LONG_TERM',
  MERGE_WITH_EXISTING: 'LONG_TERM',
  FORGET:              'FORGET',
  REJECT:              'REJECT_PRIVACY',
  REJECT_PRIVACY:      'REJECT_PRIVACY',
}

function normaliseDecision(d: string): DecisionType {
  return DECISION_MAP[d] ?? (d as DecisionType)
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

interface RawStats {
  total_memories: number
  active_memories: number
  encrypted_memories: number
  forgotten_memories: number
  avg_amgs_score: number
  privacy_score: number
  storage_efficiency: number
  memories_today: number
  decision_distribution: { decision: string; count: number; percentage: number }[]
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const raw = await apiFetch<RawStats>('/api/v1/memory/stats')
  return {
    total_memories:      raw.total_memories,
    active_memories:     raw.active_memories,
    encrypted_memories:  raw.encrypted_memories,
    forgotten_memories:  raw.forgotten_memories,
    avg_amgs_score:      raw.avg_amgs_score,
    privacy_score:       raw.privacy_score,
    storage_efficiency:  raw.storage_efficiency,
    memories_today:      raw.memories_today,
  }
}

export async function fetchDecisionDistribution(): Promise<DecisionDistribution[]> {
  const raw = await apiFetch<RawStats>('/api/v1/memory/stats')
  return raw.decision_distribution.map((row) => ({
    decision:   normaliseDecision(row.decision),
    count:      row.count,
    percentage: row.percentage,
  }))
}

// ─── Recent Activity (derived from latest memories) ───────────────────────────

interface RawMemoryListItem {
  id: string
  content: string
  decision: string
  amgs_score: number
  sensitivity: string
  status: string
  memory_category: string
  created_at: string
  last_accessed: string
  access_count: number
  expires_at: string | null
  is_encrypted: boolean
}

interface RawPaginatedMemories {
  total: number
  page: number
  page_size: number
  items: RawMemoryListItem[]
}

function listItemToMemory(r: RawMemoryListItem): Memory {
  return {
    id:              r.id,
    content:         r.content,
    decision:        normaliseDecision(r.decision),
    amgs_score:      r.amgs_score,
    confidence:      0.85, // list endpoint doesn't return confidence; use a sensible default
    sensitivity:     (r.sensitivity as SensitivityLevel) ?? 'none',
    memory_category: (r.memory_category as MemoryCategory) ?? 'factual',
    status:          (r.status?.toLowerCase() as MemoryStatus) ?? 'active',
    is_encrypted:    r.is_encrypted,
    created_at:      r.created_at,
    expires_at:      r.expires_at,
    last_accessed:   r.last_accessed,
    access_count:    r.access_count,
    explanation:     '',
    session_id:      '',
    factors: {
      usefulness:       0,
      context_relevance:0,
      frequency:        0,
      novelty:          0,
      redundancy:       0,
      privacy_risk:     0,
      temporal_decay:   0,
    },
  }
}

const DECISION_TO_EVENT: Record<string, TimelineEvent['type']> = {
  STORE:           'store',
  STORE_LONG_TERM: 'store',
  STORE_ENCRYPT:   'encrypt',
  STORE_TEMPORARY: 'store',
  SUMMARIZE:       'summarize',
  FORGET:          'forget',
  REJECT:          'forget',
  REJECT_PRIVACY:  'forget',
}

export async function fetchRecentActivity(): Promise<TimelineEvent[]> {
  const raw = await apiFetch<RawPaginatedMemories>('/api/v1/memory/?page=1&page_size=15')
  return raw.items.map((item) => ({
    id:             `evt-${item.id}`,
    type:           DECISION_TO_EVENT[item.decision] ?? 'store',
    memory_id:      item.id,
    memory_excerpt: item.content.length > 80 ? item.content.slice(0, 80) + '…' : item.content,
    timestamp:      item.created_at,
    decision:       normaliseDecision(item.decision),
    amgs_score:     item.amgs_score,
  }))
}

// ─── Memory Vault ─────────────────────────────────────────────────────────────

const FRONTEND_TO_BACKEND_DECISION: Record<string, string> = {
  STORE:           'STORE',
  STORE_ENCRYPTED: 'STORE_ENCRYPT',
  LONG_TERM:       'STORE_LONG_TERM',
  SUMMARIZE:       'SUMMARIZE',
  FORGET:          'FORGET',
  REJECT_PRIVACY:  'REJECT_PRIVACY',
}

export async function fetchMemories(opts?: {
  page?: number
  pageSize?: number
  search?: string
  decision?: string
  sensitivity?: string
  status?: string
}): Promise<PaginatedResponse<Memory>> {
  const params = new URLSearchParams()
  params.set('page',      String(opts?.page      ?? 1))
  params.set('page_size', String(opts?.pageSize  ?? 20))
  if (opts?.decision) {
    const backendDecision = FRONTEND_TO_BACKEND_DECISION[opts.decision] || opts.decision
    params.set('decision', backendDecision)
  }
  if (opts?.sensitivity) params.set('sensitivity', opts.sensitivity)
  if (opts?.status)      params.set('status',      opts.status.toUpperCase())

  const raw = await apiFetch<RawPaginatedMemories>(`/api/v1/memory/?${params}`)
  const items = raw.items.map(listItemToMemory)

  // Client-side text search (backend doesn't expose free-text filter on list endpoint)
  const filtered = opts?.search
    ? items.filter((m) => m.content.toLowerCase().includes(opts.search!.toLowerCase()))
    : items

  return {
    items:    filtered,
    total:    raw.total,
    page:     raw.page,
    page_size:raw.page_size,
    has_next: raw.page * raw.page_size < raw.total,
    has_prev: raw.page > 1,
  }
}

export async function fetchMemoryById(id: string): Promise<Memory> {
  interface RawMemoryOut extends RawMemoryListItem {
    confidence: number
    factors: MemoryFactors
    explanation: { rationale: string }
    session_id: string | null
  }
  const raw = await apiFetch<RawMemoryOut>(`/api/v1/memory/${id}`)
  return {
    ...listItemToMemory(raw),
    confidence:  raw.confidence,
    explanation: raw.explanation?.rationale ?? '',
    session_id:  raw.session_id ?? '',
    factors:     raw.factors ?? listItemToMemory(raw).factors,
  }
}

// ─── Analytics Trends (derived from memory list, grouped by date) ─────────────

export async function fetchAnalyticsTrends(): Promise<AnalyticsTrend[]> {
  // Fetch a larger page to cover recent weeks
  const raw = await apiFetch<RawPaginatedMemories>('/api/v1/memory/?page=1&page_size=100&status=ACTIVE')
  const allItems = raw.items

  // Group by ISO date (yyyy-mm-dd)
  const byDate: Record<string, { stored: number; forgotten: number; encrypted: number; analyzed: number }> = {}

  for (const item of allItems) {
    const day = item.created_at.slice(0, 10)
    if (!byDate[day]) byDate[day] = { stored: 0, forgotten: 0, encrypted: 0, analyzed: 0 }
    byDate[day].analyzed += 1
    if (['STORE', 'STORE_LONG_TERM', 'STORE_TEMPORARY', 'SUMMARIZE'].includes(item.decision)) {
      byDate[day].stored += 1
    }
    if (['FORGET', 'REJECT', 'REJECT_PRIVACY'].includes(item.decision)) {
      byDate[day].forgotten += 1
    }
    if (item.is_encrypted || item.decision === 'STORE_ENCRYPT') {
      byDate[day].encrypted += 1
    }
  }

  return Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({ date, ...counts }))
}

// ─── Memory Lab — real pipeline analysis ──────────────────────────────────────

interface RawAnalyzeResponse {
  request_id: string
  decision: string
  amgs_score: number
  confidence: number
  review_recommended: boolean
  factors: MemoryFactors
  explanation: {
    rationale: string
    decision_boundary: string
    dominant_factor: string
    privacy_patterns_found: string[]
    similar_memory_id: string | null
  }
  metadata: {
    token_count: number
    entities: { text: string; label: string; start: number; end: number }[]
    sensitivity: string
    memory_category: string
    usefulness_lifetime: string
    is_temporal: boolean
    expires_at: string | null
    language: string
    language_warning: boolean
  }
  latency_ms: number
}

interface RawSubmitResponse {
  memory_id: string | null
  decision: string
  amgs_score: number
  stored: boolean
  analyze_result: RawAnalyzeResponse
  storage_metadata?: {
    encrypted: boolean
    expires_at?: string | null
    version: number
  } | null
}

export async function analyzeMemoryContent(content: string): Promise<AnalysisResult> {
  const rawSubmit = await apiFetch<RawSubmitResponse>('/api/v1/memory/submit', {
    method: 'POST',
    body: JSON.stringify({ content }),
  })

  const raw = rawSubmit.analyze_result
  const decision = normaliseDecision(raw.decision)

  const memory: Memory = {
    id:              rawSubmit.memory_id || `mem-lab-${Date.now()}`,
    content,
    decision,
    amgs_score:      raw.amgs_score,
    confidence:      raw.confidence,
    sensitivity:     (raw.metadata.sensitivity as SensitivityLevel) ?? 'none',
    memory_category: (raw.metadata.memory_category as MemoryCategory) ?? 'factual',
    status:          decision === 'FORGET' || decision === 'REJECT_PRIVACY' ? 'forgotten' : 'active',
    is_encrypted:    rawSubmit.storage_metadata?.encrypted ?? (decision === 'STORE_ENCRYPTED'),
    created_at:      new Date().toISOString(),
    expires_at:      raw.metadata.expires_at,
    last_accessed:   new Date().toISOString(),
    access_count:    0,
    explanation:     raw.explanation.rationale,
    session_id:      'mem-lab',
    factors:         raw.factors,
  }

  // Map pipeline latency into stage breakdown
  const total = raw.latency_ms
  const pipeline_stages = [
    { name: 'Content Ingestion',       status: 'completed' as const, duration_ms: Math.round(total * 0.02) },
    { name: 'Privacy Scan',            status: 'completed' as const, duration_ms: Math.round(total * 0.18) },
    { name: 'Semantic Embedding',      status: 'completed' as const, duration_ms: Math.round(total * 0.42) },
    { name: 'AMGS Score Computation',  status: 'completed' as const, duration_ms: Math.round(total * 0.28) },
    { name: 'Decision Engine',         status: 'completed' as const, duration_ms: Math.round(total * 0.08) },
    {
      name: 'Storage Routing',
      status: (rawSubmit.stored ? 'completed' : 'skipped') as 'completed' | 'skipped',
      duration_ms: Math.round(total * 0.02),
    },
  ]

  return {
    memory,
    pipeline_stages,
    processing_time_ms: Math.round(total),
  }
}
