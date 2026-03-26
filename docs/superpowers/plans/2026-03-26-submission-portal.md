# Submission Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a user-facing portal at `/portal/*` where assessment takers can log in via magic link and view their score, feedback, and exchange messages with the Baawa team.

**Architecture:** Magic-link auth via Resend → one-time token in `portal_tokens` DB table → 7-day JWT stored as `httpOnly; SameSite=None; Secure` cookie. Frontend is a React SPA on Vercel; backend is Express on Railway (cross-origin), so all portal API calls use `credentials: 'include'`. Results are staged: conversation always visible, score/feedback locked until admin clicks "Unlock results".

**Tech Stack:** Express + TypeScript + PostgreSQL (backend), React + framer-motion + react-router-dom v6 (frontend), Resend (email), `jsonwebtoken` + `cookie-parser` (new server deps), Vitest (server tests).

---

## File Map

### New files
| File | Purpose |
|---|---|
| `server/src/middleware/portalAuth.ts` | `requirePortalAuth` middleware — reads `portal_token` cookie, validates JWT, attaches `{ assessmentId, email }` to `req` |
| `server/src/middleware/portalAuth.test.ts` | Vitest unit tests for portalAuth middleware |
| `server/src/routes/portal.ts` | All `/api/portal/*` routes (login, verify, me, messages) |
| `server/src/routes/portal.test.ts` | Vitest unit tests for portal routes |
| `client/src/lib/portalApi.ts` | `portalFetch` helper — wraps `fetch` with `credentials: 'include'`, handles 401 redirect |
| `client/src/components/Portal/Login.tsx` | `/portal/login` page — email form, magic link send |
| `client/src/components/Portal/Verify.tsx` | `/portal/verify` page — handles magic link click, spins, sets cookie, redirects |
| `client/src/components/Portal/Results.tsx` | `/portal/results` page — main dashboard |
| `client/src/components/Portal/MessagesPanel.tsx` | Messages thread sub-component used inside Results |
| `client/src/components/Portal/usePortalTheme.ts` | Hook — returns `{ theme, toggleTheme }`, persists to localStorage |

### Modified files
| File | Change |
|---|---|
| `server/src/index.ts` | Add `cookie-parser` middleware; add DB migrations for `portal_tokens`, `portal_messages`, `results_unlocked` column; register `/api/portal` router |
| `server/src/services/email.ts` | Add `sendMagicLink(to, link)` and `sendMessageNotification(to, loginUrl)` |
| `server/src/routes/assessments.ts` | Add `POST /:id/unlock-results` and `POST /:id/message` endpoints |
| `client/src/App.tsx` | Add `/portal`, `/portal/login`, `/portal/verify`, `/portal/results` routes |

---

## Environment Variables Required

Add to Railway (backend):
- `PORTAL_JWT_SECRET` — random secret string, used to sign portal JWTs. Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `FRONTEND_URL` — the Vercel frontend URL, e.g. `https://www.baawa.co` (used to construct magic link)

---

## Task 1: Install server dependencies

**Files:**
- Modify: `server/package.json` (via npm install)

- [ ] **Step 1: Install dependencies**

```bash
cd server
npm install jsonwebtoken cookie-parser
npm install -D @types/jsonwebtoken @types/cookie-parser
```

- [ ] **Step 2: Verify build still compiles**

```bash
npm run build
```
Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
cd server
git add package.json package-lock.json
git commit -m "chore: add jsonwebtoken and cookie-parser dependencies"
```

---

## Task 2: DB migrations + server wiring

**Files:**
- Modify: `server/src/index.ts`

The `startServer()` function in `index.ts` already runs idempotent migrations at startup. Add to it, and wire up `cookie-parser` and the portal router.

- [ ] **Step 1: Add cookie-parser and portal router imports**

In `server/src/index.ts`, add at the top with the other imports:
```typescript
import cookieParser from 'cookie-parser'
import portalRouter from './routes/portal'
```

- [ ] **Step 2: Register cookie-parser middleware**

After `app.use(express.json())` (around line 40), add:
```typescript
app.use(cookieParser())
```

- [ ] **Step 3: Register portal router**

After `app.use('/api/journey', journeyRouter)`, add:
```typescript
app.use('/api/portal', portalRouter)
```

- [ ] **Step 4: Add DB migrations in startServer()**

Inside the `try` block of `startServer()`, after the existing migrations, add:
```typescript
await db.query(`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS results_unlocked BOOLEAN NOT NULL DEFAULT false`)

await db.query(`
  CREATE TABLE IF NOT EXISTS portal_tokens (
    id            SERIAL PRIMARY KEY,
    assessment_id INT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    token         VARCHAR(64) UNIQUE NOT NULL,
    expires_at    TIMESTAMPTZ NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`)
await db.query(`CREATE INDEX IF NOT EXISTS idx_portal_tokens_token ON portal_tokens (token)`)
await db.query(`CREATE INDEX IF NOT EXISTS idx_portal_tokens_expires ON portal_tokens (expires_at)`)
await db.query(`CREATE INDEX IF NOT EXISTS idx_portal_tokens_assessment ON portal_tokens (assessment_id)`)

await db.query(`
  CREATE TABLE IF NOT EXISTS portal_messages (
    id            SERIAL PRIMARY KEY,
    assessment_id INT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    sender        VARCHAR(20) NOT NULL CHECK (sender IN ('team', 'prospect')),
    body          TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`)
