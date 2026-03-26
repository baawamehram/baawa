import { describe, it, expect, vi } from 'vitest'

// Mock side-effectful modules before importing journeyOptimizer
vi.mock('../db/client', () => ({ db: { query: vi.fn(), connect: vi.fn() } }))
vi.mock('./journeyConfig', () => ({ getActiveConfig: vi.fn(), invalidateConfigCache: vi.fn() }))
vi.mock('./email', () => ({
  sendOptimizerProposal: vi.fn(),
  sendOptimizerFailure: vi.fn(),
}))
vi.mock('@anthropic-ai/sdk', () => ({ default: class { messages = { create: vi.fn() } } }))

import { normaliseWeights, validateRiskLevel } from './journeyOptimizer'

describe('normaliseWeights', () => {
  it('passes through weights that already sum to 100', () => {
    const w = { pmf: 20, validation: 20, growth: 20, mindset: 20, revenue: 20 }
    expect(normaliseWeights(w)).toEqual(w)
  })

  it('normalises weights that sum to 99 — adds 1 to first highest in key order', () => {
    const w = { pmf: 19, validation: 20, growth: 20, mindset: 20, revenue: 20 }
    // Sum = 99; rounded will be 19+20+20+20+20=99; add 1 to first highest (validation)
    const result = normaliseWeights(w)
    expect(Object.values(result).reduce((a, b) => a + b, 0)).toBe(100)
    expect(Number.isInteger(result.pmf)).toBe(true)
  })

  it('normalises weights that sum to 101 — subtracts 1 from highest', () => {
    const w = { pmf: 21, validation: 20, growth: 20, mindset: 20, revenue: 20 }
    const result = normaliseWeights(w)
    expect(Object.values(result).reduce((a, b) => a + b, 0)).toBe(100)
    expect(result.pmf).toBe(20)
  })

  it('tie-breaking uses key order: pmf first when all others equal', () => {
    const w = { pmf: 20, validation: 20, growth: 20, mindset: 20, revenue: 19 }
    // Sum = 99; add 1 to first highest (pmf)
    const result = normaliseWeights(w)
    expect(result.pmf).toBe(21)
    expect(result.validation).toBe(20)
  })
})

describe('validateRiskLevel', () => {
  const currentWeights = { pmf: 20, validation: 20, growth: 20, mindset: 20, revenue: 20 }

  it('returns "low" when all weights shift ≤5 absolute points', () => {
    const proposed = { pmf: 25, validation: 20, growth: 20, mindset: 20, revenue: 15 }
    expect(validateRiskLevel('low', proposed, currentWeights)).toBe('low')
  })

  it('overrides to "high" when any weight shifts >5 absolute points', () => {
    const proposed = { pmf: 26, validation: 20, growth: 20, mindset: 20, revenue: 14 }
    expect(validateRiskLevel('low', proposed, currentWeights)).toBe('high')
  })

  it('keeps "high" if Claude already said "high"', () => {
    const proposed = { pmf: 22, validation: 20, growth: 20, mindset: 20, revenue: 18 }
    expect(validateRiskLevel('high', proposed, currentWeights)).toBe('high')
  })

  it('boundary: exactly 5 shift is still "low"', () => {
    const proposed = { pmf: 25, validation: 20, growth: 20, mindset: 20, revenue: 15 }
    expect(validateRiskLevel('low', proposed, currentWeights)).toBe('low')
  })
})
