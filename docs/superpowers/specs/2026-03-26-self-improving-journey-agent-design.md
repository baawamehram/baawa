# Self-Improving Journey Agent — Design Spec

**Date:** 2026-03-26
**Project:** baawa-mehram
**Status:** Approved for implementation

---

## Overview

A scheduled AI agent that continuously analyses assessment session data and autonomously improves the three levers of the founder qualification funnel: the interview question system prompt, the orb intro typewriter copy, and the scoring rubric weights. Low-risk changes (wording) activate automatically. Structural changes (reordering, weight shifts, intro restructure) are held for one-tap approval in the dashboard.

---

## Goals

- Increase assessment completion rate (founder submits email at end)
- Increase answer depth (word count per answer, especially on high-signal questions)
- Improve score distribution (reduce clustering, better differentiation between founders)
- Give the operator visibility into what the agent changed and why

---

## Non-Goals

- No A/B testing infrastructure (single active config at a time)
- No real-time per-session adaptation (agent runs weekly, not per session)
- No changes to the scoring _dimensions_ (PMF, Validation, Growth, Mindset, Revenue stay fixed)
- No frontend UI component changes — only copy/prompt/weight data

---

## Architecture

### 1. Data Layer

#### New table: `journey_config`

Versioned snapshots of all runtime-configurable content.

```sql
CREATE TABLE journey_config (
  id             SERIAL PRIMARY KEY,
  version        INT NOT NULL,
  status         VARCHAR(20) NOT NULL DEFAULT 'proposed',
  -- status: 'proposed' | 'active' | 'archived' | 'dismissed'
  system_prompt  TEXT NOT NULL,
  intro_messages JSONB NOT NULL,        -- string[]
  scoring_weights JSONB NOT NULL,       -- {pmf, validation, growth, mindset, revenue} summing to 100
  change_summary TEXT NOT NULL,         -- human-readable 1-2 sentence summary
  risk_level     VARCHAR(10) NOT NULL,  -- 'low' | 'high'
  reasoning      TEXT NOT NULL,         -- agent's full analytical rationale
  metrics_snapshot JSONB,              -- {completion_rate, avg_answer_words, score_mean, score_std} at creation time
  activated_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON journey_config (status);
CREATE INDEX ON journey_config (version DESC);
```

**Constraints enforced on write:**
- `intro_messages` must be a JSON array of strings, length 1–10
- `scoring_weights` values must be integers summing to exactly 100
- Only one row may have `status = 'active'` at any time (enforced in application layer)

#### New table: `session_analytics`

Derived signals per session, computed server-side from existing data. No frontend instrumentation required.

```sql
CREATE TABLE session_analytics (
  id                    SERIAL PRIMARY KEY,
  session_id            UUID NOT NULL REFERENCES sessions(id),
  assessment_id         INT REFERENCES assessments(id),
  completed             BOOLEAN NOT NULL DEFAULT FALSE,
  question_count        INT NOT NULL DEFAULT 0,
  avg_answer_words      FLOAT,
  min_answer_words      INT,
  max_answer_words      INT,
  drop_off_at_question  INT,           -- question index of last answer before abandonment
  score                 INT,           -- null if not completed
  score_breakdown       JSONB,
  journey_config_version INT,          -- which config version was active during this session
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON session_analytics (completed);
CREATE INDEX ON session_analytics (created_at DESC);
CREATE INDEX ON session_analytics (journey_config_version);
```

**Population strategy:**
- Backfill on migration: compute analytics for all existing sessions/assessments
- Incremental: computed and inserted at `POST /api/sessions/:id/complete` (after assessment created)
- Abandoned sessions: a nightly cleanup job identifies `sessions` with `status = 'active'` older than 24h and computes/inserts their analytics row as `completed = false`

---

### 2. Shared Config Service

**File:** `server/src/services/journeyConfig.ts`

Single source of truth for the active config. Used by questioning, scoring, and the intro endpoint.

```typescript
interface JourneyConfig {
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

// In-memory cache, 60-second TTL
export async function getActiveConfig(): Promise<JourneyConfig>
export async function invalidateConfigCache(): Promise<void>
```