await db.query(`CREATE INDEX IF NOT EXISTS idx_portal_messages_assessment ON portal_messages (assessment_id, created_at)`)
```

- [ ] **Step 5: Create empty portal router so build passes**

Create `server/src/routes/portal.ts` with just the router stub (full implementation in Task 4):
```typescript
import { Router } from 'express'
const router = Router()
export default router
```

- [ ] **Step 6: Verify build**

```bash
cd server && npm run build
```
Expected: compiles with no errors.

- [ ] **Step 7: Commit**

```bash
git add server/src/index.ts server/src/routes/portal.ts
git commit -m "feat(portal): wire cookie-parser, migrations, router stub"
```

---

## Task 3: Email service additions

**Files:**
- Modify: `server/src/services/email.ts`

- [ ] **Step 1: Add `sendMagicLink` function**

Append to `server/src/services/email.ts`:
```typescript
// 7. Magic link for portal login
export async function sendMagicLink(to: string, magicLink: string): Promise<void> {
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: 'Your Baawa portal link',
      html: `<p>Click the link below to access your assessment results. This link expires in 15 minutes.</p>
<p><a href="${magicLink}">Access my results →</a></p>
<p style="color:#888;font-size:12px">If you didn't request this, you can ignore this email.</p>`,
    })
  } catch (err) {
    throw new Error(`Failed to send magic link to ${to}: ${String(err)}`)
  }
}
```

- [ ] **Step 2: Add `sendMessageNotification` function**

Append to `server/src/services/email.ts`:
```typescript
// 8. Notify prospect that the Baawa team has sent them a portal message
export async function sendMessageNotification(to: string, loginUrl: string): Promise<void> {
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: 'You have a message from the Baawa team',
      html: `<p>The Baawa team has left you a message regarding your assessment.</p>
<p><a href="${loginUrl}">Log in to read it and reply →</a></p>`,
    })
  } catch (err) {
    // Non-critical — log but don't propagate
    console.error(`sendMessageNotification failed for ${to}:`, err)
  }
}
```

- [ ] **Step 3: Build to verify**

```bash
cd server && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add server/src/services/email.ts
git commit -m "feat(portal): add sendMagicLink and sendMessageNotification emails"
```

---

## Task 4: Portal auth middleware

**Files:**
- Create: `server/src/middleware/portalAuth.ts`
- Create: `server/src/middleware/portalAuth.test.ts`

The middleware reads the `portal_token` httpOnly cookie, verifies the JWT, and attaches `req.portalUser = { assessmentId, email }` for downstream handlers. It also cross-checks that the email in the JWT matches the assessment in the DB.

We need to extend Express's `Request` type. Add this at the top of `portalAuth.ts`:
```typescript
declare global {
  namespace Express {
    interface Request {
      portalUser?: { assessmentId: number; email: string }
    }
  }
}
```

- [ ] **Step 1: Write failing tests**

Create `server/src/middleware/portalAuth.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'

vi.mock('../db/client', () => ({ db: { query: vi.fn() } }))
vi.mock('jsonwebtoken')

import jwt from 'jsonwebtoken'
import { db } from '../db/client'
import { requirePortalAuth } from './portalAuth'

const mockDb = vi.mocked(db)
const mockJwt = vi.mocked(jwt)

function makeReq(cookie?: string): Partial<Request> {
  return { cookies: cookie ? { portal_token: cookie } : {} } as Partial<Request>
}
function makeRes(): { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> } {
  const json = vi.fn()
  const status = vi.fn().mockReturnValue({ json })
  return { status, json }
}

beforeEach(() => { vi.clearAllMocks() })

describe('requirePortalAuth', () => {
  it('returns 401 if no cookie present', async () => {
    const req = makeReq()
    const res = makeRes()
    const next = vi.fn()
    await requirePortalAuth(req as Request, res as unknown as Response, next as NextFunction)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 if JWT is invalid', async () => {
    mockJwt.verify = vi.fn().mockImplementation(() => { throw new Error('bad token') })
    const req = makeReq('bad.token.here')
    const res = makeRes()
    const next = vi.fn()
    await requirePortalAuth(req as Request, res as unknown as Response, next as NextFunction)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 if assessment email does not match JWT email', async () => {
    mockJwt.verify = vi.fn().mockReturnValue({ assessmentId: 1, email: 'a@test.com' })
    mockDb.query.mockResolvedValueOnce({ rows: [{ email: 'different@test.com' }] } as any)
    const req = makeReq('valid.token.here')
    const res = makeRes()
    const next = vi.fn()
    await requirePortalAuth(req as Request, res as unknown as Response, next as NextFunction)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('calls next and sets req.portalUser when token is valid', async () => {
    mockJwt.verify = vi.fn().mockReturnValue({ assessmentId: 1, email: 'a@test.com' })
    mockDb.query.mockResolvedValueOnce({ rows: [{ email: 'a@test.com' }] } as any)
    const req = makeReq('valid.token.here') as Request
    const res = makeRes()
    const next = vi.fn()
    await requirePortalAuth(req, res as unknown as Response, next as NextFunction)
    expect(next).toHaveBeenCalled()
    expect(req.portalUser).toEqual({ assessmentId: 1, email: 'a@test.com' })
  })
})
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd server && npx vitest run src/middleware/portalAuth.test.ts
```
Expected: FAIL — `portalAuth.ts` doesn't exist yet.

- [ ] **Step 3: Implement `requirePortalAuth`**

Create `server/src/middleware/portalAuth.ts`:
```typescript
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { db } from '../db/client'

declare global {
  namespace Express {
    interface Request {
      portalUser?: { assessmentId: number; email: string }
    }
  }
}

export async function requirePortalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.portal_token as string | undefined
  if (!token) {
    res.status(401).json({ error: 'Not authenticated' })
    return
  }

  let payload: { assessmentId: number; email: string }
  try {
    payload = jwt.verify(token, process.env.PORTAL_JWT_SECRET ?? 'dev-secret') as typeof payload
  } catch {
    res.status(401).json({ error: 'Invalid or expired session' })
    return
  }

  // Cross-check email binding against DB
  const result = await db.query<{ email: string }>(
    'SELECT email FROM assessments WHERE id = $1',
    [payload.assessmentId]
  )
  if (!result.rows[0] || result.rows[0].email !== payload.email) {
    res.status(401).json({ error: 'Invalid session' })
    return
  }

  req.portalUser = { assessmentId: payload.assessmentId, email: payload.email }
  next()
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd server && npx vitest run src/middleware/portalAuth.test.ts
```
Expected: 4 passing.

- [ ] **Step 5: Commit**

```bash
git add server/src/middleware/portalAuth.ts server/src/middleware/portalAuth.test.ts
git commit -m "feat(portal): requirePortalAuth middleware with JWT cookie validation"
```

---

## Task 5: Portal backend routes

**Files:**
- Modify: `server/src/routes/portal.ts`
- Create: `server/src/routes/portal.test.ts`

Implements: `POST /login`, `POST /verify`, `GET /me`, `GET /messages`, `POST /messages`.

- [ ] **Step 1: Write failing tests**

Create `server/src/routes/portal.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import cookieParser from 'cookie-parser'

vi.mock('../db/client', () => ({ db: { query: vi.fn() } }))
vi.mock('../services/email', () => ({
  sendMagicLink: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('jsonwebtoken')
vi.mock('crypto', () => ({
  default: { randomBytes: vi.fn().mockReturnValue(Buffer.from('a'.repeat(32))) },
  randomBytes: vi.fn().mockReturnValue(Buffer.from('a'.repeat(32))),
}))

import { db } from '../db/client'
import portalRouter from './portal'

const mockDb = vi.mocked(db)

const app = express()
app.use(express.json())
app.use(cookieParser())
app.use('/api/portal', portalRouter)

beforeEach(() => vi.clearAllMocks())

describe('POST /api/portal/login', () => {
  it('returns ok:true even when email not found (prevents enumeration)', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [] } as any)
    const res = await request(app).post('/api/portal/login').send({ email: 'nobody@test.com' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('returns 400 for invalid email', async () => {
    const res = await request(app).post('/api/portal/login').send({ email: 'not-an-email' })
    expect(res.status).toBe(400)
  })

  it('sends magic link when email exists', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ id: 42 }] } as any) // assessment lookup
      .mockResolvedValueOnce({ rows: [] } as any)             // delete old tokens
      .mockResolvedValueOnce({ rows: [] } as any)             // insert new token
    const { sendMagicLink } = await import('../services/email')
    const res = await request(app).post('/api/portal/login').send({ email: 'user@test.com' })
    expect(res.status).toBe(200)
    expect(vi.mocked(sendMagicLink)).toHaveBeenCalled()
  })
})

describe('POST /api/portal/verify', () => {
  it('returns 400 if token is not 64 hex chars', async () => {
    const res = await request(app).post('/api/portal/verify').send({ token: 'tooshort' })
    expect(res.status).toBe(400)
  })

  it('returns 400 if token not found or expired', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [] } as any)
    const validToken = 'a'.repeat(64)
    const res = await request(app).post('/api/portal/verify').send({ token: validToken })
    expect(res.status).toBe(400)
  })
})
```

Note: `supertest` is needed for route tests. Install it:
```bash
cd server && npm install -D supertest @types/supertest
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd server && npx vitest run src/routes/portal.test.ts
```
Expected: FAIL — routes not implemented yet.

- [ ] **Step 3: Implement portal routes**

Replace the stub in `server/src/routes/portal.ts` with the full implementation:

```typescript
import { Router, Request, Response } from 'express'
import { z } from 'zod'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { db } from '../db/client'
import { sendMagicLink } from '../services/email'
import { requirePortalAuth } from '../middleware/portalAuth'

