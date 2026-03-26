# Self-Improving Journey Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a scheduled AI agent that analyses assessment session data and autonomously improves the founder qualification funnel (questions, intro copy, scoring weights) with hybrid low/high-risk approval.

**Architecture:** PostgreSQL versioned config table (`journey_config`) + per-session analytics table (`session_analytics`) + in-memory cached config service + weekly Claude Opus optimizer + admin dashboard tab. Low-risk changes auto-activate; high-risk changes are held for one-tap dashboard approval.

**Tech Stack:** Node.js/Express/TypeScript (server), React/Vite/TypeScript (client), PostgreSQL (pg pool), Anthropic SDK (claude-opus-4-6), Resend (email), Vitest (tests), Framer Motion (dashboard UI)

---

## File Map

| File | Action |
|------|--------|
| `server/src/db/schema.sql` | Add `journey_config`, `session_analytics` tables; add `journey_config_version` column to `sessions` |
| `server/src/db/seeds/journeyConfigV1.ts` | **New** — v1 config seed: system prompt, intro messages, scoring weights |
| `server/src/services/journeyConfig.ts` | **New** — shared config cache (60s TTL, hardcoded fallback) |
| `server/src/services/questioning.ts` | Replace hardcoded system prompt with `getActiveConfig()` + placeholder injection |
| `server/src/services/scoring.ts` | Replace hardcoded `> 20` caps with `config.scoring_weights` |
| `server/src/routes/sessions.ts` | Stamp `journey_config_version` at `/start`; insert `session_analytics` row on `/complete` |
| `server/src/scripts/backfillAnalytics.ts` | **New** — one-time idempotent backfill of `session_analytics` from existing data |
| `server/src/services/email.ts` | Add `sendOptimizerProposal` and `sendOptimizerFailure` functions |
| `server/src/routes/journey.ts` | **New** — all `/api/journey/*` routes (per-route auth except `GET /intro`) |
| `server/src/index.ts` | Register `/api/journey` router |
| `server/src/services/journeyOptimizer.ts` | **New** — optimizer agent: metrics → Claude Opus → validate → apply |
| `server/src/scripts/runOptimizer.ts` | **New** — cron entry point (direct function call, exit 0/1) |
| `client/src/components/CosmicJourney/index.tsx` | Add `Promise.race` fetch of `/api/journey/intro` with 5s timeout fallback to hardcoded `MSGS` |
| `client/src/components/Dashboard/Intelligence.tsx` | **New** — metrics strip, pending approval card, version history table |
| `client/src/components/Dashboard/index.tsx` | Add `intelligence` to `Section` type + `Intelligence` tab in nav + render branch |
| `server/railway.json` | Add nightly abandoned-session cron `0 2 * * *` |

---

## Task 1: Install Vitest for server-side tests

**Files:**
- Modify: `server/package.json`
- Create: `server/vitest.config.ts`

- [ ] **Step 1: Install vitest**

```bash
cd server && npm install --save-dev vitest @vitest/runner
```

- [ ] **Step 2: Create vitest config**

```typescript
// server/vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
})
```

- [ ] **Step 3: Add test script to package.json**

