import Anthropic from '@anthropic-ai/sdk'
import { getFullKnowledgeText } from './knowledge'
import { ConversationTurn } from './questioning'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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
}

export async function scoreConversation(
  conversation: ConversationTurn[]
): Promise<ScoringResult> {
  const model = process.env.CLAUDE_MODEL ?? 'claude-haiku-4-5-20251001'
  const fullKnowledge = await getFullKnowledgeText()

  const transcript = conversation
    .map((t) => `${t.role === 'user' ? 'Founder' : 'Interviewer'}: ${t.content}`)
    .join('\n\n')

  const systemPrompt = `You are analyzing a founder's responses from a business diagnostic interview.
Think like a senior partner reviewing a new client engagement.

Score on 5 dimensions (0-20 each):
1. PMF Clarity — how clearly does the product, customer, and problem map together?
2. Customer Validation — how strong is the external evidence (revenue, retention, referrals)?
3. Growth Readiness — is there a repeatable motion or a clear hypothesis to test?
4. Founder Mindset — how coachable, data-oriented, and realistic is this founder?
5. Revenue Potential — how strong are the unit economics or the path to them?

High score = this founder is most ready to see fast, measurable results.
Low score = this founder needs more groundwork before they will move fast.

[KNOWLEDGE BASE]
${fullKnowledge}

Output ONLY valid JSON in this exact format:
{
  "score": <total 0-100>,
  "breakdown": {"pmf": <0-20>, "validation": <0-20>, "growth": <0-20>, "mindset": <0-20>, "revenue": <0-20>},
  "summary": "<2-3 sentence honest portrait of where this founder is right now>",
  "biggest_opportunity": "<one sentence — what is most likely to unlock growth>",
  "biggest_risk": "<one sentence — what could slow or stop progress>"
}`

  const response = await anthropic.messages.create({
    model,
    max_tokens: 512,
    system: systemPrompt,
    messages: [{ role: 'user', content: transcript }],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : ''
  const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()

  try {
    const parsed = JSON.parse(text) as ScoringResult
    if (typeof parsed.score !== 'number' || parsed.score < 0 || parsed.score > 100) {
      throw new Error('Invalid score value')
    }
    if (!parsed.breakdown) throw new Error('Missing breakdown')
    const { pmf, validation, growth, mindset, revenue } = parsed.breakdown
    for (const [key, val] of Object.entries({ pmf, validation, growth, mindset, revenue })) {
      if (typeof val !== 'number' || val < 0 || val > 20) {
        throw new Error(`Invalid breakdown value for ${key}: ${val}`)
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