const router = Router()

const JWT_SECRET = process.env.PORTAL_JWT_SECRET ?? 'dev-secret'
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173'
const TOKEN_REGEX = /^[0-9a-f]{64}$/

// POST /api/portal/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const parsed = z.object({ email: z.string().email() }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Invalid email' })

    const { email } = parsed.data

    const assessmentResult = await db.query<{ id: number }>(
      `SELECT id FROM assessments WHERE email = $1 ORDER BY created_at DESC LIMIT 1`,
      [email]
    )

    if (assessmentResult.rows[0]) {
      const assessmentId = assessmentResult.rows[0].id

      // Delete any existing unexpired tokens for this assessment
      await db.query(
        `DELETE FROM portal_tokens WHERE assessment_id = $1 AND expires_at > NOW()`,
        [assessmentId]
      )

      const token = crypto.randomBytes(32).toString('hex')
      await db.query(
        `INSERT INTO portal_tokens (assessment_id, token, expires_at) VALUES ($1, $2, NOW() + interval '15 minutes')`,
        [assessmentId, token]
      )

      const magicLink = `${FRONTEND_URL}/portal/verify?token=${token}`
      void sendMagicLink(email, magicLink).catch((e) => console.error('sendMagicLink failed:', e))
    }

    // Always return ok — prevents email enumeration
    res.json({ ok: true })
  } catch (err) {
    console.error('POST /portal/login error:', err)
    res.status(500).json({ error: 'Failed to send login link' })
  }
})

// POST /api/portal/verify
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const parsed = z.object({ token: z.string() }).safeParse(req.body)
    if (!parsed.success || !TOKEN_REGEX.test(parsed.data.token)) {
      return res.status(400).json({ error: 'Invalid token format' })
    }

    const { token } = parsed.data

    const result = await db.query<{ id: number; assessment_id: number }>(
      `SELECT id, assessment_id FROM portal_tokens WHERE token = $1 AND expires_at > NOW()`,
      [token]
    )

    if (!result.rows[0]) {
      return res.status(400).json({ error: 'Link has expired or is invalid. Request a new one.' })
    }

    const { id: tokenId, assessment_id: assessmentId } = result.rows[0]

    // Get email for JWT payload
    const assessmentResult = await db.query<{ email: string }>(
      `SELECT email FROM assessments WHERE id = $1`,
      [assessmentId]
    )
    if (!assessmentResult.rows[0]) {
      return res.status(400).json({ error: 'Assessment not found' })
    }

    // Delete token (one-time use)
    await db.query(`DELETE FROM portal_tokens WHERE id = $1`, [tokenId])

    const jwtPayload = { assessmentId, email: assessmentResult.rows[0].email }
    const signedToken = jwt.sign(jwtPayload, JWT_SECRET, { expiresIn: '7d' })

    res.cookie('portal_token', signedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    })

    res.json({ ok: true })
  } catch (err) {
    console.error('POST /portal/verify error:', err)
    res.status(500).json({ error: 'Failed to verify link' })
  }
})

// GET /api/portal/me
router.get('/me', requirePortalAuth, async (req: Request, res: Response) => {
  try {
    const { assessmentId } = req.portalUser!

    const result = await db.query(
      `SELECT id, email, created_at, conversation, results_unlocked,
              CASE WHEN results_unlocked THEN score ELSE NULL END AS score,
              CASE WHEN results_unlocked THEN score_breakdown ELSE NULL END AS score_breakdown,
              CASE WHEN results_unlocked THEN score_summary ELSE NULL END AS score_summary,
              CASE WHEN results_unlocked THEN biggest_opportunity ELSE NULL END AS biggest_opportunity,
              CASE WHEN results_unlocked THEN biggest_risk ELSE NULL END AS biggest_risk
       FROM assessments WHERE id = $1`,
      [assessmentId]
    )

    if (!result.rows[0]) return res.status(404).json({ error: 'Assessment not found' })
    res.json(result.rows[0])
  } catch (err) {
    console.error('GET /portal/me error:', err)
    res.status(500).json({ error: 'Failed to load assessment' })
  }
})

// GET /api/portal/messages
router.get('/messages', requirePortalAuth, async (req: Request, res: Response) => {
  try {
    const { assessmentId } = req.portalUser!
    const result = await db.query(
      `SELECT id, sender, body, created_at FROM portal_messages WHERE assessment_id = $1 ORDER BY created_at ASC`,
      [assessmentId]
    )
    res.json(result.rows)
  } catch (err) {
    console.error('GET /portal/messages error:', err)
    res.status(500).json({ error: 'Failed to load messages' })
  }
})

