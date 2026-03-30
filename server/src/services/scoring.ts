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

export interface HybridScoringResult extends ScoringResult {
  base_score: number
  adjustment: number
  gut_check: string
  founder_type: 'early_stage' | 'building' | 'scaling'
  dimension_scores: {
    investment_capacity: number
    execution_readiness: number
    market_clarity: number
    priority_clarity: number
    problem_clarity: number
  }
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

/**
 * Hybrid Scoring: Algorithmic base + Claude gut check on open text
 * Inputs: conversation with structured answers from QUESTION_BANK
 * Returns: detailed scoring with base score, adjustment, and gut check
 */
export async function scoreConversationHybrid(
  conversation: { role: string; content: string; structuredAnswer?: { type: string; value: unknown } }[]
): Promise<HybridScoringResult> {
  // Extract structured answers and open text
  const answers = conversation.filter(t => t.role === 'user')
  const q1Answer = answers[0]?.content || ''
  const q6Answer = answers[5]?.content || ''

  // Phase 1: Algorithmic Scoring
  let investmentCapacity = 0
  let executionReadiness = 0
  let marketClarity = 0
  let priorityClarity = 0
  let problemClarity = 0

  // Q2: Where is your business right now? (execution_readiness)
  const q2Answer = answers[1]?.structuredAnswer?.value as string
  const revenueStageMap: Record<string, number> = {
    'Idea stage': 2,
    'Pre-revenue': 5,
    '£0–10K MRR': 10,
    '£10K–50K MRR': 15,
    '£50K+ MRR': 20
  }
  executionReadiness = revenueStageMap[q2Answer] || 8

  // Q5: Market understanding (slider)
  const q5Answer = answers[4]?.structuredAnswer?.value as number
  marketClarity = (q5Answer || 5) * 2 // 0-10 slider → 0-20

  // Q7: Coach spend history (investment_capacity)
  const q7Answer = answers[6]?.structuredAnswer?.value as string
  const coachSpendMap: Record<string, number> = {
    'Never': 0,
    'Under £1K': 5,
    '£1K–5K': 10,
    '£5K–20K': 15,
    '£20K+': 20
  }
  const q7Score = coachSpendMap[q7Answer] || 8

  // Q8: Commitment slider (investment_capacity)
  const q8Answer = answers[7]?.structuredAnswer?.value as number
  const q8Score = (q8Answer || 5) * 2 // 0-10 slider → 0-20

  investmentCapacity = Math.round((q7Score + q8Score) / 2)

  // Q4: Ranking (priority_clarity) — simplified: if first 2 are sensible, high score
  const q4Answer = answers[3]?.structuredAnswer?.value as string[]
  if (q4Answer && q4Answer.length >= 2) {
    const topTwo = q4Answer.slice(0, 2).join(' ').toLowerCase()
    if (topTwo.includes('customer') || topTwo.includes('acquisition')) {
      priorityClarity = 18
    } else if (topTwo.includes('product') || topTwo.includes('team')) {
      priorityClarity = 14
    } else {
      priorityClarity = 10
    }
  } else {
    priorityClarity = 8
  }

  // Q1 + Q6: Problem clarity (open text length + coherence proxy)
  const combinedText = (q1Answer + ' ' + q6Answer).trim()
  if (combinedText.length > 100) {
    problemClarity = 15
  } else if (combinedText.length > 50) {
    problemClarity = 10
  } else {
    problemClarity = 5
  }

  const baseScore =
    investmentCapacity + executionReadiness + marketClarity + priorityClarity + problemClarity

  // Phase 2: Claude Gut Check on Q1 + Q6
  const gutCheckPrompt = `Analyze these two founder answers:

Q1 "Who are you, and what do you want?": "${q1Answer}"

Q6 "What's the hardest business problem you're facing?": "${q6Answer}"

Look for:
- Are they clear on their customer and problem?
- Do they own their challenges or blame externally?
- Self-aware about limitations?
- Red flags: vague, unfocused, unrealistic
- Green flags: specific, thoughtful, realistic

Return JSON:
{
  "gut_check": "<1-2 sentence assessment>",
  "adjustment": <-5 to +5>,
  "founder_type": "<early_stage | building | scaling>"
}`

  const { text: gutRaw } = await callLLM({
    messages: [{ role: 'user', content: gutCheckPrompt }],
    systemPrompt: 'You are a senior partner evaluating founder readiness.',
    chain: 'assessment',
    maxTokens: 200,
  })

  const gutText = gutRaw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
  let adjustment = 0
  let gutCheck = 'Assessment complete.'
  let founderType: 'early_stage' | 'building' | 'scaling' = 'building'

  try {
    const parsed = JSON.parse(gutText)
    adjustment = Math.max(-5, Math.min(5, parsed.adjustment || 0))
    gutCheck = parsed.gut_check || 'Assessment complete.'
    founderType = ['early_stage', 'building', 'scaling'].includes(parsed.founder_type)
      ? parsed.founder_type
      : 'building'
  } catch {
    // If parsing fails, use defaults (adjustment = 0, etc.)
  }

  const finalScore = Math.max(0, Math.min(100, baseScore + adjustment))

  return {
    score: finalScore,
    base_score: baseScore,
    adjustment,
    gut_check: gutCheck,
    founder_type: founderType,
    breakdown: {
      pmf: marketClarity,
      validation: priorityClarity,
      growth: executionReadiness,
      mindset: problemClarity,
      revenue: investmentCapacity
    },
    dimension_scores: {
      investment_capacity: investmentCapacity,
      execution_readiness: executionReadiness,
      market_clarity: marketClarity,
      priority_clarity: priorityClarity,
      problem_clarity: problemClarity
    },
    summary: `${gutCheck}`,
    biggest_opportunity: 'See your full assessment in dashboard.',
    biggest_risk: 'See your full assessment in dashboard.',
    engagement_pulse: finalScore > 70 ? 'High - Ready to move' : finalScore > 50 ? 'Medium - Cautiously interested' : 'Low - Informational only'
  }
}