**Cache behaviour:** On first call, queries `WHERE status = 'active' ORDER BY version DESC LIMIT 1`. Caches result for 60 seconds. On activation of a new config, cache is explicitly invalidated. If no active config exists (fresh install), returns hardcoded defaults identical to current codebase values — ensuring zero regression on deploy.

---

### 3. Runtime Integration

#### `questioning.ts`
- Replace hardcoded system prompt string with `(await getActiveConfig()).system_prompt`
- Called once per `generateNextQuestion()` invocation; 60s cache means negligible DB overhead

#### `scoring.ts`
- Replace hardcoded per-dimension caps (currently implicit 0-20 each) with `config.scoring_weights`
- Inject weights into scoring prompt: `"Score PMF out of {pmf}, Validation out of {validation}..."`
- Validate Claude's output: if breakdown values exceed their configured caps, clamp and log a warning

#### Frontend intro (`CosmicJourney/index.tsx`)
- New public endpoint `GET /api/journey/intro` returns `{ messages: string[] }`
- Component fetches on mount with `Promise.race([fetch(...), timeout(5000)])`
- On timeout or error: silently falls back to hardcoded `MSGS` constant
- No visible loading state — fallback is instant

---

### 4. Optimizer Agent

**File:** `server/src/services/journeyOptimizer.ts`

**Trigger:** `POST /api/journey/optimize` (admin-auth required). Called by Railway cron weekly, or manually from dashboard.

**Minimum data gate:** Requires ≥10 completed sessions since the last optimizer run. If fewer exist, responds `{ skipped: true, reason: "Insufficient data" }` and does nothing.

**Step 1 — Compute metrics from `session_analytics`:**
```
completion_rate       = completed / total sessions in window
avg_answer_words      = mean of avg_answer_words across completed sessions
score_mean            = mean score
score_std             = standard deviation of scores
drop_off_map          = { [question_index]: count } — sorted by abandonment frequency
shallow_questions     = question indices where avg_answer_words < 20
```

**Step 2 — Load current active config**

Fetch via `getActiveConfig()`.

**Step 3 — Call Claude (claude-opus-4-6)**

Uses Opus, not Haiku — this is a high-stakes strategic call, not a real-time interaction.

System prompt positions Claude as:
> "You are a senior conversion strategist, behavioural psychologist, and Ogilvy-trained copywriter specialising in founder qualification funnels. You have access to session analytics and the current assessment configuration. Your job is to diagnose underperformance and produce a strictly improved configuration."

User message provides:
- Current config (system prompt, intro messages, scoring weights)
- Computed metrics with plain-English interpretation
- Drop-off map and shallow question indices
- Explicit instructions: output valid JSON only, matching the schema below
- Constraint: `scoring_weights` must sum to 100; do not add or remove scoring dimensions

**Output schema Claude must return:**
```json
{
  "system_prompt": "...",
  "intro_messages": ["...", "..."],
  "scoring_weights": { "pmf": 20, "validation": 20, "growth": 20, "mindset": 20, "revenue": 20 },
  "change_summary": "One to two sentences describing what changed and the key insight driving it.",
  "risk_level": "low",
  "reasoning": "Full analytical rationale — what the data showed, what was changed, why."
}
```

**Risk level rules (Claude determines, server validates):**
- `low`: Only wording/phrasing changes. No structural reordering. Scoring weights unchanged or shifted by ≤5 points each. Intro message count unchanged.
- `high`: Any structural change — question topic reordering, intro message count change, scoring weight shift >5 points on any dimension, or new framing approach.

**Step 4 — Validate output:**
- Parse JSON (retry once with error feedback if malformed)
- Assert `scoring_weights` sums to 100; if not, normalise proportionally and log
- Assert `intro_messages` is a non-empty string array

**Step 5 — Apply hybrid approval:**
- `risk_level: "low"` → insert as `active`, archive previous active, call `invalidateConfigCache()`
- `risk_level: "high"` → insert as `proposed`, send email notification to `FOUNDER_EMAIL` with change_summary and dashboard link

---

### 5. Admin API Routes

