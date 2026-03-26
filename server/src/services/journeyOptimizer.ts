import Anthropic from '@anthropic-ai/sdk'
import { db } from '../db/client'
import { getActiveConfig, invalidateConfigCache } from './journeyConfig'
import { sendOptimizerProposal, sendOptimizerFailure } from './email'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const OPTIMIZER_LOCK_ID = 7_387_261

const DIMS = ['pmf', 'validation', 'growth', 'mindset', 'revenue'] as const
type Weights = Record<typeof DIMS[number], number>

export function normaliseWeights(raw: Weights): Weights {
  const total = DIMS.reduce((s, k) => s + raw[k], 0)
  if (total === 100) return raw

  const rounded: Weights = {} as Weights
  let runningSum = 0
  for (const key of DIMS) {
    rounded[key] = Math.round((raw[key] / total) * 100)
    runningSum += rounded[key]
  }

  const remainder = 100 - runningSum
  if (remainder !== 0) {
    const maxVal = Math.max(...DIMS.map((k) => rounded[k]))
    const target = DIMS.find((k) => rounded[k] === maxVal)!
    rounded[target] += remainder
  }

  return rounded
}

export function validateRiskLevel(
  claudeLevel: string,
  proposed: Weights,
  current: Weights
): 'low' | 'high' {
  if (claudeLevel === 'high') return 'high'
  const exceeded = DIMS.some((k) => Math.abs(proposed[k] - current[k]) > 5)
  return exceeded ? 'high' : 'low'
}

export interface OptimizerResult {
  skipped?: boolean
  reason?: string
  activated?: boolean
  proposed?: boolean
  configId?: number
  configVersion?: number
}

