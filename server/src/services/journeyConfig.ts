import { db } from '../db/client'
import { V1_SYSTEM_PROMPT, V1_INTRO_MESSAGES, V1_SCORING_WEIGHTS } from '../db/seeds/journeyConfigV1'

export interface JourneyConfig {
  id: number
  version: number
  system_prompt: string
  intro_messages: string[]
  scoring_weights: {
    pmf: number
    validation: number
    growth: number
    mindset: number
    revenue: number
  }
}

const HARDCODED_DEFAULTS: JourneyConfig = {
  id: 0,
  version: 1,
  system_prompt: V1_SYSTEM_PROMPT,
  intro_messages: V1_INTRO_MESSAGES,
  scoring_weights: { ...V1_SCORING_WEIGHTS },
}

let cached: JourneyConfig | null = null
let cacheExpiresAt = 0

export async function getActiveConfig(): Promise<JourneyConfig> {
  if (cached && Date.now() < cacheExpiresAt) {
    return cached
  }

  try {
    const result = await db.query<{
      id: number
      version: number
      system_prompt: string
      intro_messages: string[]
      scoring_weights: JourneyConfig['scoring_weights']
    }>(
      `SELECT id, version, system_prompt, intro_messages, scoring_weights
       FROM journey_config
       WHERE status = 'active'
       ORDER BY version DESC
       LIMIT 1`
    )

    if (result.rows.length === 0) {
      return HARDCODED_DEFAULTS
    }

    cached = result.rows[0]
    cacheExpiresAt = Date.now() + 60_000
    return cached
  } catch {
    return HARDCODED_DEFAULTS
  }
}

export async function invalidateConfigCache(): Promise<void> {
  cached = null
  cacheExpiresAt = 0
}