All routes added to a new file `server/src/routes/journey.ts`, registered as `/api/journey/*`, all protected by `requireAuth`.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/journey/optimize` | Trigger optimizer agent |
| `GET` | `/api/journey/config` | List all config versions (id, version, status, change_summary, risk_level, created_at) |
| `GET` | `/api/journey/config/:id` | Full config detail including reasoning |
| `POST` | `/api/journey/config/:id/activate` | Approve a proposed config; archives current active |
| `POST` | `/api/journey/config/:id/dismiss` | Reject a proposed config |
| `GET` | `/api/journey/metrics` | Returns completion_rate, avg_answer_words, score distribution for last 30/60/90 days |

Public route (no auth):
| `GET` | `/api/journey/intro` | Returns `{ messages: string[] }` for frontend |

---

### 6. Dashboard — Intelligence Tab

New tab in the existing Dashboard component alongside Pipeline/Submissions.

**Metrics strip (top):**
- Completion rate % with 30-day trend arrow
- Avg answer depth (words) with trend
- Score distribution: small bar chart (bucketed 0-20, 20-40, 40-60, 60-80, 80-100)
- Config version currently active + activated date

**Pending approval card** (only visible when a `proposed` config exists):
- Agent's `change_summary` in large text
- Expandable `reasoning` section
- Side-by-side diff for intro_messages and scoring_weights (old vs new)
- Full system prompt diff in a scrollable code block
- **Activate** button (coral) / **Dismiss** button (ghost)

**Version history table:**
- All past versions: version number, status badge, change_summary, metrics_snapshot at creation, activated_at
- Clicking a row shows full detail

---

### 7. Railway Cron Configuration

Add to `server/railway.json` (or Railway dashboard cron service):

```json
{
  "crons": [
    {
      "schedule": "0 3 * * 0",
      "command": "node server/dist/src/scripts/runOptimizer.js"
    }
  ]
}
```

`runOptimizer.js` is a thin script that calls `POST /api/journey/optimize` internally (or directly invokes the service function) and exits.

Alternatively: use the Railway dashboard to configure a cron service pointing at the same Docker image with a different start command.

---

## Error Handling

| Failure | Behaviour |
|---------|-----------|
| Claude API timeout/error in optimizer | Log error, do not write any config, send failure email to `FOUNDER_EMAIL` |
| Claude returns malformed JSON | Retry once with error context; if still bad, abort run |
| `scoring_weights` don't sum to 100 | Normalise proportionally, log warning, proceed |
| No active config in DB | `getActiveConfig()` returns hardcoded defaults; system continues normally |
| `/api/journey/intro` timeout | Frontend falls back to hardcoded `MSGS` silently |
| Two simultaneous optimizer runs | Second run exits immediately if a run completed within the last hour (check `journey_config.created_at`) |

---

## Migration Plan

1. Run `schema.sql` additions for `journey_config` and `session_analytics`
2. Seed `journey_config` with version 1, status `active`, using exact current hardcoded values from `questioning.ts`, `CosmicJourney/index.tsx`, and `scoring.ts`
3. Backfill `session_analytics` from existing sessions/assessments
4. Deploy server (questioning, scoring now read from DB — but config version 1 is identical to current hardcoded values, so no behaviour change)
5. Deploy client (CosmicJourney now fetches intro from API, falls back to hardcoded if slow)
6. Verify in staging, then trigger first optimizer run manually

---

## File Map

| File | Action |
|------|--------|
| `server/src/db/schema.sql` | Add `journey_config` and `session_analytics` tables |
| `server/src/services/journeyConfig.ts` | New — shared config cache utility |
| `server/src/services/journeyOptimizer.ts` | New — optimizer agent |
| `server/src/routes/journey.ts` | New — admin + public journey routes |
| `server/src/index.ts` | Register `/api/journey` router |
| `server/src/services/questioning.ts` | Swap hardcoded prompt for `getActiveConfig()` |
| `server/src/services/scoring.ts` | Swap hardcoded weights for `getActiveConfig()` |
| `server/src/sessions.ts` | Insert `session_analytics` row on complete |
| `client/src/components/CosmicJourney/index.tsx` | Fetch intro messages from `/api/journey/intro` |
| `client/src/components/Dashboard/index.tsx` | Add Intelligence tab |
| `client/src/components/Dashboard/Intelligence.tsx` | New — metrics, pending approval, history |
