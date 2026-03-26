import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the db module before importing journeyConfig
vi.mock('../db/client', () => ({
  db: {
    query: vi.fn(),
  },
}))

import { db } from '../db/client'
import { getActiveConfig, invalidateConfigCache } from './journeyConfig'

const mockDb = vi.mocked(db)

beforeEach(async () => {
  vi.clearAllMocks()
  await invalidateConfigCache()
})

describe('getActiveConfig', () => {
  it('returns active config from DB when one exists', async () => {
    mockDb.query.mockResolvedValueOnce({
      rows: [{
        id: 1,
        version: 1,
        system_prompt: 'test prompt {{KNOWLEDGE_BASE}} {{RAG_CONTEXT}}',
        intro_messages: ['Hello.', 'Hello.\n\nMore.'],
        scoring_weights: { pmf: 20, validation: 20, growth: 20, mindset: 20, revenue: 20 },
      }],
    } as any)

    const config = await getActiveConfig()

    expect(config.version).toBe(1)
    expect(config.system_prompt).toBe('test prompt {{KNOWLEDGE_BASE}} {{RAG_CONTEXT}}')
    expect(config.scoring_weights.pmf).toBe(20)
  })

  it('returns hardcoded defaults when DB has no active config', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [] } as any)

    const config = await getActiveConfig()

    expect(config.version).toBe(1)
    expect(config.scoring_weights).toEqual({ pmf: 20, validation: 20, growth: 20, mindset: 20, revenue: 20 })
    expect(config.intro_messages.length).toBeGreaterThan(0)
  })

  it('returns cached result on second call within TTL', async () => {
    mockDb.query.mockResolvedValueOnce({
      rows: [{ id: 1, version: 2, system_prompt: 'p', intro_messages: ['a', 'ab'], scoring_weights: { pmf: 20, validation: 20, growth: 20, mindset: 20, revenue: 20 } }],
    } as any)

    await getActiveConfig()
    await getActiveConfig() // second call

    expect(mockDb.query).toHaveBeenCalledTimes(1)
  })

  it('re-fetches after cache is invalidated', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ id: 1, version: 1, system_prompt: 'p', intro_messages: ['a', 'ab'], scoring_weights: { pmf: 20, validation: 20, growth: 20, mindset: 20, revenue: 20 } }] } as any)
      .mockResolvedValueOnce({ rows: [{ id: 2, version: 2, system_prompt: 'p2', intro_messages: ['a', 'ab'], scoring_weights: { pmf: 25, validation: 20, growth: 20, mindset: 20, revenue: 15 } }] } as any)

    await getActiveConfig()
    await invalidateConfigCache()
    const config = await getActiveConfig()

    expect(mockDb.query).toHaveBeenCalledTimes(2)
    expect(config.version).toBe(2)
  })

  it('returns defaults when DB throws', async () => {
    mockDb.query.mockRejectedValueOnce(new Error('DB down'))

    const config = await getActiveConfig()

    expect(config.version).toBe(1)
  })
})