export async function runOptimizer(): Promise<OptimizerResult> {
  const lockResult = await db.query<{ acquired: boolean }>(
    `SELECT pg_try_advisory_lock($1) AS acquired`,
    [OPTIMIZER_LOCK_ID]
  )
  if (!lockResult.rows[0].acquired) {
    return { skipped: true, reason: 'Run already in progress' }
  }

  try {
    const config = await getActiveConfig()

    const countResult = await db.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM session_analytics
       WHERE completed = true AND journey_config_version = $1`,
      [config.version]
    )
    const sessionCount = parseInt(countResult.rows[0].count)
    if (sessionCount < 10) {
      return { skipped: true, reason: `Insufficient data for current config version (${sessionCount} completed sessions, need ≥10)` }
    }

    const metricsResult = await db.query(
      `SELECT
        COUNT(*) FILTER (WHERE completed = true) AS completed_count,
        COUNT(*) FILTER (WHERE completed = false) AS abandoned_count,
        AVG(avg_answer_words) FILTER (WHERE completed = true) AS avg_answer_words,
        AVG(score) FILTER (WHERE completed = true) AS score_mean,
        STDDEV(score) FILTER (WHERE completed = true) AS score_std
       FROM session_analytics
       WHERE journey_config_version = $1`,
      [config.version]
    )
    const m = metricsResult.rows[0]
    const completed = parseInt(m.completed_count)
    const abandoned = parseInt(m.abandoned_count)
    const total = completed + abandoned

    const metricsSnapshot = {
      completion_rate: total > 0 ? completed / total : 0,
      avg_answer_words: m.avg_answer_words ? parseFloat(m.avg_answer_words) : 0,
      score_mean: m.score_mean ? parseFloat(m.score_mean) : 0,
      score_std: m.score_std ? parseFloat(m.score_std) : 0,
      session_count: sessionCount,
    }

    const userMessage = `
## Current Configuration

### System Prompt
${config.system_prompt}

### Intro Messages (accumulation format — each element is full text so far)
${JSON.stringify(config.intro_messages, null, 2)}

### Scoring Weights (must sum to 100)
${JSON.stringify(config.scoring_weights, null, 2)}

## Session Analytics (${sessionCount} completed sessions under config v${config.version})

- Completion rate: ${(metricsSnapshot.completion_rate * 100).toFixed(1)}% (${completed} completed, ${abandoned} abandoned)
- Avg answer depth: ${metricsSnapshot.avg_answer_words.toFixed(1)} words per answer
  - Interpretation: ${metricsSnapshot.avg_answer_words < 30 ? 'LOW — founders are giving surface-level answers' : metricsSnapshot.avg_answer_words < 60 ? 'MODERATE — reasonable depth but room to improve' : 'GOOD — founders are opening up'}
- Score mean: ${metricsSnapshot.score_mean.toFixed(1)} / 100
- Score std dev: ${metricsSnapshot.score_std.toFixed(1)}
  - Interpretation: ${metricsSnapshot.score_std < 10 ? 'LOW — scores are clustered, poor differentiation between founders' : metricsSnapshot.score_std < 20 ? 'MODERATE' : 'HIGH — good score spread'}

## Your Task

Produce a strictly improved configuration based on this data. Return ONLY valid JSON.

STRICT CONSTRAINTS:
- scoring_weights must be positive integers summing to EXACTLY 100 — verify before returning
- intro_messages must be in accumulation format (each element = full text so far; each must be LONGER than the previous)
- Do NOT add or remove scoring dimensions (pmf, validation, growth, mindset, revenue must all be present)
- Do NOT change intro_messages count by more than ±1
- The system prompt contains {{KNOWLEDGE_BASE}} and {{RAG_CONTEXT}} placeholders — you MUST preserve these exactly
- risk_level: "low" if only wording changes and all weights shift ≤5 points; "high" for any structural change or weight shift >5

Return JSON only, no markdown:
{
  "system_prompt": "...",
  "intro_messages": ["...", "..."],
  "scoring_weights": {"pmf": 20, "validation": 20, "growth": 20, "mindset": 20, "revenue": 20},
  "change_summary": "One to two sentences: what changed and the key insight driving it.",
  "risk_level": "low",
  "reasoning": "Full analytical rationale."
}`

    let rawResponse: string
    try {
      const response = await anthropic.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 4096,
        system: 'You are a senior conversion strategist, behavioural psychologist, and Ogilvy-trained copywriter specialising in founder qualification funnels. Your job is to diagnose underperformance and produce a strictly improved configuration.',
        messages: [{ role: 'user', content: userMessage }],
      })
      rawResponse = response.content[0].type === 'text' ? response.content[0].text : ''
    } catch (err) {
      const msg = `Claude API error: ${String(err)}`
      void sendOptimizerFailure(msg)
      throw new Error(msg)
    }

    const jsonText = rawResponse.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()

    let parsed: {
      system_prompt: string
      intro_messages: string[]
      scoring_weights: Weights
      change_summary: string
      risk_level: string
      reasoning: string
    }

    try {
      parsed = JSON.parse(jsonText)
    } catch {
      try {
        const retryResponse = await anthropic.messages.create({
          model: 'claude-opus-4-6',
          max_tokens: 4096,
          system: 'You are a senior conversion strategist, behavioural psychologist, and Ogilvy-trained copywriter specialising in founder qualification funnels.',
          messages: [
            { role: 'user', content: userMessage },
            { role: 'assistant', content: rawResponse },
            { role: 'user', content: 'Your response was not valid JSON. Please return ONLY valid JSON, no markdown, no explanation.' },
          ],
        })
        const retryText = retryResponse.content[0].type === 'text' ? retryResponse.content[0].text : ''
        parsed = JSON.parse(retryText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim())
      } catch {
        const msg = 'Claude returned malformed JSON on both attempts'
        void sendOptimizerFailure(msg)
        throw new Error(msg)
      }
    }

    if (!parsed.system_prompt.includes('{{KNOWLEDGE_BASE}}') || !parsed.system_prompt.includes('{{RAG_CONTEXT}}')) {
      const msg = 'Claude removed required placeholders from system_prompt'
      void sendOptimizerFailure(msg)
      throw new Error(msg)
    }

    if (!Array.isArray(parsed.intro_messages) || parsed.intro_messages.length < 2) {
      throw new Error('intro_messages must be a string array with at least 2 elements')
    }
    for (let i = 1; i < parsed.intro_messages.length; i++) {
      if (parsed.intro_messages[i].length <= parsed.intro_messages[i - 1].length) {
        throw new Error(`intro_messages accumulation invariant violated at index ${i}`)
      }
    }

    const requiredKeys: typeof DIMS[number][] = ['pmf', 'validation', 'growth', 'mindset', 'revenue']
    for (const key of requiredKeys) {
      if (typeof parsed.scoring_weights[key] !== 'number' || parsed.scoring_weights[key] <= 0) {
        throw new Error(`Invalid scoring_weights.${key}: ${parsed.scoring_weights[key]}`)
      }
    }

    const normalisedWeights = normaliseWeights(parsed.scoring_weights)
    const riskLevel = validateRiskLevel(parsed.risk_level, normalisedWeights, config.scoring_weights as Weights)

    const versionResult = await db.query<{ max: number | null }>(
      'SELECT MAX(version) AS max FROM journey_config'
    )
    const nextVersion = (versionResult.rows[0].max ?? 0) + 1

    if (riskLevel === 'low') {
      const client = await db.connect()
      let newId: number
      try {
        await client.query('BEGIN')
        await client.query(
          `UPDATE journey_config SET status = 'archived' WHERE status = 'active'`
        )
        const insertResult = await client.query<{ id: number }>(
          `INSERT INTO journey_config
           (version, status, system_prompt, intro_messages, scoring_weights,
            change_summary, risk_level, reasoning, metrics_snapshot, activated_at)
           VALUES ($1, 'active', $2, $3, $4, $5, $6, $7, $8, NOW())
           RETURNING id`,
          [
            nextVersion,
            parsed.system_prompt,
            JSON.stringify(parsed.intro_messages),
            JSON.stringify(normalisedWeights),
            parsed.change_summary,
            riskLevel,
            parsed.reasoning,
            JSON.stringify(metricsSnapshot),
          ]
        )
        newId = insertResult.rows[0].id
        await client.query('COMMIT')
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      } finally {
        client.release()
      }
      await invalidateConfigCache()
      return { activated: true, configId: newId, configVersion: nextVersion }
    } else {
      const insertResult = await db.query<{ id: number }>(
        `INSERT INTO journey_config
         (version, status, system_prompt, intro_messages, scoring_weights,
          change_summary, risk_level, reasoning, metrics_snapshot)
         VALUES ($1, 'proposed', $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          nextVersion,
          parsed.system_prompt,
          JSON.stringify(parsed.intro_messages),
          JSON.stringify(normalisedWeights),
          parsed.change_summary,
          riskLevel,
          parsed.reasoning,
          JSON.stringify(metricsSnapshot),
        ]
      )
      const newId = insertResult.rows[0].id

      void sendOptimizerProposal(
        parsed.change_summary,
        process.env.DASHBOARD_URL ?? ''
      ).catch((e) => console.error('Failed to send proposal email:', e))

      return { proposed: true, configId: newId, configVersion: nextVersion }
    }
  } finally {
    await db.query(`SELECT pg_advisory_unlock($1)`, [OPTIMIZER_LOCK_ID])
  }
}
