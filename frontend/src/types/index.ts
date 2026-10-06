// ─── Core App Types ──────────────────────────────────────────────────────────

export type Theme = 'dark' | 'light' | 'system'

export type DecisionType =
  | 'STORE'
  | 'STORE_ENCRYPTED'
  | 'SUMMARIZE'
  | 'FORGET'
  | 'REJECT_PRIVACY'
  | 'LONG_TERM'

export type SensitivityLevel = 'none' | 'low' | 'medium' | 'high' | 'critical'

export type MemoryCategory =
  | 'personal'
  | 'factual'
  | 'preference'
  | 'sensitive'
  | 'task'
  | 'conversation'
  | 'temporal'

export type MemoryStatus = 'active' | 'expired' | 'forgotten' | 'archived'

// ─── Memory Types ──────────────────────────────────────────────────────────

export interface Memory {
  id: string
  content: string
  decision: DecisionType
  amgs_score: number
  confidence: number
  sensitivity: SensitivityLevel
  memory_category: MemoryCategory
  status: MemoryStatus
  is_encrypted: boolean
  created_at: string
  expires_at: string | null
  last_accessed: string
  access_count: number
  explanation: string
  session_id: string
  factors: MemoryFactors
}

export interface MemoryFactors {
  usefulness: number
  context_relevance: number
  frequency: number
  novelty: number
  redundancy: number
  privacy_risk: number
  temporal_decay: number
}

// ─── Analytics Types ──────────────────────────────────────────────────────

export interface DashboardStats {
  total_memories: number
  active_memories: number
  encrypted_memories: number
  forgotten_memories: number
  avg_amgs_score: number
  privacy_score: number
  storage_efficiency: number
  memories_today: number
}

export interface DecisionDistribution {
  decision: DecisionType
  count: number
  percentage: number
}

export interface TimelineEvent {
  id: string
  type: 'store' | 'encrypt' | 'forget' | 'expire' | 'access' | 'summarize'
  memory_id: string
  memory_excerpt: string
  timestamp: string
  decision: DecisionType
  amgs_score: number
}

export interface AnalyticsTrend {
  date: string
  stored: number
  forgotten: number
  encrypted: number
  analyzed: number
}

// ─── Algorithm Comparison Types ──────────────────────────────────────────

export interface AlgorithmMetric {
  algorithm: string
  precision: number
  recall: number
  f1_score: number
  privacy_preservation: number
  storage_efficiency: number
  latency_ms: number
}

// ─── Notification Types ──────────────────────────────────────────────────

export interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  read: boolean
  created_at: string
}

// ─── Settings Types ────────────────────────────────────────────────────────

export interface UserSettings {
  theme: Theme
  sidebar_collapsed: boolean
  notifications_enabled: boolean
  compact_mode: boolean
  animations_enabled: boolean
  language: string
  amgs_weights: {
    usefulness: number
    context: number
    frequency: number
    novelty: number
    redundancy: number
    privacy: number
    decay: number
  }
  thresholds: {
    long_term: number
    store: number
    summarize: number
    forget: number
    encrypt: number
    reject_privacy: number
  }
}

// ─── API Response Wrapper ─────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T
  status: 'success' | 'error'
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  has_next: boolean
  has_prev: boolean
}

// ─── Analysis Types ───────────────────────────────────────────────────────

export interface AnalysisRequest {
  content: string
  session_id?: string
  context?: string[]
}

export interface AnalysisResult {
  memory: Memory
  pipeline_stages: PipelineStage[]
  processing_time_ms: number
}

export interface PipelineStage {
  name: string
  status: 'completed' | 'skipped' | 'failed'
  duration_ms: number
  output?: Record<string, unknown>
}

// ─── Auth Types ───────────────────────────────────────────────────────────

export type UserRole = 'ADMIN' | 'USER'

export interface AuthUser {
  id: string
  email: string
  full_name: string
  role: UserRole
  is_active: boolean
  created_at: string
  last_login: string | null
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  user: AuthUser
}

// ─── Chat Types ───────────────────────────────────────────────────────────

export interface ChatSession {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  aimf_decision: string | null
  amgs_score: string | null
  memory_id: string | null
  created_at: string
}

export interface ChatSendResponse {
  user_message: ChatMessage
  assistant_message: ChatMessage
  aimf_decision: string
  amgs_score: number | null
  memory_persisted: boolean
  memory_id: string | null
  rationale: string
}

export interface ChatHistoryResponse {
  session: ChatSession
  messages: ChatMessage[]
  total: number
}