// POST /api/portal/messages
router.post('/messages', requirePortalAuth, async (req: Request, res: Response) => {
  try {
    const parsed = z.object({
      body: z.string().trim().min(1, 'Message cannot be empty').max(2000, 'Message too long'),
    }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Invalid message' })

    const { assessmentId } = req.portalUser!
    await db.query(
      `INSERT INTO portal_messages (assessment_id, sender, body) VALUES ($1, 'prospect', $2)`,
      [assessmentId, parsed.data.body]
    )
    res.json({ ok: true })
  } catch (err) {
    console.error('POST /portal/messages error:', err)
    res.status(500).json({ error: 'Failed to send message' })
  }
})

export default router
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd server && npx vitest run src/routes/portal.test.ts
```
Expected: all passing.

- [ ] **Step 5: Run full test suite**

```bash
cd server && npm test
```
Expected: all tests pass.

- [ ] **Step 6: Build**

```bash
cd server && npm run build
```

- [ ] **Step 7: Commit**

```bash
git add server/src/routes/portal.ts server/src/routes/portal.test.ts server/package.json server/package-lock.json
git commit -m "feat(portal): implement portal API routes (login, verify, me, messages)"
```

---

## Task 6: Admin assessment routes — unlock + message

**Files:**
- Modify: `server/src/routes/assessments.ts`

- [ ] **Step 1: Add imports at top of assessments.ts**

The file already imports `sendOnboardEmail, sendDeferEmail` from `'../services/email'`. Add `sendMessageNotification` to that import:
```typescript
import { generateDeferEmail } from '../services/deferEmail'
import { sendOnboardEmail, sendDeferEmail, sendMessageNotification } from '../services/email'
```

- [ ] **Step 2: Add unlock-results endpoint**

Note: `assessments.updated_at` already exists in the schema — the UPDATE below is safe.

Before `export default router` in `server/src/routes/assessments.ts`, add:
```typescript
// POST /api/assessments/:id/unlock-results — make score/feedback visible to prospect
router.post('/:id/unlock-results', async (req: Request, res: Response) => {
  try {
    const result = await db.query<{ id: number }>(
      `UPDATE assessments SET results_unlocked = true, updated_at = NOW() WHERE id = $1 RETURNING id`,
      [req.params.id]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' })
    res.json({ ok: true })
  } catch (err) {
    console.error('POST /assessments/:id/unlock-results error:', err)
    res.status(500).json({ error: 'Failed to unlock results' })
  }
})
```

- [ ] **Step 3: Add message endpoint**

Before `export default router`, add:
```typescript
// POST /api/assessments/:id/message — send a message from the team to the prospect
router.post('/:id/message', async (req: Request, res: Response) => {
  try {
    const parsed = z.object({ body: z.string().trim().min(1).max(2000) }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Invalid message' })

    const assessmentResult = await db.query<{ email: string }>(
      `SELECT email FROM assessments WHERE id = $1`,
      [req.params.id]
    )
    if (!assessmentResult.rows[0]) return res.status(404).json({ error: 'Not found' })

    await db.query(
      `INSERT INTO portal_messages (assessment_id, sender, body) VALUES ($1, 'team', $2)`,
      [req.params.id, parsed.data.body]
    )

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173'
    void sendMessageNotification(assessmentResult.rows[0].email, `${frontendUrl}/portal/login`)
      .catch((e) => console.error('sendMessageNotification failed:', e))

    res.json({ ok: true })
  } catch (err) {
    console.error('POST /assessments/:id/message error:', err)
    res.status(500).json({ error: 'Failed to send message' })
  }
})
```

- [ ] **Step 4: Build and verify**

```bash
cd server && npm run build
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/assessments.ts server/src/services/email.ts
git commit -m "feat(portal): admin unlock-results and message endpoints"
```

---

## Task 7: Frontend portal API helper

**Files:**
- Create: `client/src/lib/portalApi.ts`

This replaces the need to pass `credentials: 'include'` on every fetch. All portal API calls go through this helper.

- [ ] **Step 1: Create portalApi.ts**

```typescript
// client/src/lib/portalApi.ts
import { API_URL } from './api'

/**
 * Fetch wrapper for portal API calls.
 * - Always sends cookies (credentials: 'include') for the httpOnly JWT cookie
 * - Calls onUnauthorized if the server returns 401
 */
export async function portalFetch(
  path: string,
  onUnauthorized: () => void,
  options?: RequestInit
): Promise<Response | null> {
  const headers: Record<string, string> = {
    ...((options?.headers as Record<string, string>) ?? {}),
  }
  if (!(options?.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  })

  if (res.status === 401) {
    onUnauthorized()
    return null
  }

  return res
}
```

- [ ] **Step 2: Verify TypeScript is happy**

```bash
cd client && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/lib/portalApi.ts
git commit -m "feat(portal): portalFetch helper with credentials:include and 401 handling"
```

---

## Task 8: Portal routes in App.tsx

**Files:**
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Add portal imports**

At the top of `client/src/App.tsx`, add the three portal page imports after the existing imports:
```typescript
import { PortalLogin } from './components/Portal/Login'
import { PortalVerify } from './components/Portal/Verify'
import { PortalResults } from './components/Portal/Results'
```

- [ ] **Step 2: Add portal routes**

Inside the `<Routes>` block, after the existing routes, add:
```tsx
<Route path="/portal" element={<Navigate to="/portal/login" replace />} />
<Route path="/portal/login" element={<PortalLogin />} />
<Route path="/portal/verify" element={<PortalVerify />} />
<Route path="/portal/results" element={<PortalResults />} />
```

Add `Navigate` to the react-router-dom import:
```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
```

- [ ] **Step 3: Create empty stub components so build passes**

Create stubs — these will be filled in Tasks 9–13. Create each as a minimal component:

`client/src/components/Portal/Login.tsx`:
```tsx
export function PortalLogin() { return <div>Portal Login</div> }
```

`client/src/components/Portal/Verify.tsx`:
```tsx
export function PortalVerify() { return <div>Portal Verify</div> }
```

`client/src/components/Portal/Results.tsx`:
```tsx
export function PortalResults() { return <div>Portal Results</div> }
```

- [ ] **Step 4: Verify build**

```bash
cd client && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add client/src/App.tsx client/src/components/Portal/
git commit -m "feat(portal): add portal routes to App.tsx (stub components)"
```

---

## Task 9: usePortalTheme hook

**Files:**
- Create: `client/src/components/Portal/usePortalTheme.ts`

Light is default. Theme is stored in `localStorage` under key `portal_theme`.

- [ ] **Step 1: Create hook**

```typescript
// client/src/components/Portal/usePortalTheme.ts
import { useState, useCallback } from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'portal_theme'

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark') return 'dark'
  } catch {
    // localStorage unavailable
  }
  return 'light'
}

export function usePortalTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'light' ? 'dark' : 'light'
      try { localStorage.setItem(STORAGE_KEY, next) } catch { /* ignore */ }
      return next
    })
  }, [])

  return { theme, toggleTheme }
}
```

- [ ] **Step 2: Define theme token objects to share across portal components**

Append to the same file:
```typescript
export const LIGHT: Record<string, string> = {
  bg: '#F8F6F3',
  bg2: '#FFFFFF',
  border: 'rgba(0,0,0,0.09)',
  text: '#1A1A1A',
  textMuted: 'rgba(0,0,0,0.45)',
  accent: '#E85520',
  accentLight: 'rgba(232,85,32,0.1)',
  accentBorder: 'rgba(232,85,32,0.25)',
  riskBg: 'rgba(239,68,68,0.05)',
  riskBorder: 'rgba(239,68,68,0.2)',
  riskText: '#dc2626',
  msgTeamBg: 'rgba(232,85,32,0.08)',
  msgProspectBg: '#F0EDE8',
  inputBg: '#F0EDE8',
}

