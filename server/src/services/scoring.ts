import { getStrategicCore } from './knowledge'
import { getActiveConfig } from './journeyConfig'
import { ConversationTurn } from './questioning'
import { callLLM } from './llm-provider'

export interface ScoreBreakdown {
  pmf: number
  validation: number
  growth: number
  mindset: number
  revenue: number
}

export interface ScoringResult {
  score: number
  breakdown: ScoreBreakdown
  summary: string
  biggest_opportunity: string
  biggest_risk: string
  founder_archetype?: string
  engagement_pulse?: string
  company_name?: string
}

export async function scoreConversation(
  conversation: ConversationTurn[]
): Promise<ScoringResult> {
  const [config, coreKnowledge] = await Promise.all([
    getActiveConfig(),
    getStrategicCore(5000), // Slightly more for final scoring than questioning
  ])

  const transcript = conversation
    .slice(-30) // Only analyze the last 15 turns (30 entries) to prevent overflow
    .map((t) => `${t.role === 'user' ? 'Founder' : 'Interviewer'}: ${t.content}`)
    .join('\n\n')

  const { pmf, validation, growth, mindset, revenue } = config.scoring_weights
  const totalCap = pmf + validation + growth + mindset + revenue

  const systemPrompt = `You are analyzing a founder's responses from a business diagnostic interview.
Think like a senior partner reviewing a new client engagement.

Identify the Business Name / Company Name if mentioned (usually near the start).

Score on 5 dimensions:
1. PMF Clarity — 0 to ${pmf}
2. Customer Validation — 0 to ${validation}
3. Growth Readiness — 0 to ${growth}
4. Founder Mindset — 0 to ${mindset}
5. Revenue Potential — 0 to ${revenue}

Maximum total score: ${totalCap}. High score = most ready for fast, measurable results.
Low score = needs more groundwork before moving fast.

[STRATEGIC PRINCIPLES]
${coreKnowledge}

Output ONLY valid JSON in this exact format:
{
  "score": <total 0-${totalCap}>,
  "breakdown": {"pmf": <0-${pmf}>, "validation": <0-${validation}>, "growth": <0-${growth}>, "mindset": <0-${mindset}>, "revenue": <0-${revenue}>},
  "summary": "<2-3 sentence honest portrait of where this founder is right now>",
  "biggest_opportunity": "<one sentence — what is most likely to unlock growth>",
  "biggest_risk": "<one sentence — what could slow or stop progress>",
  "company_name": "<The business name mentioned, or null if unknown>",
  "founder_archetype": "<One of: 'The Visionary', 'The Operator', 'The Hustler', 'The Technician'>",
  "engagement_pulse": "<One of: 'High - Ready to move', 'Medium - Cautiously interested', 'Low - Informational only'>"
}`

  const { text: raw } = await callLLM({
    messages: [{ role: 'user', content: transcript }],
    systemPrompt,
    chain: 'assessment',
    maxTokens: 512,
  })
  const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()

  try {
    const parsed = JSON.parse(text) as ScoringResult
    if (typeof parsed.score !== 'number' || parsed.score < 0 || parsed.score > totalCap) {
      throw new Error('Invalid score value')
    }
    if (!parsed.breakdown) throw new Error('Missing breakdown')

    // Clamp breakdown values to their caps instead of throwing
    const dims = { pmf, validation, growth, mindset, revenue }
    for (const [key, cap] of Object.entries(dims)) {
      const val = parsed.breakdown[key as keyof ScoreBreakdown]
      if (typeof val !== 'number' || val < 0) {
        throw new Error(`Invalid breakdown value for ${key}: ${val}`)
      }
      if (val > cap) {
        console.warn(`Score breakdown ${key}=${val} exceeds cap ${cap} — clamping`)
        parsed.breakdown[key as keyof ScoreBreakdown] = cap
      }
    }

    if (typeof parsed.summary !== 'string' || !parsed.summary.trim()) {
      throw new Error('Missing summary')
    }
    return parsed
  } catch {
    throw new Error(`Failed to parse scoring response: ${text}`)
  }
}
