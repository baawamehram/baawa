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
  id              SERIAL PRIMARY KEY,
  version         INT NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'proposed',
  -- status: 'proposed' | 'active' | 'archived' | 'dismissed'
  system_prompt   TEXT NOT NULL,
  intro_messages  JSONB NOT NULL,         -- string[] in accumulation format (see note below)
  scoring_weights JSONB NOT NULL,         -- {pmf, validation, growth, mindset, revenue} integers summing to 100
  change_summary  TEXT NOT NULL,          -- human-readable 1-2 sentence summary
  risk_level      VARCHAR(10) NOT NULL,   -- 'low' | 'high'
  reasoning       TEXT NOT NULL,          -- agent's full analytical rationale
  metrics_snapshot JSONB,
  -- Snapshot of the computed signals at the time this config version was proposed/created.
  -- Shape: { completion_rate: float, avg_answer_words: float, score_mean: float, score_std: float, session_count: int }
  -- Time window: all sessions under the previous active config version (not a date window).
  -- Populated by the optimizer in Step 1 before calling Claude.
  -- For the v1 seed row: set to null (no prior data exists).
  activated_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON journey_config (status);
CREATE INDEX ON journey_config (version DESC);

-- Enforces at DB level: only one row can have status = 'active' at any time.
-- Prevents race conditions when cron and manual dashboard activate simultaneously.
CREATE UNIQUE INDEX journey_config_one_active ON journey_config ((1)) WHERE status = 'active';
```

**`intro_messages` format — accumulation pattern:**
The typewriter component builds up text progressively: each array element is the *full text so far*, not a discrete new sentence. Example:
```json
[
  "Hello.",
  "Hello.\n\nSpeak your answers out loud — I would prefer that.",
  "Hello.\n\nSpeak your answers out loud — I would prefer that.\n\nSpeak from the heart.",
  ...
]
```
Claude must return `intro_messages` in this same accumulation format. The component uses `MSGS[i]` as the target text for typewriter step `i` — each step types the *delta* from the previous step. The implementation team must not change the component's render logic; only the data values change.

**Constraints enforced on write (application layer):**
- `intro_messages` must be a JSON array of strings, minimum length 2, maximum 10
- Each element must be longer than or equal to the previous (accumulation invariant)
- `scoring_weights` values must all be positive integers summing to exactly 100 (see weight normalisation below)
- Only one row may have `status = 'active'` at any time (enforced by DB partial unique index above)

#### New table: `session_analytics`

Derived signals per session, computed server-side from existing data. No frontend instrumentation required.

```sql
CREATE TABLE session_analytics (
  id                      SERIAL PRIMARY KEY,
  session_id              UUID NOT NULL REFERENCES sessions(id),
  assessment_id           INT REFERENCES assessments(id),    -- NULL for abandoned sessions
  completed               BOOLEAN NOT NULL DEFAULT FALSE,
  question_count          INT NOT NULL DEFAULT 0,
  avg_answer_words        FLOAT,
  min_answer_words        INT,
  max_answer_words        INT,
  drop_off_at_question    INT,          -- question index of last answer before abandonment (NULL if completed)
  score                   INT,          -- NULL if not completed
  score_breakdown         JSONB,        -- NULL if not completed
  journey_config_version  INT,          -- version active at session START (stamped at POST /sessions/start)
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX session_analytics_session_id ON session_analytics (session_id);
CREATE INDEX ON session_analytics (completed);
CREATE INDEX ON session_analytics (created_at DESC);
CREATE INDEX ON session_analytics (journey_config_version);
```

**`journey_config_version` stamping:**
The active config version must be written to `sessions` at `POST /api/sessions/start` — before the first question is generated. Add a `journey_config_version INT` column to the `sessions` table. When `session_analytics` is computed at completion or abandonment, it reads the version from `sessions.journey_config_version`. This is the only reliable way to know which config was in effect; looking up the active config at completion time would return the wrong version if a config was activated mid-session.

**Population strategy:**
- **Backfill on migration:** Implemented in `server/src/scripts/backfillAnalytics.ts` (see File Map). Handle two cases separately:
  - Sessions with a linked assessment (found via `assessments.session_id`): join for score/breakdown; `completed = true`
  - Sessions with no linked assessment: `completed = false`, `score = null`, `assessment_id = null`
  - Set `journey_config_version = 1` for all backfilled rows (they pre-date the versioning system)
  - Skip sessions that already have a `session_analytics` row (idempotent — safe to re-run)
- **Incremental:** Computed and inserted at `POST /api/sessions/:id/complete` immediately after the assessment record is created. **This insert is non-blocking and non-critical** — wrap in `try/catch`, log any error, but do not fail or roll back the assessment creation. The assessment is the source of truth; analytics is derived and can be recomputed.
- **Abandoned sessions:** A nightly job (cron `0 2 * * *` — see Railway Cron Configuration) identifies `sessions` with `status = 'active'` and `created_at < NOW() - INTERVAL '24 hours'` that have no `session_analytics` row, and inserts an analytics row with `completed = false`. Insert uses `ON CONFLICT (session_id) DO NOTHING` so the job is safe to re-run.

---

### 2. Shared Config Service

**File:** `server/src/services/journeyConfig.ts`

Single source of truth for the active config. Used by questioning, scoring, the intro endpoint, and the optimizer.

```typescript
interface JourneyConfig {
  id: number
  version: number
  system_prompt: string
  intro_messages: string[]       // accumulation format — see Data Layer note
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

**Cache behaviour:** On first call, queries `WHERE status = 'active' ORDER BY version DESC LIMIT 1`. Caches result for 60 seconds. On activation of a new config, cache is explicitly invalidated so the next request picks up the new values immediately. If no active config exists (fresh install before migration seed), returns hardcoded defaults identical to current codebase values — ensuring zero regression on deploy.

**`getActiveConfig()` also returns the version number.** The sessions route uses this at session start to stamp `sessions.journey_config_version`.

---

### 3. Runtime Integration

#### `questioning.ts`
- Add `journey_config_version INT` column to `sessions` table
- At `POST /api/sessions/start`: call `getActiveConfig()`, stamp `sessions.journey_config_version = config.version`, use `config.system_prompt` for the Claude system prompt
- All subsequent question exchanges within the session reuse the version already stored on the session row — no re-fetch needed

#### `scoring.ts`
- Replace hardcoded per-dimension caps with `config.scoring_weights`
- Inject weights into scoring prompt: `"Score PMF out of {weights.pmf}, Validation out of {weights.validation}..."`
- **Remove the existing `val > 20` validator.** Replace it with: `if (breakdown[key] > config.scoring_weights[key]) { clamp to cap; log warning }`. The old hard limit of 20 will incorrectly reject valid scores once weights change

#### Frontend intro (`CosmicJourney/index.tsx`)
- New public endpoint `GET /api/journey/intro` returns `{ messages: string[] }` — the active `intro_messages` array in accumulation format
- Component fetches on mount: `Promise.race([fetch('/api/journey/intro'), new Promise(r => setTimeout(r, 5000))])`
- On timeout or any error: silently falls back to the hardcoded `MSGS` constant — no visible loading state, no user-facing impact
- The component's typewriter render logic is **unchanged** — it still indexes `MSGS[i]` as the target text; the fetched array just replaces the hardcoded one
- **`MSGS` constant source of truth:** Extract the current hardcoded `MSGS` array from `CosmicJourney/index.tsx` into a shared seed file at `server/src/db/seeds/journeyConfigV1.ts`. This file exports both `MSGS` (imported by the frontend) and the full v1 `journey_config` seed object (used by the migration). This ensures the frontend fallback and the v1 DB seed are always identical — updated in one place only.

---

### 4. Optimizer Agent

**File:** `server/src/services/journeyOptimizer.ts`

**Trigger:** `POST /api/journey/optimize` (admin-auth required). Called by Railway cron weekly, or manually from dashboard.

**Concurrent-run guard:**
Before proceeding, acquire a DB-level advisory lock using the named constant `OPTIMIZER_LOCK_ID = 7_387_261` (documented in `server/src/services/journeyOptimizer.ts` at the top of the file — reserve this ID for the optimizer only; all other services must use different IDs). Call `SELECT pg_try_advisory_lock(7387261)`. If lock not acquired (another run is in progress), respond `{ skipped: true, reason: "Run already in progress" }` and return immediately. Release lock at end of run (success or failure) in a `finally` block via `pg_advisory_unlock(7387261)`. This is atomic and cannot be race-conditioned.

**Minimum data gate:**
Requires ≥10 completed sessions where `journey_config_version = current_active_version`. Counting all sessions regardless of version would include data from a previous config, producing misleading signals about the current config's performance. If fewer than 10 exist, respond `{ skipped: true, reason: "Insufficient data for current config version" }` and do nothing.

**Step 1 — Compute metrics from `session_analytics`** (filtered to `journey_config_version = current_active_version`):
```
completion_rate       = completed sessions / (completed + abandoned sessions) in window (sessions with no analytics row are excluded from both numerator and denominator)
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

System prompt:
> "You are a senior conversion strategist, behavioural psychologist, and Ogilvy-trained copywriter specialising in founder qualification funnels. You have access to session analytics and the current assessment configuration. Your job is to diagnose underperformance and produce a strictly improved configuration."

User message includes:
- Current config (system prompt, intro messages in accumulation format, scoring weights)
- Computed metrics with plain-English interpretation of each signal
- Drop-off map and shallow question indices
- Explicit instructions: output valid JSON only, matching the schema below
- Constraints explicitly stated in the prompt:
  - `scoring_weights` must be positive integers summing to exactly 100 — verify your own output sums to 100 before returning it
  - `intro_messages` must be in accumulation format (each element is the full text up to that point, so each element must be longer than the one before it)
  - Do not add or remove scoring dimensions
  - Do not change the number of intro messages by more than ±1

**Output schema Claude must return:**
```json
{
  "system_prompt": "...",
  "intro_messages": [
    "Hello.",
    "Hello.\n\nSpeak your answers...",
    "..."
  ],
  "scoring_weights": { "pmf": 20, "validation": 20, "growth": 20, "mindset": 20, "revenue": 20 },
  "change_summary": "One to two sentences describing what changed and the key insight driving it.",
  "risk_level": "low",
  "reasoning": "Full analytical rationale."
}
```

**Risk level rules (Claude determines, server validates):**
- `low`: Only wording/phrasing changes. No structural reordering. Scoring weights unchanged or shifted by ≤5 absolute points each (e.g., 20→24 is low-risk; 20→26 is high-risk). Intro message count unchanged.
- `high`: Any structural change — question topic reordering, intro message count change, any scoring weight shifted by more than 5 absolute points, or fundamental reframing of approach.

**Step 4 — Validate and normalise output:**
- Parse JSON (retry once with error feedback if malformed; if still bad, abort run)
- Assert `intro_messages` is a non-empty string array with accumulation invariant: each element's **character count** (not byte length — use `str.length` in JS which counts UTF-16 code units) must be strictly greater than the previous element's character count
- Assert `scoring_weights` has exactly the five required keys
- If `scoring_weights` do not sum to 100: normalise using integer rounding — round each value proportionally, then add/subtract the remainder (±1) from the highest-weighted dimension to ensure the sum is exactly 100. Tie-breaking rule: if multiple dimensions share the highest weight, apply the remainder to the first one in key order (`pmf` → `validation` → `growth` → `mindset` → `revenue`). Log a warning. Never produce float weights.
- Server re-validates `risk_level` independently: if any weight shifted by more than 5 absolute points from the current active config, override to `high` regardless of what Claude returned

**Step 5 — Apply hybrid approval:**
- `risk_level: "low"` → within a **single DB transaction**: (1) `UPDATE journey_config SET status='archived' WHERE status='active'`, then (2) `INSERT INTO journey_config (...) VALUES (..., 'active', ...)`. The partial unique index enforces that only one active row exists; the transaction ensures no window exists where zero or two active rows are visible. After commit: call `invalidateConfigCache()`.
- `risk_level: "high"` → insert as `proposed` (no transaction needed — no status change to existing rows). Send email notification to `FOUNDER_EMAIL` with change_summary and dashboard link.

---

### 5. Admin API Routes

**File:** `server/src/routes/journey.ts`

**Important:** Do NOT apply `requireAuth` at the router level. Apply it per-route on every route except `GET /intro`. This ensures the public intro endpoint returns config data without a 401.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/journey/intro` | **None** | Returns `{ messages: string[] }` for frontend |
| `POST` | `/api/journey/optimize` | Required | Trigger optimizer agent |
| `GET` | `/api/journey/config` | Required | List all config versions |
| `GET` | `/api/journey/config/:id` | Required | Full config detail including reasoning |
| `POST` | `/api/journey/config/:id/activate` | Required | Approve a proposed config; archives current active |
| `POST` | `/api/journey/config/:id/dismiss` | Required | Reject a proposed config |
| `GET` | `/api/journey/metrics` | Required | Completion rate, answer depth, score distribution (30/60/90 day windows) |

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
- Side-by-side diff for `intro_messages` and `scoring_weights` (old vs new)
- Full system prompt diff in a scrollable code block
- **Activate** button (coral) / **Dismiss** button (ghost)

**Version history table:**
- All past versions: version number, status badge, change_summary, metrics_snapshot at creation, activated_at
- Clicking a row shows full detail

---

### 7. Railway Cron Configuration

```json
{
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

The weekly optimizer runs at 03:00 UTC every Sunday. The nightly abandoned-session backfill runs at 02:00 UTC every day — it is idempotent (ON CONFLICT DO NOTHING) so running it nightly is safe and keeps analytics current.

`runOptimizer.js` is a thin script that directly invokes the optimizer service function (not an HTTP call) and exits with code 0 on success, 1 on failure.

---

## Error Handling

| Failure | Behaviour |
|---------|-----------|
| Claude API timeout/error in optimizer | Release advisory lock, log error, do not write any config, send failure email to `FOUNDER_EMAIL` |
| Claude returns malformed JSON | Retry once with error context appended to message; if still bad, release lock and abort |
| `scoring_weights` don't sum to 100 | Normalise to integers summing to 100 (see Step 4), log warning, proceed |
| No active config in DB | `getActiveConfig()` returns hardcoded defaults; system continues normally |
| `/api/journey/intro` timeout or error | Frontend falls back to hardcoded `MSGS` silently; no user impact |
| Two simultaneous optimizer runs | Second run cannot acquire advisory lock; exits immediately with `skipped: true` |
| `activate` race condition | DB partial unique index on `status = 'active'` causes second write to fail with constraint error; caught and returned as 409 Conflict |

---

## Environment Variables

The following env var must be present (already exists in `.env.example` for email notifications):

```
FOUNDER_EMAIL=you@yourdomain.com   # Receives high-risk config proposals + optimizer failure alerts
```

This is already defined in `.env.example`. Confirm it is set in the Railway dashboard before deploying.

---

## Migration Plan

1. Add `journey_config_version INT` column to `sessions` table
2. Run `schema.sql` additions: `journey_config` table + partial unique index, `session_analytics` table
3. Seed `journey_config` with version 1, status `active`, using exact current hardcoded values from `questioning.ts`, `CosmicJourney/index.tsx` (MSGS array in accumulation format), and `scoring.ts` (all weights = 20)
4. Backfill `session_analytics` from all existing sessions/assessments — handle completed and abandoned rows separately; set `journey_config_version = 1` for all
5. Deploy server (questioning and scoring now read from DB — config v1 is identical to hardcoded values, zero behaviour change)
6. Deploy client (CosmicJourney fetches intro from API; falls back to hardcoded if unavailable)
7. Verify both services use config from DB in staging
8. Trigger first optimizer run manually; confirm `{ skipped: true }` if <10 sessions exist under v1

---

## File Map

| File | Action |
|------|--------|
| `server/src/db/schema.sql` | Add `journey_config`, `session_analytics` tables; add `journey_config_version` to `sessions` |
| `server/src/services/journeyConfig.ts` | New — shared config cache utility |
| `server/src/services/journeyOptimizer.ts` | New — optimizer agent |
| `server/src/routes/journey.ts` | New — per-route auth, admin + public endpoints |
| `server/src/index.ts` | Register `/api/journey` router |
| `server/src/services/questioning.ts` | Swap hardcoded prompt for `getActiveConfig()`; stamp `journey_config_version` at session start |
| `server/src/services/scoring.ts` | Swap hardcoded weight caps for `config.scoring_weights`; remove old `> 20` validators |
| `server/src/routes/sessions.ts` | Insert `session_analytics` row on complete; stamp version at start |
| `server/src/scripts/runOptimizer.ts` | New — cron entry point |
| `server/src/scripts/backfillAnalytics.ts` | New — one-time backfill of session_analytics from existing sessions/assessments; idempotent |
| `server/src/db/seeds/journeyConfigV1.ts` | New — single source of truth for v1 config values; exported to both migration seed and frontend MSGS fallback |
| `client/src/components/CosmicJourney/index.tsx` | Fetch intro messages from `/api/journey/intro` with 5s timeout fallback |
| `client/src/components/Dashboard/index.tsx` | Add Intelligence tab |
| `client/src/components/Dashboard/Intelligence.tsx` | New — metrics strip, pending approval card, version history |