export const DARK: Record<string, string> = {
  bg: '#0A0A0A',
  bg2: 'rgba(255,255,255,0.03)',
  border: 'rgba(255,255,255,0.08)',
  text: '#FDFCFA',
  textMuted: 'rgba(255,176,154,0.55)',
  accent: '#FF6B35',
  accentLight: 'rgba(255,107,53,0.12)',
  accentBorder: 'rgba(255,107,53,0.3)',
  riskBg: 'rgba(239,68,68,0.06)',
  riskBorder: 'rgba(239,68,68,0.18)',
  riskText: '#ef4444',
  msgTeamBg: 'rgba(255,107,53,0.1)',
  msgProspectBg: 'rgba(255,255,255,0.06)',
  inputBg: 'rgba(255,107,53,0.07)',
}

export function t(theme: Theme): Record<string, string> {
  return theme === 'light' ? LIGHT : DARK
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/Portal/usePortalTheme.ts
git commit -m "feat(portal): usePortalTheme hook with light/dark tokens"
```

---

## Task 10: PortalLogin component

**Files:**
- Modify: `client/src/components/Portal/Login.tsx`

Replace the stub with the full implementation.

- [ ] **Step 1: Implement PortalLogin**

```tsx
// client/src/components/Portal/Login.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { API_URL } from '../../lib/api'
import { usePortalTheme, t } from './usePortalTheme'

export function PortalLogin() {
  const { theme, toggleTheme } = usePortalTheme()
  const tk = t(theme)
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // If already authenticated, skip login
  useEffect(() => {
    fetch(`${API_URL}/api/portal/me`, { credentials: 'include' })
      .then((res) => { if (res.ok) navigate('/portal/results', { replace: true }) })
      .catch(() => { /* not logged in, stay on login */ })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/portal/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? 'Something went wrong.')
        return
      }
      setSubmitted(true)
    } catch {
      setError('Network error. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background: tk.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 20px', position: 'relative' }}>
      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        aria-label="Toggle theme"
        style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: `1px solid ${tk.border}`, borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: tk.textMuted, fontSize: 16 }}
      >
        {theme === 'light' ? '🌙' : '☀️'}
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ width: '100%', maxWidth: 400 }}
      >
        {!submitted ? (
          <>
            <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 11, color: tk.accent, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
              Baawa Assessment
            </div>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 'clamp(22px, 4vw, 28px)', color: tk.text, margin: '0 0 6px', lineHeight: 1.3 }}>
              Access your results
            </h1>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, color: tk.textMuted, margin: '0 0 24px', lineHeight: 1.6 }}>
              Enter the email you used to submit your assessment.
            </p>

            <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label htmlFor="portal-email" style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, color: tk.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Email address
                </label>
                <input
                  id="portal-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  disabled={loading}
                  style={{ background: tk.inputBg, border: `1.5px solid ${tk.accentBorder}`, borderRadius: 10, padding: '12px 16px', fontFamily: 'Outfit, sans-serif', fontSize: 15, color: tk.text, outline: 'none', width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              {error && (
                <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: '#ef4444', margin: 0 }}>{error}</p>
              )}

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={loading ? undefined : { scale: 1.02 }}
                whileTap={loading ? undefined : { scale: 0.98 }}
                style={{ padding: '13px 24px', borderRadius: 10, border: 'none', background: loading ? tk.accentLight : `linear-gradient(135deg, #FF6B35, #E85520)`, color: loading ? tk.accent : '#fff', fontFamily: 'Outfit, sans-serif', fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}
              >
                {loading ? 'Sending…' : 'Send magic link →'}
              </motion.button>
            </form>

            <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, color: tk.textMuted, marginTop: 12, textAlign: 'center' }}>
              We'll email you a one-time login link.
            </p>
          </>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📬</div>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 22, color: tk.text, margin: '0 0 10px' }}>Check your inbox</h2>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, color: tk.textMuted, lineHeight: 1.6 }}>
              We've sent a login link to <strong style={{ color: tk.text }}>{email}</strong>. It expires in 15 minutes.
            </p>
            <button
              onClick={() => { setSubmitted(false); setEmail('') }}
              style={{ marginTop: 20, background: 'none', border: 'none', color: tk.accent, fontFamily: 'Outfit, sans-serif', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
            >
              Use a different email
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
```

- [ ] **Step 2: Manual test**

Start the client: `cd client && npm run dev`
Navigate to `http://localhost:5173/portal/login`.
Verify:
- Light theme renders (beige background, dark text)
- Sun/moon toggle works and persists on refresh
- Form shows correctly on mobile (< 640px)
- Submitting a valid email shows "Check your inbox" state
- Invalid email format shows browser validation (native `type="email"`)

- [ ] **Step 3: Commit**

```bash
git add client/src/components/Portal/Login.tsx
git commit -m "feat(portal): PortalLogin page with magic link form"
```

---

## Task 11: PortalVerify component

**Files:**
- Modify: `client/src/components/Portal/Verify.tsx`

- [ ] **Step 1: Implement PortalVerify**

```tsx
// client/src/components/Portal/Verify.tsx
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { API_URL } from '../../lib/api'

export function PortalVerify() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')

    // Remove token from URL immediately (before the POST) to avoid log exposure
    window.history.replaceState({}, '', '/portal/verify')

    if (!token) {
      setError('Invalid link. Please request a new one.')
      return
    }

    const verify = async () => {
      try {
        const res = await fetch(`${API_URL}/api/portal/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ token }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          setError((data as { error?: string }).error ?? 'This link has expired. Request a new one.')
          return
        }
        navigate('/portal/results', { replace: true })
      } catch {
        setError('Network error. Please check your connection.')
      }
    }

    void verify()
  }, []) // intentionally empty — run once on mount only

  return (
    <div style={{ background: '#0A0A0A', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' }}>
      {error ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', maxWidth: 360 }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>⚠️</div>
          <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 16, color: '#FDFCFA', marginBottom: 20, lineHeight: 1.6 }}>{error}</p>
          <Link to="/portal/login" style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, color: '#FF6B35' }}>
            Request a new link →
          </Link>
        </motion.div>
      ) : (
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          style={{ fontFamily: 'Outfit, sans-serif', fontSize: 18, color: '#FFB09A' }}
        >
          Logging you in…
        </motion.div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Manual test**

Navigate to `http://localhost:5173/portal/verify` (no token). Verify it shows the error state with a link back to login.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/Portal/Verify.tsx
git commit -m "feat(portal): PortalVerify page handles magic link token exchange"
```

---

## Task 12: MessagesPanel component

**Files:**
- Create: `client/src/components/Portal/MessagesPanel.tsx`

This component is used inside PortalResults. It receives messages as a prop and handles sending replies.

- [ ] **Step 1: Define types**

```typescript
export interface PortalMessage {
  id: number
  sender: 'team' | 'prospect'
  body: string
  created_at: string
}
```

- [ ] **Step 2: Implement MessagesPanel**

```tsx
// client/src/components/Portal/MessagesPanel.tsx
import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { type Theme, t } from './usePortalTheme'

export interface PortalMessage {
  id: number
  sender: 'team' | 'prospect'
  body: string
  created_at: string
}

interface MessagesPanelProps {
  messages: PortalMessage[]
  theme: Theme
  onSend: (body: string) => Promise<void>
  sendError: string
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function MessagesPanel({ messages, theme, onSend, sendError }: MessagesPanelProps) {
  const tk = t(theme)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const trimmed = body.trim()
    if (!trimmed || sending) return
    setSending(true)
    try {
      await onSend(trimmed)
      setBody('')
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ background: tk.bg2, border: `1px solid ${tk.border}`, borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%', minHeight: 320 }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${tk.border}` }}>
        <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, fontWeight: 600, color: tk.text }}>Messages</div>
        <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 11, color: tk.textMuted, marginTop: 2 }}>from Baawa team</div>
      </div>

      {/* Thread */}
      <div style={{ flex: 1, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
        {messages.length === 0 && (
          <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: tk.textMuted, margin: 'auto', textAlign: 'center', padding: '20px 0' }}>
            No messages yet — we'll be in touch soon.
          </p>
        )}
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', justifyContent: msg.sender === 'prospect' ? 'flex-end' : 'flex-start' }}
          >
            <div style={{
              maxWidth: '80%',
              background: msg.sender === 'team' ? tk.msgTeamBg : tk.msgProspectBg,
              borderRadius: msg.sender === 'team' ? '10px 10px 10px 2px' : '10px 10px 2px 10px',
              padding: '10px 12px',
            }}>
              {msg.sender === 'team' && (
                <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 10, color: tk.accent, marginBottom: 3 }}>Baawa</div>
              )}
              <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: tk.text, lineHeight: 1.55 }}>{msg.body}</div>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 10, color: tk.textMuted, marginTop: 4 }}>{formatDate(msg.created_at)}</div>
            </div>
          </motion.div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Reply input */}
      {sendError && (
        <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, color: '#ef4444', margin: '0 14px', paddingBottom: 4 }}>{sendError}</p>
      )}
      <div style={{ padding: '10px 12px', borderTop: `1px solid ${tk.border}`, display: 'flex', gap: 8 }}>
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend() } }}
          placeholder="Write a reply…"
          disabled={sending}
          style={{ flex: 1, background: tk.inputBg, border: `1.5px solid ${tk.accentBorder}`, borderRadius: 8, padding: '8px 12px', fontFamily: 'Outfit, sans-serif', fontSize: 13, color: tk.text, outline: 'none', boxSizing: 'border-box' }}
        />
        <button
          onClick={() => void handleSend()}
          disabled={sending || !body.trim()}
          style={{ background: 'linear-gradient(135deg, #FF6B35, #E85520)', border: 'none', borderRadius: 8, padding: '8px 14px', color: '#fff', fontFamily: 'Outfit, sans-serif', fontSize: 14, fontWeight: 600, cursor: sending || !body.trim() ? 'not-allowed' : 'pointer', opacity: sending || !body.trim() ? 0.5 : 1 }}
        >
          →
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/Portal/MessagesPanel.tsx
git commit -m "feat(portal): MessagesPanel component with two-way thread"
```

---

## Task 13: PortalResults component

**Files:**
- Modify: `client/src/components/Portal/Results.tsx`

This is the main dashboard. Fetches assessment + messages on mount, handles unlock state, two-column layout.

- [ ] **Step 1: Implement PortalResults**

```tsx
// client/src/components/Portal/Results.tsx
import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { portalFetch } from '../../lib/portalApi'
import { usePortalTheme, t } from './usePortalTheme'
import { MessagesPanel, type PortalMessage } from './MessagesPanel'