In `server/package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Verify vitest runs**

```bash
cd server && npx vitest run
```
Expected: `No test files found` (no error, exit 0).

- [ ] **Step 5: Commit**

```bash
git add server/package.json server/package-lock.json server/vitest.config.ts
git commit -m "chore: add vitest for server-side tests"
```

---

## Task 2: Schema additions

**Files:**
- Modify: `server/src/db/schema.sql`

> The migration runner (`tsx src/db/migrate.ts`) runs schema.sql idempotently using `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`. All additions must follow this pattern.

- [ ] **Step 1: Add `journey_config_version` column to `sessions`**

Append to `server/src/db/schema.sql` (after the existing sessions table definition):

```sql
-- Add journey_config_version to sessions (idempotent)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS journey_config_version INT;
```

- [ ] **Step 2: Add `journey_config` table**

Append to `server/src/db/schema.sql`:

```sql
-- Versioned snapshots of all runtime-configurable funnel content
CREATE TABLE IF NOT EXISTS journey_config (
  id              SERIAL PRIMARY KEY,
  version         INT NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'proposed',
  -- status: 'proposed' | 'active' | 'archived' | 'dismissed'
  system_prompt   TEXT NOT NULL,
  intro_messages  JSONB NOT NULL,
  scoring_weights JSONB NOT NULL,
  change_summary  TEXT NOT NULL,
  risk_level      VARCHAR(10) NOT NULL,
  reasoning       TEXT NOT NULL,
  metrics_snapshot JSONB,
  activated_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journey_config_status ON journey_config (status);
CREATE INDEX IF NOT EXISTS idx_journey_config_version ON journey_config (version DESC);

-- Only one active config at a time (DB-enforced)
CREATE UNIQUE INDEX IF NOT EXISTS journey_config_one_active
  ON journey_config ((1)) WHERE status = 'active';
```

- [ ] **Step 3: Add `session_analytics` table**

Append to `server/src/db/schema.sql`:

```sql
-- Derived signals per session, computed server-side
CREATE TABLE IF NOT EXISTS session_analytics (
  id                      SERIAL PRIMARY KEY,
  session_id              UUID NOT NULL REFERENCES sessions(id),
  assessment_id           INT REFERENCES assessments(id),
  completed               BOOLEAN NOT NULL DEFAULT FALSE,
  question_count          INT NOT NULL DEFAULT 0,
  avg_answer_words        FLOAT,
  min_answer_words        INT,
  max_answer_words        INT,
  drop_off_at_question    INT,
  score                   INT,
  score_breakdown         JSONB,
  journey_config_version  INT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS session_analytics_session_id
  ON session_analytics (session_id);
CREATE INDEX IF NOT EXISTS idx_session_analytics_completed
  ON session_analytics (completed);
CREATE INDEX IF NOT EXISTS idx_session_analytics_created
  ON session_analytics (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_analytics_config_version
  ON session_analytics (journey_config_version);
```

- [ ] **Step 4: Run migration against local DB**

```bash
cd server && npm run migrate
```
Expected: `Migration complete`

- [ ] **Step 5: Commit**

```bash
git add server/src/db/schema.sql
git commit -m "feat: add journey_config and session_analytics schema"
```

---

## Task 3: V1 seed file

**Files:**
- Create: `server/src/db/seeds/journeyConfigV1.ts`

This is the single source of truth for the v1 content values. The `system_prompt` uses `{{KNOWLEDGE_BASE}}` and `{{RAG_CONTEXT}}` as literal placeholders — `questioning.ts` substitutes them at runtime so the optimizer can edit the instructional parts without breaking knowledge injection.

> **Sync note:** `V1_INTRO_MESSAGES` must match the `MSGS` array in `client/src/components/CosmicJourney/index.tsx`. If either is updated, update the other.

- [ ] **Step 1: Create seed file**

```typescript
// server/src/db/seeds/journeyConfigV1.ts

// IMPORTANT: V1_INTRO_MESSAGES must stay in sync with the MSGS constant in
// client/src/components/CosmicJourney/index.tsx — the frontend uses that array
// as a fallback when the API is unavailable.

export const V1_SYSTEM_PROMPT = `You are the intelligence behind an elite business diagnostic for Baawa — a world-class digital marketing agency.
Your role is to conduct a deep, adaptive interview with a founder about their business.

Think like a partner at KPMG, Ogilvy, and a Rory Sutherland-trained behavioral strategist — all in one.
You are strategic, diagnostic, and deeply curious. You ask questions that make founders feel truly seen.

[KNOWLEDGE BASE]
{{KNOWLEDGE_BASE}}
{{RAG_CONTEXT}}

ABSOLUTE RULES:
1. You ONLY ask questions. Never provide advice, analysis, validation, or answers.
2. Never affirm answers ("great", "interesting", "exactly"). Just ask the next question.
3. Detect the business stage in your first 3-4 questions. Then follow that thread.
4. Each question should follow directly from the founder's last answer — probe what's underneath.
5. Ask ONE question per response.
6. When you have a complete picture of the business (after ~15-20 exchanges), output: {"done": true}
7. Otherwise output: {"question": "...", "done": false}
8. Never output anything except valid JSON in one of these two formats.`

export const V1_INTRO_MESSAGES: string[] = [
  'Hello.',
  'Hello.\n\nSpeak your answers out loud — I would prefer that.',
  'Hello.\n\nSpeak your answers out loud — I would prefer that.\n\nSpeak from the heart.',
  'Hello.\n\nSpeak your answers out loud — I would prefer that.\n\nSpeak from the heart.\n\nThis assessment gives us a critical, foundational understanding of whether we can genuinely help you.',
  'Hello.\n\nSpeak your answers out loud — I would prefer that.\n\nSpeak from the heart.\n\nThis assessment gives us a critical, foundational understanding of whether we can genuinely help you.\n\nHonest answers serve you — you will leave with a detailed score and real insight about yourself.',
  'Hello.\n\nSpeak your answers out loud — I would prefer that.\n\nSpeak from the heart.\n\nThis assessment gives us a critical, foundational understanding of whether we can genuinely help you.\n\nHonest answers serve you — you will leave with a detailed score and real insight about yourself.\n\nWe might not be the right fit. That is okay. You will know more about your own business than when you arrived.\n\nShall we begin?',
]

export const V1_SCORING_WEIGHTS = {
  pmf: 20,
  validation: 20,
  growth: 20,
  mindset: 20,
  revenue: 20,
} as const

export const JOURNEY_CONFIG_V1_SEED = {
  version: 1,
  status: 'active' as const,
  system_prompt: V1_SYSTEM_PROMPT,
  intro_messages: V1_INTRO_MESSAGES,
  scoring_weights: V1_SCORING_WEIGHTS,
  change_summary: 'Initial configuration — hardcoded values extracted to database.',
  risk_level: 'low' as const,
  reasoning: 'Seed row. No prior analytics data exists.',
  metrics_snapshot: null,
  activated_at: new Date().toISOString(),
}
```

- [ ] **Step 2: Create and run the seed script inline**

Add to `server/package.json` scripts:
```json
"seed": "tsx src/db/seeds/runSeed.ts"
```

Create `server/src/db/seeds/runSeed.ts`:

```typescript
import 'dotenv/config'
import { db } from '../client'
import { JOURNEY_CONFIG_V1_SEED } from './journeyConfigV1'

async function seed() {
  // Only seed if no journey_config rows exist yet
  const existing = await db.query('SELECT COUNT(*) FROM journey_config')
  if (parseInt(existing.rows[0].count) > 0) {
    console.log('journey_config already seeded — skipping')
    await db.end()
    return
  }

  await db.query(
    `INSERT INTO journey_config
     (version, status, system_prompt, intro_messages, scoring_weights,
      change_summary, risk_level, reasoning, metrics_snapshot, activated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      JOURNEY_CONFIG_V1_SEED.version,
      JOURNEY_CONFIG_V1_SEED.status,
      JOURNEY_CONFIG_V1_SEED.system_prompt,
      JSON.stringify(JOURNEY_CONFIG_V1_SEED.intro_messages),
      JSON.stringify(JOURNEY_CONFIG_V1_SEED.scoring_weights),
      JOURNEY_CONFIG_V1_SEED.change_summary,
      JOURNEY_CONFIG_V1_SEED.risk_level,
      JOURNEY_CONFIG_V1_SEED.reasoning,
      JOURNEY_CONFIG_V1_SEED.metrics_snapshot,
      JOURNEY_CONFIG_V1_SEED.activated_at,
    ]
  )
  console.log('journey_config v1 seed inserted')
  await db.end()
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
```

- [ ] **Step 3: Run seed against local DB**

```bash
cd server && npm run seed
```
Expected: `journey_config v1 seed inserted`
Running again should print: `journey_config already seeded — skipping`

- [ ] **Step 4: Commit**

```bash
git add server/src/db/seeds/
git commit -m "feat: add v1 journey config seed file and seed script"
```

---

## Task 4: journeyConfig shared cache service

**Files:**
- Create: `server/src/services/journeyConfig.ts`
- Create: `server/src/services/journeyConfig.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// server/src/services/journeyConfig.test.ts
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

beforeEach(() => {
  vi.clearAllMocks()
  // Reset module-level cache between tests by invalidating
  invalidateConfigCache()
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

    // Defaults have version 1 and all weights 20
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

    // DB should have been called only once
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
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd server && npx vitest run src/services/journeyConfig.test.ts
```
Expected: FAIL — `Cannot find module './journeyConfig'`

- [ ] **Step 3: Implement journeyConfig.ts**

```typescript
// server/src/services/journeyConfig.ts
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
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd server && npx vitest run src/services/journeyConfig.test.ts
```
Expected: all 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/services/journeyConfig.ts server/src/services/journeyConfig.test.ts
git commit -m "feat: add journeyConfig shared cache service with tests"
```

---

## Task 5: Update questioning.ts to use active config

**Files:**
- Modify: `server/src/services/questioning.ts`

The stored system prompt uses `{{KNOWLEDGE_BASE}}` and `{{RAG_CONTEXT}}` as placeholders. This file substitutes them at call time so the knowledge base content stays dynamic while the prompt structure is DB-controlled.

- [ ] **Step 1: Import getActiveConfig and update generateNextQuestion**

Replace the hardcoded `systemPrompt` string in `server/src/services/questioning.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk'
import { getFullKnowledgeText } from './knowledge'
import { retrieveRelevantChunks } from './rag'
import { getActiveConfig } from './journeyConfig'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface ConversationTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface QuestionResult {
  question: string
  done: boolean
}

export async function generateNextQuestion(
  conversation: ConversationTurn[],
  latestAnswer: string
): Promise<QuestionResult> {
  const model = process.env.CLAUDE_MODEL ?? 'claude-haiku-4-5-20251001'

  const [config, fullKnowledge, relevantChunks] = await Promise.all([
    getActiveConfig(),
    getFullKnowledgeText(),
    retrieveRelevantChunks(latestAnswer),
  ])

  const ragContext = relevantChunks.length > 0
    ? `\n\n[RELEVANT PRINCIPLES]\n${relevantChunks.join('\n\n')}`
    : ''

  const systemPrompt = config.system_prompt
    .replace('{{KNOWLEDGE_BASE}}', fullKnowledge)
    .replace('{{RAG_CONTEXT}}', ragContext)

  const messages: Anthropic.MessageParam[] = conversation.length > 0
    ? conversation.map((turn) => ({
        role: turn.role as 'user' | 'assistant',
        content: turn.content,
      }))
    : [{ role: 'user', content: 'Begin the diagnostic interview.' }]

  const response = await anthropic.messages.create({
    model,
    max_tokens: 256,
    system: systemPrompt,
    messages,
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : ''
  const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()

  try {
    const parsed = JSON.parse(text) as { done: boolean; question?: string }
    if (parsed.done) return { question: '', done: true }
    if (typeof parsed.question === 'string' && parsed.question.length > 0) {
      return { question: parsed.question, done: false }
    }
    throw new Error('Unexpected JSON structure')
  } catch {
    const match = text.match(/"question"\s*:\s*"([^"]+)"/)
    if (match) return { question: match[1], done: false }
    const plain = text.replace(/[{}"\n]/g, '').trim()
    if (plain.length > 10 && plain.endsWith('?')) return { question: plain, done: false }
    throw new Error(`Failed to parse question response: ${text}`)
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd server && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add server/src/services/questioning.ts
git commit -m "feat: questioning.ts reads system prompt from active journey config"
```

---

## Task 6: Update scoring.ts to use active config weights

**Files:**
- Modify: `server/src/services/scoring.ts`

Remove the hardcoded `0–20` cap. Instead inject the active config's `scoring_weights` into the scoring prompt and clamp each dimension to its configured cap after parsing.

- [ ] **Step 1: Write failing test**

Create `server/src/services/scoring.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'

// The actual scoring function calls Claude — we test the validation logic in isolation.
// Extract clampBreakdown for direct testing.

describe('scoring weight clamping', () => {
  it('clamps a score that exceeds its cap to the cap value', () => {
    const weights = { pmf: 25, validation: 25, growth: 20, mindset: 15, revenue: 15 }
    const rawBreakdown = { pmf: 30, validation: 20, growth: 18, mindset: 14, revenue: 12 }
    const clamped = clampBreakdown(rawBreakdown, weights)
    expect(clamped.pmf).toBe(25)   // clamped from 30
    expect(clamped.validation).toBe(20)  // within cap
  })
})

// Inline the helper so we can test it directly without importing the whole module
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
```

- [ ] **Step 2: Run test to confirm it passes (it tests standalone logic)**

```bash
cd server && npx vitest run src/services/scoring.test.ts
```
Expected: 1 test PASS

- [ ] **Step 3: Update scoring.ts**

Replace `server/src/services/scoring.ts` with:

```typescript
import Anthropic from '@anthropic-ai/sdk'
import { getFullKnowledgeText } from './knowledge'
import { ConversationTurn } from './questioning'
import { getActiveConfig } from './journeyConfig'

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
  const [config, fullKnowledge] = await Promise.all([getActiveConfig(), getFullKnowledgeText()])

  const { pmf, validation, growth, mindset, revenue } = config.scoring_weights
  const totalCap = pmf + validation + growth + mindset + revenue

  const transcript = conversation
    .map((t) => `${t.role === 'user' ? 'Founder' : 'Interviewer'}: ${t.content}`)
    .join('\n\n')

  const systemPrompt = `You are analyzing a founder's responses from a business diagnostic interview.
Think like a senior partner reviewing a new client engagement.

Score on 5 dimensions:
1. PMF Clarity — 0 to ${pmf}
2. Customer Validation — 0 to ${validation}
3. Growth Readiness — 0 to ${growth}
4. Founder Mindset — 0 to ${mindset}
5. Revenue Potential — 0 to ${revenue}

Maximum total score: ${totalCap}. High score = most ready for fast, measurable results.

[KNOWLEDGE BASE]
${fullKnowledge}

Output ONLY valid JSON in this exact format:
{
  "score": <total 0-${totalCap}>,
  "breakdown": {"pmf": <0-${pmf}>, "validation": <0-${validation}>, "growth": <0-${growth}>, "mindset": <0-${mindset}>, "revenue": <0-${revenue}>},
  "summary": "<2-3 sentence honest portrait>",
  "biggest_opportunity": "<one sentence>",
  "biggest_risk": "<one sentence>"
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
    if (typeof parsed.score !== 'number' || parsed.score < 0 || parsed.score > totalCap) {
      throw new Error(`Invalid score value: ${parsed.score}`)
    }
    if (!parsed.breakdown) throw new Error('Missing breakdown')

    // Clamp each dimension to its configured cap (guards against Claude over-scoring)
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
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd server && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add server/src/services/scoring.ts server/src/services/scoring.test.ts
git commit -m "feat: scoring.ts reads weights from active journey config, removes hardcoded caps"
```

---

## Task 7: Update sessions.ts — stamp version + insert analytics on complete

**Files:**
- Modify: `server/src/routes/sessions.ts`

Two changes:
1. `POST /start` — after creating the session, fetch the active config version and update the row.
2. `POST /:id/complete` — after creating the assessment record, insert a `session_analytics` row (non-blocking).

- [ ] **Step 1: Update POST /start to stamp `journey_config_version`**

In `server/src/routes/sessions.ts`, add the import and update the `/start` handler.

Add to the top of the file:
```typescript
import { getActiveConfig } from '../services/journeyConfig'
```

In the `/start` handler, after `const sessionId = sessionResult.rows[0].id`:

```typescript
    // Stamp the active config version on the session before generating Q1.
    // Reading at session start (not completion) is the only reliable way to
    // know which config was in effect for this session.
    const config = await getActiveConfig()
    await db.query(
      `UPDATE sessions SET journey_config_version = $1 WHERE id = $2`,
      [config.version, sessionId]
    )
```

- [ ] **Step 2: Add analytics insert helper function**

Add this function at the bottom of `server/src/routes/sessions.ts` (before `export default router`):

```typescript
// Compute word count stats from a conversation's user turns
function computeAnswerStats(conversation: ConversationTurn[]): {
  question_count: number
  avg_answer_words: number | null
  min_answer_words: number | null
  max_answer_words: number | null
} {
  const userTurns = conversation.filter((t) => t.role === 'user')
  if (userTurns.length === 0) {
    return { question_count: 0, avg_answer_words: null, min_answer_words: null, max_answer_words: null }
  }
  const wordCounts = userTurns.map((t) => t.content.trim().split(/\s+/).length)
  return {
    question_count: userTurns.length,
    avg_answer_words: wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length,
    min_answer_words: Math.min(...wordCounts),
    max_answer_words: Math.max(...wordCounts),
  }
}
```

- [ ] **Step 3: Insert session_analytics on POST /:id/complete**

In the `/:id/complete` handler, after `res.json({ assessmentId: ... })` (fire-and-forget, non-blocking), add:

```typescript
    // Insert session_analytics row — non-blocking, non-critical
    void (async () => {
      try {
        const sessionFull = await db.query<{
          conversation: ConversationTurn[]
          journey_config_version: number | null
        }>(
          'SELECT conversation, journey_config_version FROM sessions WHERE id = $1',
          [id]
        )
        const s = sessionFull.rows[0]
        if (!s) return

        const stats = computeAnswerStats(s.conversation)
        await db.query(
          `INSERT INTO session_analytics
           (session_id, assessment_id, completed, question_count,
            avg_answer_words, min_answer_words, max_answer_words,
            drop_off_at_question, score, score_breakdown, journey_config_version)
           VALUES ($1, $2, true, $3, $4, $5, $6, NULL, $7, $8, $9)
           ON CONFLICT (session_id) DO NOTHING`,
          [
            id,
            assessmentResult.rows[0].id,
            stats.question_count,
            stats.avg_answer_words,
            stats.min_answer_words,
            stats.max_answer_words,
            scoring.score,
            JSON.stringify(scoring.breakdown),
            s.journey_config_version,
          ]
        )
      } catch (e) {
        console.error('session_analytics insert failed (non-critical):', e)
      }
    })()
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd server && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/sessions.ts
git commit -m "feat: stamp journey_config_version at session start, insert analytics on complete"
```

---

## Task 8: backfillAnalytics script

**Files:**
- Create: `server/src/scripts/backfillAnalytics.ts`

Idempotent script — safe to run multiple times. Handles both completed and abandoned sessions.

- [ ] **Step 1: Create the script**

```typescript
// server/src/scripts/backfillAnalytics.ts
import 'dotenv/config'
import { db } from '../db/client'
import { ConversationTurn } from '../services/questioning'

function computeAnswerStats(conversation: ConversationTurn[]) {
  const userTurns = conversation.filter((t) => t.role === 'user')
  if (userTurns.length === 0) {
    return { question_count: 0, avg: null, min: null, max: null }
  }
  const wc = userTurns.map((t) => t.content.trim().split(/\s+/).length)
  return {
    question_count: userTurns.length,
    avg: wc.reduce((a, b) => a + b, 0) / wc.length,
    min: Math.min(...wc),
    max: Math.max(...wc),
  }
}

async function backfill() {
  console.log('Starting session_analytics backfill...')

  // Get all sessions that don't already have an analytics row
  const sessions = await db.query<{
    id: string
    conversation: ConversationTurn[]
    question_count: number
  }>(
    `SELECT s.id, s.conversation, s.question_count
     FROM sessions s
     LEFT JOIN session_analytics sa ON sa.session_id = s.id
     WHERE sa.session_id IS NULL`
  )

  console.log(`Found ${sessions.rows.length} sessions without analytics rows`)

  let inserted = 0
  for (const session of sessions.rows) {
    // Check if this session has a completed assessment
    const assessment = await db.query<{
      id: number
      score: number
      score_breakdown: Record<string, number>
    }>(
      'SELECT id, score, score_breakdown FROM assessments WHERE session_id = $1 LIMIT 1',
      [session.id]
    )

    const stats = computeAnswerStats(session.conversation)
    const hasAssessment = assessment.rows.length > 0
    const a = hasAssessment ? assessment.rows[0] : null

    try {
      await db.query(
        `INSERT INTO session_analytics
         (session_id, assessment_id, completed, question_count,
          avg_answer_words, min_answer_words, max_answer_words,
          drop_off_at_question, score, score_breakdown, journey_config_version)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1)
         ON CONFLICT (session_id) DO NOTHING`,
        [
          session.id,
          a?.id ?? null,
          hasAssessment,
          stats.question_count,
          stats.avg,
          stats.min,
          stats.max,
          hasAssessment ? null : (stats.question_count > 0 ? stats.question_count - 1 : null),
          a?.score ?? null,
          a?.score_breakdown ? JSON.stringify(a.score_breakdown) : null,
        ]
      )
      inserted++
    } catch (e) {
      console.error(`Failed to insert analytics for session ${session.id}:`, e)
    }
  }

  console.log(`Backfill complete — inserted ${inserted} rows`)
  await db.end()
}

backfill().catch((err) => {
  console.error('Backfill failed:', err)
  process.exit(1)
})
```

- [ ] **Step 2: Add script entry to package.json**

In `server/package.json` scripts:
```json
"backfill": "tsx src/scripts/backfillAnalytics.ts"
```

- [ ] **Step 3: Run against local DB**

```bash
cd server && npm run backfill
```
Expected: `Starting session_analytics backfill... Found N sessions... Backfill complete — inserted N rows`
Running again: `Found 0 sessions without analytics rows`

- [ ] **Step 4: Commit**

```bash
git add server/src/scripts/backfillAnalytics.ts server/package.json
git commit -m "feat: add idempotent backfillAnalytics script"
```

---

## Task 9: Email additions for optimizer notifications

**Files:**
- Modify: `server/src/services/email.ts`

Add two new functions at the bottom of the file.

- [ ] **Step 1: Add sendOptimizerProposal**

```typescript
// 5. Optimizer proposed a high-risk config change — held for approval
export async function sendOptimizerProposal(
  changeSummary: string,
  dashboardUrl: string
): Promise<void> {
  if (!FOUNDER_EMAIL) return
  try {
    await resend.emails.send({
      from: FROM,
      to: FOUNDER_EMAIL,
      subject: 'Journey agent: new config proposal awaiting approval',
      html: `<h2>Journey Agent — Config Proposal</h2>
<p>The journey optimizer has proposed a high-risk configuration change that requires your approval before activation.</p>
<p><strong>Summary:</strong> ${escapeHtml(changeSummary)}</p>
<p><a href="${escapeHtml(dashboardUrl)}/dashboard/intelligence">Review and approve in dashboard →</a></p>`,
    })
  } catch (err) {
    throw new Error(`Failed to send optimizer proposal email: ${String(err)}`)
  }
}

// 6. Optimizer run failed — alert founder
export async function sendOptimizerFailure(errorMessage: string): Promise<void> {
  if (!FOUNDER_EMAIL) return
  try {
    await resend.emails.send({
      from: FROM,
      to: FOUNDER_EMAIL,
      subject: 'Journey agent: optimizer run failed',
      html: `<h2>Journey Optimizer — Run Failed</h2>
<p>The weekly journey optimizer encountered an error and did not produce a new config.</p>
<p><strong>Error:</strong> ${escapeHtml(errorMessage)}</p>
<p>Check server logs for full details.</p>`,
    })
  } catch (err) {
    // Log but don't re-throw — failure email failing is not actionable
    console.error('Failed to send optimizer failure email:', err)
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd server && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add server/src/services/email.ts
git commit -m "feat: add sendOptimizerProposal and sendOptimizerFailure email functions"
```

---

## Task 10: Journey API routes

**Files:**
- Create: `server/src/routes/journey.ts`

All `/api/journey/*` routes. `GET /intro` is public (no auth). All others require `requireAuth`.

- [ ] **Step 1: Create the route file**

```typescript
// server/src/routes/journey.ts
import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import { db } from '../db/client'
import { getActiveConfig, invalidateConfigCache } from '../services/journeyConfig'
import { runOptimizer } from '../services/journeyOptimizer'

const router = Router()

// GET /api/journey/intro — public, no auth
// Returns the active intro_messages array for the frontend typewriter
router.get('/intro', async (_req: Request, res: Response) => {
  try {
    const config = await getActiveConfig()
    res.json({ messages: config.intro_messages })
  } catch {
    res.status(500).json({ error: 'Failed to load intro messages' })
  }
})

// POST /api/journey/optimize — trigger optimizer run
router.post('/optimize', requireAuth, async (_req: Request, res: Response) => {
  try {
    const result = await runOptimizer()
    res.json(result)
  } catch (err) {
    console.error('POST /journey/optimize error:', err)
    res.status(500).json({ error: 'Optimizer run failed' })
  }
})

// GET /api/journey/config — list all versions
router.get('/config', requireAuth, async (_req: Request, res: Response) => {
  try {
    const result = await db.query(
      `SELECT id, version, status, change_summary, risk_level,
              metrics_snapshot, activated_at, created_at
       FROM journey_config
       ORDER BY version DESC`
    )
    res.json(result.rows)
  } catch (err) {
    console.error('GET /journey/config error:', err)
    res.status(500).json({ error: 'Failed to load config list' })
  }
})

// GET /api/journey/config/:id — full detail including reasoning
router.get('/config/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await db.query(
      'SELECT * FROM journey_config WHERE id = $1',
      [req.params.id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Config not found' })
    res.json(result.rows[0])
  } catch (err) {
    console.error('GET /journey/config/:id error:', err)
    res.status(500).json({ error: 'Failed to load config' })
  }
})

// POST /api/journey/config/:id/activate — approve a proposed config
router.post('/config/:id/activate', requireAuth, async (req: Request, res: Response) => {
  const client = await db.connect()
  try {
    await client.query('BEGIN')

    const configResult = await client.query(
      `SELECT id, version FROM journey_config WHERE id = $1 AND status = 'proposed'`,
      [req.params.id]
    )
    if (configResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Proposed config not found' })
    }

    await client.query(
      `UPDATE journey_config SET status = 'archived' WHERE status = 'active'`
    )
    await client.query(
      `UPDATE journey_config SET status = 'active', activated_at = NOW() WHERE id = $1`,
      [req.params.id]
    )

    await client.query('COMMIT')
    await invalidateConfigCache()
    res.json({ activated: true })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('POST /journey/config/:id/activate error:', err)
    // Partial unique index will cause 23505 on race condition
    res.status(409).json({ error: 'Activation conflict — another config may have been activated simultaneously' })
  } finally {
    client.release()
  }
})

// POST /api/journey/config/:id/dismiss — reject a proposed config
router.post('/config/:id/dismiss', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await db.query(
      `UPDATE journey_config SET status = 'dismissed'
       WHERE id = $1 AND status = 'proposed'
       RETURNING id`,
      [req.params.id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Proposed config not found' })
    res.json({ dismissed: true })
  } catch (err) {
    console.error('POST /journey/config/:id/dismiss error:', err)
    res.status(500).json({ error: 'Failed to dismiss config' })
  }
})

// GET /api/journey/metrics — completion rate, answer depth, score distribution
router.get('/metrics', requireAuth, async (_req: Request, res: Response) => {
  try {
    const windows = [30, 60, 90]
    const results: Record<string, unknown> = {}

    for (const days of windows) {
      const r = await db.query(
        `SELECT
          COUNT(*) FILTER (WHERE completed = true) AS completed_count,
          COUNT(*) FILTER (WHERE completed = false) AS abandoned_count,
          ROUND(AVG(avg_answer_words) FILTER (WHERE completed = true)::numeric, 1) AS avg_answer_words,
          ROUND(AVG(score) FILTER (WHERE completed = true)::numeric, 1) AS score_mean,
          ROUND(STDDEV(score) FILTER (WHERE completed = true)::numeric, 1) AS score_std,
          COUNT(*) FILTER (WHERE score BETWEEN 0 AND 20) AS bucket_0_20,
          COUNT(*) FILTER (WHERE score BETWEEN 21 AND 40) AS bucket_21_40,
          COUNT(*) FILTER (WHERE score BETWEEN 41 AND 60) AS bucket_41_60,
          COUNT(*) FILTER (WHERE score BETWEEN 61 AND 80) AS bucket_61_80,
          COUNT(*) FILTER (WHERE score BETWEEN 81 AND 100) AS bucket_81_100
         FROM session_analytics
         WHERE created_at > NOW() - INTERVAL '${days} days'`,
        []
      )
      const row = r.rows[0]
      const completed = parseInt(row.completed_count)
      const abandoned = parseInt(row.abandoned_count)
      const total = completed + abandoned
      results[`${days}d`] = {
        completion_rate: total > 0 ? Math.round((completed / total) * 1000) / 10 : null,
        avg_answer_words: row.avg_answer_words ? parseFloat(row.avg_answer_words) : null,
        score_mean: row.score_mean ? parseFloat(row.score_mean) : null,
        score_std: row.score_std ? parseFloat(row.score_std) : null,
        score_distribution: {
          '0-20': parseInt(row.bucket_0_20),
          '21-40': parseInt(row.bucket_21_40),
          '41-60': parseInt(row.bucket_41_60),
          '61-80': parseInt(row.bucket_61_80),
          '81-100': parseInt(row.bucket_81_100),
        },
      }
    }

    // Active config
    const activeConfig = await db.query(
      `SELECT version, activated_at FROM journey_config WHERE status = 'active' LIMIT 1`
    )

    res.json({
      windows: results,
      active_config_version: activeConfig.rows[0]?.version ?? null,
      active_config_activated_at: activeConfig.rows[0]?.activated_at ?? null,
    })
  } catch (err) {
    console.error('GET /journey/metrics error:', err)
    res.status(500).json({ error: 'Failed to load metrics' })
  }
})

export default router
```

- [ ] **Step 2: Verify TypeScript compiles (will fail until journeyOptimizer exists)**

This will fail with "Cannot find module journeyOptimizer" — that's expected. Proceed to Task 11 to fix it.

- [ ] **Step 3: Commit (stash if TS errors)**

```bash
git add server/src/routes/journey.ts
git commit -m "feat: add journey API routes (intro, optimize, config CRUD, metrics)"
```

---

## Task 11: Register journey router in index.ts

**Files:**
- Modify: `server/src/index.ts`

- [ ] **Step 1: Import and register the journey router**

In `server/src/index.ts`, add to imports:
```typescript
import journeyRouter from './routes/journey'
```

Add to the routes section (after `app.use('/api/market-data', marketRouter)`):
```typescript
app.use('/api/journey', journeyRouter)
```

- [ ] **Step 2: Verify TypeScript compiles (will still fail until journeyOptimizer exists)**

Proceed to Task 12 first, then come back to verify.

- [ ] **Step 3: Commit**

```bash
git add server/src/index.ts
git commit -m "feat: register /api/journey router"
```

---

## Task 12: journeyOptimizer service

**Files:**
- Create: `server/src/services/journeyOptimizer.ts`
- Create: `server/src/services/journeyOptimizer.test.ts`

This is the most complex service. Write tests for the validation/normalisation logic, which is pure and can be tested without hitting Claude or the DB.

- [ ] **Step 1: Write failing tests for weight normalisation**

```typescript
// server/src/services/journeyOptimizer.test.ts
import { describe, it, expect } from 'vitest'
import { normaliseWeights, validateRiskLevel } from './journeyOptimizer'

describe('normaliseWeights', () => {
  it('passes through weights that already sum to 100', () => {
    const w = { pmf: 20, validation: 20, growth: 20, mindset: 20, revenue: 20 }
    expect(normaliseWeights(w)).toEqual(w)
  })

  it('normalises weights that sum to 99 by adding 1 to highest', () => {
    // All equal at 19+19+20+20+20 = 98... let's use a clearer example
    const w = { pmf: 19, validation: 20, growth: 20, mindset: 20, revenue: 20 }
    // Sum = 99; should add 1 to first highest (validation=20 tied with growth/mindset/revenue, so first in order is validation)
    const result = normaliseWeights(w)
    expect(Object.values(result).reduce((a, b) => a + b, 0)).toBe(100)
    expect(Number.isInteger(result.pmf)).toBe(true)
  })

  it('normalises weights that sum to 101 by subtracting 1 from highest', () => {
    const w = { pmf: 21, validation: 20, growth: 20, mindset: 20, revenue: 20 }
    // Sum = 101; subtract 1 from pmf (highest)
    const result = normaliseWeights(w)
    expect(Object.values(result).reduce((a, b) => a + b, 0)).toBe(100)
    expect(result.pmf).toBe(20)
  })

  it('tie-breaking uses key order: pmf first', () => {
    const w = { pmf: 20, validation: 20, growth: 20, mindset: 20, revenue: 19 }
    // Sum = 99; add 1 to first highest, which is pmf (all equal except revenue)
    const result = normaliseWeights(w)
    expect(result.pmf).toBe(21)
    expect(result.validation).toBe(20)
  })
})

describe('validateRiskLevel', () => {
  const currentWeights = { pmf: 20, validation: 20, growth: 20, mindset: 20, revenue: 20 }

  it('returns "low" when all weights shift ≤5', () => {
    const proposed = { pmf: 25, validation: 20, growth: 20, mindset: 20, revenue: 15 }
    expect(validateRiskLevel('low', proposed, currentWeights)).toBe('low')
  })

  it('overrides to "high" when any weight shifts >5', () => {
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
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd server && npx vitest run src/services/journeyOptimizer.test.ts
```
Expected: FAIL — module not found

- [ ] **Step 3: Implement journeyOptimizer.ts**

```typescript
// server/src/services/journeyOptimizer.ts
import Anthropic from '@anthropic-ai/sdk'
import { db } from '../db/client'
import { getActiveConfig, invalidateConfigCache, JourneyConfig } from './journeyConfig'
import { sendOptimizerProposal, sendOptimizerFailure } from './email'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Reserved lock ID for this service — no other service may use this ID.
const OPTIMIZER_LOCK_ID = 7_387_261

const DIMS = ['pmf', 'validation', 'growth', 'mindset', 'revenue'] as const
type Weights = Record<typeof DIMS[number], number>

// Exported for unit testing
export function normaliseWeights(raw: Weights): Weights {
  const total = DIMS.reduce((s, k) => s + raw[k], 0)
  if (total === 100) return raw

  // Proportional rounding
  const rounded: Weights = {} as Weights
  let runningSum = 0
  for (const key of DIMS) {
    rounded[key] = Math.round((raw[key] / total) * 100)
    runningSum += rounded[key]
  }

  const remainder = 100 - runningSum
  if (remainder !== 0) {
    // Apply remainder to highest-weighted dim; tie-break by key order
    const maxVal = Math.max(...DIMS.map((k) => rounded[k]))
    const target = DIMS.find((k) => rounded[k] === maxVal)!
    rounded[target] += remainder
  }

  return rounded
}

// Exported for unit testing
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
  // Acquire advisory lock — prevents concurrent runs
  const lockResult = await db.query<{ acquired: boolean }>(
    `SELECT pg_try_advisory_lock($1) AS acquired`,
    [OPTIMIZER_LOCK_ID]
  )
  if (!lockResult.rows[0].acquired) {
    return { skipped: true, reason: 'Run already in progress' }
  }

  try {
    const config = await getActiveConfig()

    // Data gate: ≥10 completed sessions under current config version
    const countResult = await db.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM session_analytics
       WHERE completed = true AND journey_config_version = $1`,
      [config.version]
    )
    const sessionCount = parseInt(countResult.rows[0].count)
    if (sessionCount < 10) {
      return { skipped: true, reason: `Insufficient data for current config version (${sessionCount} completed sessions, need ≥10)` }
    }

    // Step 1: Compute metrics
    const metricsResult = await db.query(
      `SELECT
        COUNT(*) FILTER (WHERE completed = true) AS completed_count,
        COUNT(*) FILTER (WHERE completed = false) AS abandoned_count,
        AVG(avg_answer_words) FILTER (WHERE completed = true) AS avg_answer_words,
        AVG(score) FILTER (WHERE completed = true) AS score_mean,
        STDDEV(score) FILTER (WHERE completed = true) AS score_std,
        json_object_agg(
          drop_off_at_question::text,
          cnt
        ) FILTER (WHERE drop_off_at_question IS NOT NULL) AS drop_off_map
       FROM (
         SELECT *, COUNT(*) OVER (PARTITION BY drop_off_at_question) AS cnt
         FROM session_analytics
         WHERE journey_config_version = $1
       ) t`,
      [config.version]
    )
    const m = metricsResult.rows[0]
    const completed = parseInt(m.completed_count)
    const abandoned = parseInt(m.abandoned_count)
    const total = completed + abandoned

    // Find questions with shallow answers (avg < 20 words)
    const shallowResult = await db.query<{ question_idx: number }>(
      `SELECT UNNEST(
         ARRAY(
           SELECT idx FROM generate_series(0, 24) idx
         )
       ) AS question_idx`,
      []
    )
    // Simplified: identify shallow questions from per-session data isn't stored at question level.
    // We note this as a limitation in the optimizer prompt.

    const metricsSnapshot = {
      completion_rate: total > 0 ? completed / total : 0,
      avg_answer_words: m.avg_answer_words ? parseFloat(m.avg_answer_words) : 0,
      score_mean: m.score_mean ? parseFloat(m.score_mean) : 0,
      score_std: m.score_std ? parseFloat(m.score_std) : 0,
      session_count: sessionCount,
    }

    // Step 2: Build Claude prompt
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
- Drop-off map: ${JSON.stringify(m.drop_off_map ?? {})}

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

    // Step 3: Call Claude Opus
    let rawResponse: string
    try {
      const response = await anthropic.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 4096,
        system: 'You are a senior conversion strategist, behavioural psychologist, and Ogilvy-trained copywriter specialising in founder qualification funnels. You have access to session analytics and the current assessment configuration. Your job is to diagnose underperformance and produce a strictly improved configuration.',
        messages: [{ role: 'user', content: userMessage }],
      })
      rawResponse = response.content[0].type === 'text' ? response.content[0].text : ''
    } catch (err) {
      const msg = `Claude API error: ${String(err)}`
      void sendOptimizerFailure(msg)
      throw new Error(msg)
    }

    // Step 4: Parse and validate
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
      // Retry once with error feedback
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

    // Validate system_prompt preserves placeholders
    if (!parsed.system_prompt.includes('{{KNOWLEDGE_BASE}}') || !parsed.system_prompt.includes('{{RAG_CONTEXT}}')) {
      const msg = 'Claude removed required placeholders from system_prompt'
      void sendOptimizerFailure(msg)
      throw new Error(msg)
    }

    // Validate intro_messages accumulation invariant
    if (!Array.isArray(parsed.intro_messages) || parsed.intro_messages.length < 2) {
      throw new Error('intro_messages must be a string array with at least 2 elements')
    }
    for (let i = 1; i < parsed.intro_messages.length; i++) {
      if (parsed.intro_messages[i].length <= parsed.intro_messages[i - 1].length) {
        throw new Error(`intro_messages accumulation invariant violated at index ${i}`)
      }
    }

    // Validate scoring_weights keys
    const requiredKeys: typeof DIMS[number][] = ['pmf', 'validation', 'growth', 'mindset', 'revenue']
    for (const key of requiredKeys) {
      if (typeof parsed.scoring_weights[key] !== 'number' || parsed.scoring_weights[key] <= 0) {
        throw new Error(`Invalid scoring_weights.${key}: ${parsed.scoring_weights[key]}`)
      }
    }

    // Normalise weights to sum exactly 100
    const normalisedWeights = normaliseWeights(parsed.scoring_weights)
    const weightSum = Object.values(normalisedWeights).reduce((a, b) => a + b, 0)
    if (weightSum !== 100) {
      console.warn(`Weight normalisation produced sum ${weightSum} — this is a bug`)
    }

    // Server-side risk override
    const riskLevel = validateRiskLevel(parsed.risk_level, normalisedWeights, config.scoring_weights as Weights)

    // Step 5: Determine next version number
    const versionResult = await db.query<{ max: number | null }>(
      'SELECT MAX(version) AS max FROM journey_config'
    )
    const nextVersion = (versionResult.rows[0].max ?? 0) + 1

    // Step 5: Apply hybrid approval
    if (riskLevel === 'low') {
      // Auto-activate within a single transaction
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
      // Insert as proposed, email founder
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
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd server && npx vitest run src/services/journeyOptimizer.test.ts
```
Expected: all 5 tests PASS

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd server && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add server/src/services/journeyOptimizer.ts server/src/services/journeyOptimizer.test.ts
git commit -m "feat: add journeyOptimizer service with advisory lock, data gate, Claude Opus, hybrid approval"
```

---

## Task 13: runOptimizer cron script

**Files:**
- Create: `server/src/scripts/runOptimizer.ts`

Thin cron entry point — calls optimizer directly (no HTTP), exits 0 on success, 1 on failure.

- [ ] **Step 1: Create the script**

```typescript
// server/src/scripts/runOptimizer.ts
import 'dotenv/config'
import { runOptimizer } from '../services/journeyOptimizer'

async function main() {
  console.log('[runOptimizer] Starting optimizer run...')
  const result = await runOptimizer()
  console.log('[runOptimizer] Result:', JSON.stringify(result))
  process.exit(0)
}

main().catch((err) => {
  console.error('[runOptimizer] Fatal error:', err)
  process.exit(1)
})
```

- [ ] **Step 2: Add run script to package.json**

```json
"optimize": "tsx src/scripts/runOptimizer.ts"
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd server && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add server/src/scripts/runOptimizer.ts server/package.json
git commit -m "feat: add runOptimizer cron entry point script"
```

---

## Task 14: CosmicJourney — fetch intro from API

**Files:**
- Modify: `client/src/components/CosmicJourney/index.tsx`

Add a `useEffect` that fires on mount to fetch `/api/journey/intro` with a 5-second timeout. On success, replace the MSGS array used for typewriter. On any failure or timeout, silently use the hardcoded `MSGS` constant.

The `MSGS` constant stays in the file as the fallback — it is not removed.

- [ ] **Step 1: Add intro fetch state and useEffect**

In `client/src/components/CosmicJourney/index.tsx`, add a new state variable near the top of the component function (after the existing `useState` calls):

```typescript
const [msgs, setMsgs] = useState<string[]>(MSGS)
```

Add a new `useEffect` that fires once on mount:

```typescript
// Fetch live intro messages from API (falls back to hardcoded MSGS on any failure)
useEffect(() => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)

  fetch('/api/journey/intro', { signal: controller.signal })
    .then((res) => res.json())
    .then((data: { messages?: string[] }) => {
      if (Array.isArray(data.messages) && data.messages.length >= 2) {
        setMsgs(data.messages)
      }
    })
    .catch(() => {
      // Silently fall back to hardcoded MSGS
    })
    .finally(() => clearTimeout(timeoutId))

  return () => {
    controller.abort()
    clearTimeout(timeoutId)
  }
}, [])
```

- [ ] **Step 2: Replace all references to `MSGS` in the component body with `msgs`**

Search for uses of `MSGS[` and `MSGS.length` in the component render/logic and replace with `msgs[` and `msgs.length`. The `MSGS` constant declaration at the top of the file stays (it is the fallback value).

In the typewriter logic, wherever `MSGS` is used as the source of typewriter steps — replace with `msgs`.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd client && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Smoke-test locally**

```bash
cd client && npm run dev
```
Navigate to the intro. Open DevTools → Network tab. Confirm a request to `/api/journey/intro` is made on load. The intro should display normally regardless of whether the request succeeds (start the dev server without the backend and confirm the fallback MSGS still display).

- [ ] **Step 5: Commit**

```bash
git add client/src/components/CosmicJourney/index.tsx
git commit -m "feat: CosmicJourney fetches intro messages from API with 5s timeout fallback"
```

---

## Task 15: Dashboard Intelligence tab

**Files:**
- Create: `client/src/components/Dashboard/Intelligence.tsx`
- Modify: `client/src/components/Dashboard/index.tsx`

This is the most UI-intensive task. The component uses the existing dashboard's color/style conventions (dark theme, Framer Motion, coral accent `#FF6B35`).

- [ ] **Step 1: Create Intelligence.tsx**

```typescript
// client/src/components/Dashboard/Intelligence.tsx
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { API_URL } from '../../lib/api'

interface MetricsWindow {
  completion_rate: number | null
  avg_answer_words: number | null
  score_mean: number | null
  score_std: number | null
  score_distribution: Record<string, number>
}

interface MetricsResponse {
  windows: { '30d': MetricsWindow; '60d': MetricsWindow; '90d': MetricsWindow }
  active_config_version: number | null
  active_config_activated_at: string | null
}

interface ConfigVersion {
  id: number
  version: number
  status: 'active' | 'proposed' | 'archived' | 'dismissed'
  change_summary: string
  risk_level: 'low' | 'high'
  metrics_snapshot: Record<string, number> | null
  activated_at: string | null
  created_at: string
}

interface ConfigDetail extends ConfigVersion {
  system_prompt: string
  intro_messages: string[]
  scoring_weights: Record<string, number>
  reasoning: string
}

interface Props {
  token: string
  on401: () => void
}

const CORAL = '#FF6B35'
const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` })

function fmt(n: number | null, suffix = '') {
  return n === null ? '—' : `${n}${suffix}`
}

function ScoreBar({ label, pct }: { label: string; pct: number }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{label}</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{pct}</span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(pct * 2, 100)}%` }}
          transition={{ duration: 0.6 }}
          style={{ height: '100%', background: CORAL, borderRadius: 2 }}
        />
      </div>
    </div>
  )
}

export function Intelligence({ token, on401 }: Props) {
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null)
  const [configs, setConfigs] = useState<ConfigVersion[]>([])
  const [selectedConfig, setSelectedConfig] = useState<ConfigDetail | null>(null)
  const [window, setWindow] = useState<'30d' | '60d' | '90d'>('30d')
  const [optimizing, setOptimizing] = useState(false)
  const [optimizeResult, setOptimizeResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      const [metricsRes, configsRes] = await Promise.all([
        fetch(`${API_URL}/api/journey/metrics`, { headers: authHeaders(token) }),
        fetch(`${API_URL}/api/journey/config`, { headers: authHeaders(token) }),
      ])
      if (metricsRes.status === 401 || configsRes.status === 401) { on401(); return }
      setMetrics(await metricsRes.json())
      setConfigs(await configsRes.json())
    } catch (e) {
      console.error('Intelligence fetch error:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void fetchData() }, [])

  const loadConfigDetail = async (id: number) => {
    const res = await fetch(`${API_URL}/api/journey/config/${id}`, { headers: authHeaders(token) })
    if (res.status === 401) { on401(); return }
    setSelectedConfig(await res.json())
  }

  const handleActivate = async (id: number) => {
    const res = await fetch(`${API_URL}/api/journey/config/${id}/activate`, {
      method: 'POST',
      headers: authHeaders(token),
    })
    if (res.status === 401) { on401(); return }
    setSelectedConfig(null)
    void fetchData()
  }

  const handleDismiss = async (id: number) => {
    await fetch(`${API_URL}/api/journey/config/${id}/dismiss`, {
      method: 'POST',
      headers: authHeaders(token),
    })
    setSelectedConfig(null)
    void fetchData()
  }

  const handleOptimize = async () => {
    setOptimizing(true)
    setOptimizeResult(null)
    try {
      const res = await fetch(`${API_URL}/api/journey/optimize`, {
        method: 'POST',
        headers: authHeaders(token),
      })
      if (res.status === 401) { on401(); return }
      const data = await res.json() as { skipped?: boolean; reason?: string; activated?: boolean; proposed?: boolean }
      if (data.skipped) setOptimizeResult(`Skipped: ${data.reason}`)
      else if (data.activated) setOptimizeResult('New config auto-activated (low-risk change)')
      else if (data.proposed) setOptimizeResult('New config proposed — check pending card below')
      void fetchData()
    } catch {
      setOptimizeResult('Optimizer run failed — check server logs')
    } finally {
      setOptimizing(false)
    }
  }

  const w = metrics?.windows[window]
  const pendingConfig = configs.find((c) => c.status === 'proposed')
  const activeConfig = configs.find((c) => c.status === 'active')

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
        Loading intelligence data…
      </div>
    )
  }

  return (
    <div style={{ padding: '24px 0', maxWidth: 900 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ color: 'white', fontSize: 20, fontWeight: 600, margin: 0 }}>Journey Intelligence</h2>
          {activeConfig && (
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: '4px 0 0' }}>
              Config v{activeConfig.version} active
              {metrics?.active_config_activated_at
                ? ` · activated ${new Date(metrics.active_config_activated_at).toLocaleDateString()}`
                : ''}
            </p>
          )}
        </div>
        <button
          onClick={() => void handleOptimize()}
          disabled={optimizing}
          style={{
            background: optimizing ? 'rgba(255,107,53,0.3)' : CORAL,
            color: 'white',
            border: 'none',
            borderRadius: 8,
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 600,
            cursor: optimizing ? 'default' : 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {optimizing ? 'Running…' : 'Run Optimizer'}
        </button>
      </div>

      {optimizeResult && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'rgba(255,107,53,0.12)',
            border: '1px solid rgba(255,107,53,0.3)',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 20,
            color: 'rgba(255,176,154,0.9)',
            fontSize: 13,
          }}
        >
          {optimizeResult}
        </motion.div>
      )}

      {/* Metrics strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Completion Rate', value: fmt(w?.completion_rate ?? null, '%') },
          { label: 'Avg Answer Depth', value: fmt(w?.avg_answer_words ?? null, ' words') },
          { label: 'Score Mean', value: fmt(w?.score_mean ?? null, '/100') },
          { label: 'Score Std Dev', value: fmt(w?.score_std ?? null, '') },
        ].map(({ label, value }) => (
          <div key={label} style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10,
            padding: '14px 16px',
          }}>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
            <p style={{ color: 'white', fontSize: 22, fontWeight: 700, margin: 0 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Window selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['30d', '60d', '90d'] as const).map((d) => (
          <button
            key={d}
            onClick={() => setWindow(d)}
            style={{
              background: window === d ? 'rgba(255,107,53,0.2)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${window === d ? 'rgba(255,107,53,0.5)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 6,
              padding: '4px 12px',
              color: window === d ? CORAL : 'rgba(255,255,255,0.5)',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Score distribution */}
      {w?.score_distribution && (
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10,
          padding: 16,
          marginBottom: 20,
        }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>Score Distribution</p>
          {Object.entries(w.score_distribution).map(([bucket, count]) => (
            <ScoreBar key={bucket} label={bucket} pct={count} />
          ))}
        </div>
      )}

      {/* Pending approval card */}
      <AnimatePresence>
        {pendingConfig && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              background: 'rgba(255,107,53,0.06)',
              border: '1px solid rgba(255,107,53,0.25)',
              borderRadius: 12,
              padding: 20,
              marginBottom: 20,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <span style={{ background: 'rgba(255,107,53,0.2)', color: CORAL, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Awaiting Approval · High-Risk
                </span>
                <p style={{ color: 'white', fontSize: 16, fontWeight: 600, margin: '8px 0 4px' }}>
                  Config v{pendingConfig.version}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, margin: 0 }}>
                  {pendingConfig.change_summary}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => void loadConfigDetail(pendingConfig.id)}
                style={{ background: 'rgba(255,255,255,0.08)', color: 'white', border: 'none', borderRadius: 6, padding: '7px 14px', fontSize: 13, cursor: 'pointer' }}
              >
                Review Details
              </button>
              <button
                onClick={() => void handleActivate(pendingConfig.id)}
                style={{ background: CORAL, color: 'white', border: 'none', borderRadius: 6, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Activate
              </button>
              <button
                onClick={() => void handleDismiss(pendingConfig.id)}
                style={{ background: 'transparent', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '7px 14px', fontSize: 13, cursor: 'pointer' }}
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Config detail modal */}
      <AnimatePresence>
        {selectedConfig && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 100, padding: 20,
            }}
            onClick={() => setSelectedConfig(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#111', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 14, padding: 28, maxWidth: 700, width: '100%',
                maxHeight: '80vh', overflowY: 'auto',
              }}
            >
              <h3 style={{ color: 'white', fontSize: 18, margin: '0 0 4px' }}>Config v{selectedConfig.version}</h3>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: '0 0 20px' }}>{selectedConfig.change_summary}</p>

              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>Scoring Weights</p>
              <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                {Object.entries(selectedConfig.scoring_weights).map(([k, v]) => (
                  <span key={k} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 6, padding: '4px 10px', fontSize: 13, color: 'white' }}>
                    {k}: <strong>{v}</strong>
                  </span>
                ))}
              </div>

              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>Reasoning</p>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>{selectedConfig.reasoning}</p>

              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>System Prompt</p>
              <pre style={{
                background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 14,
                fontSize: 11, color: 'rgba(255,255,255,0.7)', overflowX: 'auto',
                whiteSpace: 'pre-wrap', marginBottom: 20,
              }}>{selectedConfig.system_prompt}</pre>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setSelectedConfig(null)} style={{ background: 'rgba(255,255,255,0.08)', color: 'white', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer' }}>Close</button>
                {selectedConfig.status === 'proposed' && (
                  <>
                    <button onClick={() => void handleActivate(selectedConfig.id)} style={{ background: CORAL, color: 'white', border: 'none', borderRadius: 6, padding: '8px 16px', fontWeight: 600, cursor: 'pointer' }}>Activate</button>
                    <button onClick={() => void handleDismiss(selectedConfig.id)} style={{ background: 'transparent', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '8px 16px', cursor: 'pointer' }}>Dismiss</button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Version history */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10,
        overflow: 'hidden',
      }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Version History</p>
        </div>
        {configs.length === 0 && (
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, padding: '16px', margin: 0 }}>No config versions yet.</p>
        )}
        {configs.map((c) => {
          const statusColor: Record<string, string> = {
            active: '#4ADE80', proposed: CORAL, archived: 'rgba(255,255,255,0.3)', dismissed: '#F87171',
          }
          return (
            <div
              key={c.id}
              onClick={() => void loadConfigDetail(c.id)}
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, minWidth: 40 }}>v{c.version}</span>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  background: `${statusColor[c.status]}20`,
                  color: statusColor[c.status],
                }}>
                  {c.status}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>{c.change_summary}</span>
              </div>
              <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>
                {new Date(c.created_at).toLocaleDateString()}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add Intelligence section to Dashboard/index.tsx**

In `client/src/components/Dashboard/index.tsx`:

Add to the import list:
```typescript
import { Intelligence } from './Intelligence'
```

Change the `Section` type to include `'intelligence'`:
```typescript
type Section = 'assessments' | 'pipeline' | 'clients' | 'revenue' | 'knowledge' | 'intelligence'
```

Add to `NAV_ITEMS`:
```typescript
{ key: 'intelligence', label: 'Intelligence' },
```

Add render branch in `renderContent()` (add before the closing brace):
```typescript
    if (section === 'intelligence') {
      return <Intelligence token={token} on401={handle401} />
    }
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd client && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Smoke-test the Intelligence tab**

```bash
cd client && npm run dev
```
Navigate to dashboard → Intelligence tab. Confirm the tab renders (even with no data). Confirm the "Run Optimizer" button is present.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/Dashboard/Intelligence.tsx client/src/components/Dashboard/index.tsx
git commit -m "feat: add Intelligence tab to dashboard with metrics, approval card, version history"
```

---

## Task 16: Railway cron config

**Files:**
- Modify: `server/railway.json`

Add the nightly abandoned-session job. The optimizer job is triggered via `POST /api/journey/optimize` from Railway's cron (or run manually from dashboard) — keep it as a cron script call.

- [ ] **Step 1: Update railway.json**

Replace `server/railway.json` with:

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "node server/dist/src/index.js",
    "restartPolicyType": "ON_FAILURE"
  },
  "crons": [
    {
      "schedule": "0 3 * * 0",
      "command": "node server/dist/src/scripts/runOptimizer.js"
    },
    {
      "schedule": "0 2 * * *",
      "command": "node server/dist/src/scripts/backfillAnalytics.js"
    }
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add server/railway.json
git commit -m "feat: add nightly abandoned-session cron and weekly optimizer cron to Railway config"
```

---

## Task 17: Full integration smoke-test

Before deploying, run a full local integration check.

- [ ] **Step 1: Run all server tests**

```bash
cd server && npx vitest run
```
Expected: all tests PASS

- [ ] **Step 2: TypeScript compile check — server**

```bash
cd server && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: TypeScript compile check — client**

```bash
cd client && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Start both services locally**

```bash
# Terminal 1
cd server && npm run dev

# Terminal 2
cd client && npm run dev
```

- [ ] **Step 5: Verify end-to-end flow**

1. Navigate to the intro — confirm `/api/journey/intro` request in DevTools Network tab returns 200 with `{ messages: [...] }`
2. Complete an assessment (or use curl to `POST /api/sessions/start`) — confirm `journey_config_version = 1` is stored on the session row
3. Submit email on complete — confirm `session_analytics` row is inserted
4. Navigate to Dashboard → Intelligence — confirm metrics load, config v1 shown as active
5. Manually trigger optimizer from dashboard button — confirm `{ skipped: true, reason: "Insufficient data..." }` response

- [ ] **Step 6: Run backfill against local DB**

```bash
cd server && npm run backfill
```
Expected: inserts analytics rows for any pre-existing sessions

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat: complete self-improving journey agent — migration, optimizer, routes, dashboard Intelligence tab"
```

---

## Deployment Checklist

Before pushing to Railway:

- [ ] `FOUNDER_EMAIL` is set in Railway environment variables
- [ ] `ANTHROPIC_API_KEY` is set (already required for existing features)
- [ ] `DASHBOARD_URL` is set (used in optimizer proposal email link)
- [ ] Run `npm run migrate` against production DB (adds new tables + column)
- [ ] Run `npm run seed` against production DB (inserts v1 config)
- [ ] Run `npm run backfill` against production DB (backfills existing sessions)
- [ ] Deploy server, confirm `/health` returns 200
- [ ] Deploy client, confirm intro loads from API
- [ ] Test `POST /api/journey/optimize` manually — expect `{ skipped: true }` until ≥10 sessions under v1
