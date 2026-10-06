import { describe, it, expect } from 'vitest'
import {
  fetchDashboardStats,
  fetchDecisionDistribution,
  fetchRecentActivity,
  fetchMemories,
  fetchMemoryById,
  analyzeMemoryContent,
  fetchAnalyticsTrends,
  fetchAlgorithmComparison,
} from './services'

describe('Mock Services Layer', () => {
  it('fetches dashboard stats with required metrics', async () => {
    const stats = await fetchDashboardStats()
    expect(stats).toBeDefined()
    expect(stats.total_memories).toBeGreaterThan(0)
    expect(stats.avg_amgs_score).toBeGreaterThanOrEqual(0)
    expect(stats.privacy_score).toBeGreaterThanOrEqual(0)
  })

  it('fetches decision distribution summing to valid count', async () => {
    const dist = await fetchDecisionDistribution()
    expect(Array.isArray(dist)).toBe(true)
    expect(dist.length).toBeGreaterThan(0)
    const storeItem = dist.find((d) => d.decision === 'STORE')
    expect(storeItem).toBeDefined()
    expect(storeItem?.count).toBeGreaterThan(0)
  })

  it('fetches recent activity feed', async () => {
    const activity = await fetchRecentActivity()
    expect(Array.isArray(activity)).toBe(true)
    expect(activity.length).toBeGreaterThan(0)
    expect(activity[0]).toHaveProperty('id')
    expect(activity[0]).toHaveProperty('type')
    expect(activity[0]).toHaveProperty('timestamp')
  })

  it('fetches paginated memories and supports search & filters', async () => {
    const page1 = await fetchMemories({ page: 1, pageSize: 5 })
    expect(page1.items.length).toBeLessThanOrEqual(5)
    expect(page1.total).toBeGreaterThan(0)
    expect(page1.page).toBe(1)
    expect(page1.page_size).toBe(5)

    // Filter by search
    const filtered = await fetchMemories({ search: 'Python' })
    expect(filtered.items.length).toBeGreaterThan(0)
    expect(filtered.items.every((m) =>
      m.content.toLowerCase().includes('python')
    )).toBe(true)

    // Filter by status
    const activeOnly = await fetchMemories({ status: 'active' })
    expect(activeOnly.items.every((m) => m.status === 'active')).toBe(true)
  })

  it('fetches single memory by ID or returns null if not found', async () => {
    const memory = await fetchMemoryById('mem-001')
    expect(memory).toBeDefined()
    expect(memory?.id).toBe('mem-001')

    const notFound = await fetchMemoryById('non_existent_id_999')
    expect(notFound).toBeNull()
  })

  it('analyzes memory content and produces AMGS factor breakdown', async () => {
    const result = await analyzeMemoryContent('Schedule a doctor appointment tomorrow at 10 AM')
    expect(result).toBeDefined()
    expect(result.memory).toBeDefined()
    expect(result.memory.amgs_score).toBeGreaterThanOrEqual(0)
    expect(result.memory.amgs_score).toBeLessThanOrEqual(1)
    expect(result.memory.factors).toBeDefined()
    expect(result.memory.factors.usefulness).toBeGreaterThanOrEqual(0)
    expect(result.memory.factors.context_relevance).toBeGreaterThanOrEqual(0)
    expect(result.memory.factors.privacy_risk).toBeGreaterThanOrEqual(0)
    expect(result.memory.decision).toBeDefined()
    expect(result.memory.confidence).toBeGreaterThan(0)
    expect(result.pipeline_stages.length).toBeGreaterThan(0)
  })

  it('fetches analytics trends and algorithm comparison metrics', async () => {
    const trends = await fetchAnalyticsTrends()
    expect(Array.isArray(trends)).toBe(true)
    expect(trends.length).toBeGreaterThan(0)

    const comparison = await fetchAlgorithmComparison()
    expect(Array.isArray(comparison)).toBe(true)
    expect(comparison.length).toBeGreaterThan(0)
    const aimf = comparison.find((c) => c.algorithm.includes('AIMF'))
    expect(aimf).toBeDefined()
    expect(aimf?.f1_score).toBeGreaterThan(0.8)
    expect(aimf?.privacy_preservation).toBeGreaterThan(0.8)
  })
})