interface Assessment {
  id: number
  email: string
  created_at: string
  conversation: Array<{ role: 'user' | 'assistant'; content: string }>
  results_unlocked: boolean
  score: number | null
  score_breakdown: Record<string, number> | null
  score_summary: string | null
  biggest_opportunity: string | null
  biggest_risk: string | null
}

const DIMENSION_LABELS: Record<string, string> = {
  pmf: 'Product-Market Fit',
  validation: 'Validation',
  growth: 'Growth',
  mindset: 'Mindset',
  revenue: 'Revenue',
}

export function PortalResults() {
  const { theme, toggleTheme } = usePortalTheme()
  const tk = t(theme)
  const navigate = useNavigate()
  const location = useLocation()
  const sessionExpiredMsg = (location.state as { message?: string } | null)?.message ?? ''

  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [messages, setMessages] = useState<PortalMessage[]>([])
  const [loadError, setLoadError] = useState('')
  const [sendError, setSendError] = useState('')
  const [transcriptOpen, setTranscriptOpen] = useState(false)

  const on401 = useCallback(() => {
    navigate('/portal/login', { replace: true, state: { message: 'Your session expired — log in again.' } })
  }, [navigate])

  useEffect(() => {
    const load = async () => {
      const [meRes, msgsRes] = await Promise.all([
        portalFetch('/api/portal/me', on401),
        portalFetch('/api/portal/messages', on401),
      ])
      if (!meRes || !msgsRes) return // 401 already handled
      if (!meRes.ok) { setLoadError('Failed to load your assessment.'); return }
      const [me, msgs] = await Promise.all([meRes.json(), msgsRes.json()])
      setAssessment(me as Assessment)
      setMessages(msgs as PortalMessage[])
    }
    void load()
  }, [on401])

  const handleSendMessage = async (body: string) => {
    setSendError('')
    const res = await portalFetch('/api/portal/messages', on401, {
      method: 'POST',
      body: JSON.stringify({ body }),
    })
    if (!res) return // 401 handled
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setSendError((data as { error?: string }).error ?? 'Failed to send. Try again.')
      return
    }
    // Optimistic update
    setMessages((prev) => [...prev, {
      id: Date.now(),
      sender: 'prospect',
      body,
      created_at: new Date().toISOString(),
    }])
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640

  if (loadError) {
    return (
      <div style={{ background: tk.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'Outfit, sans-serif', color: tk.textMuted }}>{loadError}</p>
      </div>
    )
  }

  if (!assessment) {
    return (
      <div style={{ background: tk.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.4, repeat: Infinity }}
          style={{ fontFamily: 'Outfit, sans-serif', fontSize: 16, color: tk.textMuted }}>
          Loading your results…
        </motion.div>
      </div>
    )
  }

  const breakdown = assessment.score_breakdown ?? {}

  return (
    <div style={{ background: tk.bg, minHeight: '100vh', padding: '24px 20px', boxSizing: 'border-box' }}>
      {/* Theme toggle */}
      <button onClick={toggleTheme} aria-label="Toggle theme"
        style={{ position: 'fixed', top: 16, right: 16, zIndex: 10, background: 'none', border: `1px solid ${tk.border}`, borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: tk.textMuted, fontSize: 16 }}>
        {theme === 'light' ? '🌙' : '☀️'}
      </button>

      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          {sessionExpiredMsg && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontFamily: 'Outfit, sans-serif', fontSize: 13, color: '#ef4444' }}>
              {sessionExpiredMsg}
            </div>
          )}
          <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 11, color: tk.accent, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>Baawa Assessment</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 'clamp(20px, 3vw, 26px)', color: tk.text, margin: 0 }}>Your Results</h1>
            <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, color: tk.textMuted }}>
              Submitted {new Date(assessment.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Two-column layout */}
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 16, alignItems: 'flex-start' }}>

          {/* LEFT: Results (2/3) */}
          <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 12 }}>

            {assessment.results_unlocked ? (
              <>
                {/* Score + Summary row */}
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ background: tk.accentLight, border: `1.5px solid ${tk.accentBorder}`, borderRadius: 10, padding: '16px 20px', textAlign: 'center', minWidth: 88 }}>
                    <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 36, color: tk.accent, fontWeight: 700, lineHeight: 1 }}>{assessment.score}</div>
                    <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 10, color: tk.textMuted, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Score</div>
                  </div>
                  <div style={{ flex: 1, background: tk.bg2, border: `1px solid ${tk.border}`, borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 10, color: tk.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Summary</div>
                    <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: tk.text, lineHeight: 1.6 }}>{assessment.score_summary}</div>
                  </div>
                </div>

                {/* Opp + Risk */}
                <div style={{ display: 'flex', gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
                  <div style={{ flex: 1, background: tk.accentLight, border: `1px solid ${tk.accentBorder}`, borderRadius: 8, padding: 12 }}>
                    <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 10, color: tk.accent, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>✦ Biggest Opportunity</div>
                    <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: tk.text, lineHeight: 1.5 }}>{assessment.biggest_opportunity}</div>
                  </div>
                  <div style={{ flex: 1, background: tk.riskBg, border: `1px solid ${tk.riskBorder}`, borderRadius: 8, padding: 12 }}>
                    <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 10, color: tk.riskText, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>⚠ Biggest Risk</div>
                    <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: tk.text, lineHeight: 1.5 }}>{assessment.biggest_risk}</div>
                  </div>
                </div>

                {/* Score breakdown */}
                {Object.keys(breakdown).length > 0 && (
                  <div style={{ background: tk.bg2, border: `1px solid ${tk.border}`, borderRadius: 8, padding: '14px 16px' }}>
                    <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 10, color: tk.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Score Breakdown</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {Object.entries(breakdown).map(([key, value]) => (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, color: tk.textMuted, width: 140, flexShrink: 0 }}>{DIMENSION_LABELS[key] ?? key}</span>
                          <div style={{ flex: 1, height: 4, background: tk.border, borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ width: `${value}%`, height: '100%', background: `linear-gradient(90deg, #FF6B35, #E85520)`, borderRadius: 2 }} />
                          </div>
                          <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, color: tk.accent, minWidth: 24, textAlign: 'right' }}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Locked state */
              <div style={{ background: tk.bg2, border: `1px solid ${tk.border}`, borderRadius: 12, padding: 24, textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
                <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 18, color: tk.text, margin: '0 0 8px' }}>Under review</h2>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, color: tk.textMuted, margin: 0, lineHeight: 1.65 }}>
                  Our experts are reviewing your submission. You'll receive your results directly from us.
                </p>
              </div>
            )}

            {/* Transcript toggle */}
            <div
              onClick={() => setTranscriptOpen((o) => !o)}
              style={{ background: tk.bg2, border: `1px solid ${tk.border}`, borderRadius: 8, padding: '12px 16px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: tk.textMuted }}>Your answers</span>
                <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, color: tk.accent }}>{transcriptOpen ? '▲ Hide' : '▼ Show transcript'}</span>
              </div>
              <AnimatePresence>
                {transcriptOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{ overflow: 'hidden', marginTop: 12 }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 400, overflowY: 'auto' }}>
                      {(assessment.conversation ?? []).map((msg, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                          <div style={{
                            maxWidth: '80%',
                            padding: '10px 14px',
                            borderRadius: msg.role === 'user' ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
                            background: msg.role === 'user' ? tk.accentLight : tk.bg,
                            border: `1px solid ${tk.border}`,
                            fontFamily: 'Outfit, sans-serif',
                            fontSize: 13,
                            color: tk.text,
                            lineHeight: 1.55,
                          }}>
                            {msg.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Consultant CTA */}
            <div style={{ background: tk.accentLight, border: `1px solid ${tk.accentBorder}`, borderRadius: 8, padding: '14px 16px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: tk.textMuted, marginBottom: 4 }}>Want a deeper review with a consultant?</div>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: tk.accent }}>We'll reach out — stay tuned.</div>
            </div>
          </div>

          {/* RIGHT: Messages (1/3 on desktop, full width on mobile) */}
          <div style={{ flex: 1, width: isMobile ? '100%' : undefined, minWidth: 0 }}>
            <MessagesPanel
              messages={messages}
              theme={theme}
              onSend={handleSendMessage}
              sendError={sendError}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Manual test — locked state**

1. Start the dev server
2. Log in via magic link
3. Verify the "Under review" state renders when `results_unlocked = false`
4. Verify messages panel is visible with empty state
5. Send a test message — verify it appears in the thread immediately
6. Verify light/dark toggle works
7. Resize browser to < 640px — verify single column layout

- [ ] **Step 3: Manual test — unlocked state**

In the admin CRM, click "Unlock results" for your test assessment. Reload `/portal/results`. Verify score, breakdown, opp/risk, summary all appear.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/Portal/Results.tsx
git commit -m "feat(portal): PortalResults dashboard with staged unlock and messages"
```

---

## Task 14: Admin CRM — unlock + message UI

**Files:**
- Modify: `client/src/components/Dashboard/SubmissionDetail.tsx`

Add two new UI sections to the existing detail view: an "Unlock Results" button and a "Send Message" form with thread display.

- [ ] **Step 1: Add state for messages and unlock**

In `SubmissionDetail.tsx`, add these state variables after the existing state declarations (around line 37):
```typescript
const [messages, setMessages] = useState<Array<{ id: number; sender: string; body: string; created_at: string }>>([])
const [messageBody, setMessageBody] = useState('')
const [sendingMsg, setSendingMsg] = useState(false)
const [msgError, setMsgError] = useState('')
const [unlocking, setUnlocking] = useState(false)
```

- [ ] **Step 2: Load messages on mount**

The admin side needs its own endpoint to view the message thread. **First**, add `GET /api/assessments/:id/messages` in `server/src/routes/assessments.ts`:
```typescript
// GET /api/assessments/:id/messages — admin view of portal message thread
router.get('/:id/messages', async (req: Request, res: Response) => {
  try {
    const result = await db.query(
      `SELECT id, sender, body, created_at FROM portal_messages WHERE assessment_id = $1 ORDER BY created_at ASC`,
      [req.params.id]
    )
    res.json(result.rows)
  } catch (err) {
    console.error('GET /assessments/:id/messages error:', err)
    res.status(500).json({ error: 'Failed to load messages' })
  }
})
```

Then in `SubmissionDetail.tsx`, update the load function to fetch messages:
```typescript
try {
  const msgsRes = await authFetch(`${API_URL}/api/assessments/${id}/messages`, token, on401)
  if (msgsRes?.ok) {
    const msgsData = await msgsRes.json()
    setMessages(msgsData)
  }
} catch { /* non-critical */ }
```

- [ ] **Step 3: Add unlock results button**

In the JSX, after the existing action buttons (`Onboard` / `Defer`), inside the `<div className="flex gap-3">`, add:
```tsx
{assessment.status !== 'deferred' && !(assessment as Assessment & { results_unlocked?: boolean }).results_unlocked && (
  <button
    onClick={async () => {
      setUnlocking(true)
      try {
        const res = await authFetch(`${API_URL}/api/assessments/${id}/unlock-results`, token, on401, { method: 'POST' })
        if (res?.ok) {
          setAssessment((prev) => prev ? { ...prev, results_unlocked: true } as typeof prev : prev)
          setActionMsg('Results unlocked — the prospect can now see their score.')
        }
      } catch { setError('Failed to unlock results.') }
      finally { setUnlocking(false) }
    }}
    disabled={unlocking}
    className="bg-orange-600 hover:bg-orange-500 text-white font-heading text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
  >
    {unlocking ? 'Unlocking…' : 'Unlock Results'}
  </button>
)}
```

Also add `results_unlocked?: boolean` to the `Assessment` interface in this file.

- [ ] **Step 4: Add message panel to JSX**

After the existing `{/* Conversation Transcript */}` section, add:
```tsx
{/* Portal Messages */}
<div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mt-6">
  <h3 className="text-lg font-heading text-white mb-4">Portal Messages</h3>

  {/* Thread */}
  <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto pr-1">
    {messages.length === 0 && (
      <p className="text-gray-400 font-body text-sm">No messages yet.</p>
    )}
    {messages.map((msg) => (
      <div key={msg.id} className={`flex ${msg.sender === 'prospect' ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[75%] px-3 py-2 rounded-xl font-body text-sm ${msg.sender === 'team' ? 'bg-orange-900/30 text-orange-200' : 'bg-gray-800 text-gray-300'}`}>
          <div className="text-xs opacity-60 mb-1">{msg.sender === 'team' ? 'You' : 'Prospect'}</div>
          {msg.body}
        </div>
      </div>
    ))}
  </div>

  {/* Send form */}
  <div className="flex gap-2">
    <textarea
      value={messageBody}
      onChange={(e) => setMessageBody(e.target.value)}
      placeholder="Write a message to this prospect…"
      rows={2}
      className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white font-body text-sm focus:outline-none focus:border-orange-500 resize-none"
    />
    <button
      onClick={async () => {
        if (!messageBody.trim()) return
        setSendingMsg(true)
        setMsgError('')
        try {
          const res = await authFetch(`${API_URL}/api/assessments/${id}/message`, token, on401, {
            method: 'POST',
            body: JSON.stringify({ body: messageBody.trim() }),
          })
          if (res?.ok) {
            setMessages((prev) => [...prev, { id: Date.now(), sender: 'team', body: messageBody.trim(), created_at: new Date().toISOString() }])
            setMessageBody('')
          } else {
            setMsgError('Failed to send. Try again.')
          }
        } catch { setMsgError('Network error.') }
        finally { setSendingMsg(false) }
      }}
      disabled={sendingMsg || !messageBody.trim()}
      className="bg-orange-600 hover:bg-orange-500 text-white font-heading text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50 self-end"
    >
      {sendingMsg ? '…' : 'Send'}
    </button>
  </div>
  {msgError && <p className="text-red-400 font-body text-xs mt-2">{msgError}</p>}
</div>
```

- [ ] **Step 5: Build and verify**

```bash
cd client && npx tsc --noEmit
cd server && npm run build
```

- [ ] **Step 6: Manual test**

1. Open an assessment in the admin CRM
2. Send a message → verify it appears in the thread
3. Check the prospect portal to confirm the notification email was triggered (Railway logs) and the message appears
4. Click "Unlock Results" → verify the button disappears and actionMsg shows
5. Reload the portal as the prospect → verify score/feedback is now visible

- [ ] **Step 7: Commit**

```bash
git add client/src/components/Dashboard/SubmissionDetail.tsx server/src/routes/assessments.ts
git commit -m "feat(portal): admin CRM — unlock results button and message thread"
```

---

## Task 15: Railway env vars + end-to-end smoke test

- [ ] **Step 1: Add Railway env vars**

In Railway dashboard, add:
- `PORTAL_JWT_SECRET` — run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` and paste the output
- `FRONTEND_URL` — `https://www.baawa.co` (or whatever the Vercel URL is)

- [ ] **Step 2: Deploy**

```bash
git push
```
Railway auto-deploys on push to main. Watch Railway logs for `Startup migrations OK` to confirm the new tables were created.

- [ ] **Step 3: End-to-end smoke test**

1. Go to `https://www.baawa.co/portal/login`
2. Enter an email that has a real submission
3. Check that email for the magic link
4. Click the link → verify redirect to `/portal/results`
5. Confirm "Under review" state shows (if not yet unlocked)
6. In admin CRM, send a message → verify email arrives + appears in portal
7. In admin CRM, unlock results → verify score/feedback appears on reload
8. Verify light/dark toggle persists across page refresh

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat(portal): submission portal complete — magic link auth, results, messaging"
```
