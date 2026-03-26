import { describe, it, expect } from 'vitest'

// Test the clamping logic directly (extracted inline for testability)
function clampBreakdown(
  breakdown: Record<string, number>,
  weights: Record<string, number>
): Record<string, number> {
  const result: Record<string, number> = {}
  for (const key of Object.keys(weights)) {
    const cap = weights[key]
    const val = breakdown[key] ?? 0
    if (val > cap) {
      console.warn(`Score breakdown ${key}=${val} exceeds cap ${cap} — clamping`)
      result[key] = cap
    } else {
      result[key] = val
    }
  }
  return result
}

describe('scoring weight clamping', () => {
  it('clamps a score that exceeds its cap to the cap value', () => {
    const weights = { pmf: 25, validation: 25, growth: 20, mindset: 15, revenue: 15 }
    const rawBreakdown = { pmf: 30, validation: 20, growth: 18, mindset: 14, revenue: 12 }
    const clamped = clampBreakdown(rawBreakdown, weights)
    expect(clamped.pmf).toBe(25)
    expect(clamped.validation).toBe(20)
  })

  it('passes through values within caps unchanged', () => {
    const weights = { pmf: 20, validation: 20, growth: 20, mindset: 20, revenue: 20 }
    const rawBreakdown = { pmf: 15, validation: 18, growth: 12, mindset: 20, revenue: 10 }
    const clamped = clampBreakdown(rawBreakdown, weights)
    expect(clamped).toEqual(rawBreakdown)
  })
})
