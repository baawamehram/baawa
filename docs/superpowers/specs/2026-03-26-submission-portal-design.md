# Submission Portal — Design Spec
**Date:** 2026-03-26
**Project:** baawa-mehram
**Status:** Approved

---

## Overview

A user-facing portal where founders who completed the Baawa assessment can log in to view their submission, score, and feedback. Access is via magic link sent to the email they submitted with. The portal is built into the existing React frontend and Express backend — no new deployments needed.

---

## Goals

- Let assessment takers return to the site and view their results after being contacted
- Enable two-way messaging between the Baawa team and the prospect
- Keep the experience on-brand and mobile-friendly
- No passwords — magic link only

---

## Non-Goals

- Phone/SMS login (deferred — Twilio not free, email covers the current use case)
- Paid consultant booking flow (placeholder CTA only, full feature deferred)
- Public profiles or shareable result links
- Re-locking results after unlocking
- Unread message indicators (deferred — see Known Limitations)

---

## Pages & Routes

| Route | Description |
|---|---|
| `/portal` | Redirects to `/portal/login` |
| `/portal/login` | Email entry form — triggers magic link send |
| `/portal/verify` | Landing page for magic link click; POSTs token to backend, issues JWT cookie, redirects to `/portal/results` |
| `/portal/results` | The main dashboard — requires auth |

---

## Authentication Flow

1. User visits `/portal/login`, enters the email they submitted with
2. Backend looks up `assessments` by email using `ORDER BY created_at DESC LIMIT 1` (handles the rare case of a duplicate email — always uses the most recent submission)
3. If found: deletes any existing unexpired token for that `assessment_id` (prevents inbox flooding), generates a cryptographically random 32-byte token encoded as hex (64 chars), stores it in `portal_tokens` with a 15-minute expiry, sends magic link email via Resend
4. If not found: returns a neutral success message — same response as success (prevents email enumeration)
5. User clicks the link → `/portal/verify?token=abc123`
6. `PortalVerify` page extracts the token from the URL, immediately POSTs it to `POST /api/portal/verify` (token in request body — not kept in URL to avoid log exposure)
7. Backend validates token (exists, not expired), deletes it (one-time use), issues a signed JWT (7-day expiry) containing `{ assessmentId, email }` — email is included to bind the token to a specific owner
8. JWT returned as an `httpOnly; SameSite=None; Secure` cookie named `portal_token` — not accessible to JavaScript, eliminating XSS risk. `SameSite=None` is required because the frontend (Vercel) and backend (Railway) are on different origins; `SameSite=Strict` or `Lax` would block the cookie on cross-origin fetch calls. The existing CORS config already sets `credentials: true` and restricts `origin` to known domains — frontend portal API calls must use `credentials: 'include'`.
9. `requirePortalAuth` middleware validates the JWT from the cookie and cross-checks `email` against the assessment record — completely separate from the admin `requireAuth` middleware

---

## Backend — New Routes

All under `/api/portal`. No admin auth required (portal auth is separate).

### `POST /api/portal/login`
- Body: `{ email: string }`
- Looks up assessment by email: `SELECT id FROM assessments WHERE email = $1 ORDER BY created_at DESC LIMIT 1`
- Deletes any existing unexpired token for that `assessment_id` before inserting a new one
- Generates 32-byte hex token (64 chars), inserts into `portal_tokens` with `expires_at = NOW() + interval '15 minutes'`
- Constructs magic link as `${FRONTEND_URL}/portal/verify?token=<hex>` — requires `FRONTEND_URL` env var on the backend (e.g. `https://www.baawa.co`)
- Sends magic link via Resend
- Always returns `{ ok: true }` (prevents email enumeration)
- Inherits global rate limit; implementer may add a per-email db-level cooldown if abuse becomes an issue

### `POST /api/portal/verify`
- Body: `{ token: string }`
- Body: `{ token: string }` — rejects with 400 if `token` is absent, not a string, or not exactly 64 lowercase hex characters (prevents garbage DB queries)
- Validates token against `portal_tokens` (exists + `expires_at > NOW()`)
- Deletes token (one-time use)
- Issues signed JWT: `{ assessmentId, email, iat, exp }` — 7-day expiry
- Sets JWT as `httpOnly; SameSite=None; Secure` cookie named `portal_token`
- Returns `{ ok: true }`

### `GET /api/portal/me`
- Requires `requirePortalAuth` (reads `portal_token` cookie, validates JWT, cross-checks `email` vs assessment record)
- Returns assessment data scoped to the JWT's `assessmentId`:
  - Always: `id`, `email`, `created_at`, `conversation`
  - Only if `results_unlocked = true`: `score`, `score_breakdown`, `score_summary`, `biggest_opportunity`, `biggest_risk`

### `GET /api/portal/messages`
- Requires `requirePortalAuth`
- Returns all `portal_messages` for the assessment, ordered by `created_at ASC`

### `POST /api/portal/messages`
- Requires `requirePortalAuth`
- Body: `{ body: string }` — rejects with 400 if body is absent, empty/whitespace-only, or exceeds 2000 chars
- Inserts message with `sender = 'prospect'`

### `POST /api/assessments/:id/message` (admin)
- Requires `requireAuth` (admin)
- Body: `{ body: string }`
- Inserts message with `sender = 'team'`
- Sends a notification email to the prospect: "You have a new message from the Baawa team — log in to view it" with a link to `/portal/login`
- Added to the existing assessments router

### `POST /api/assessments/:id/unlock-results` (admin)
- Requires `requireAuth` (admin)
- Sets `results_unlocked = true` on the assessment
- Added to the existing assessments router

---

## Database — New Tables & Columns

### New column on `assessments`
```sql
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS results_unlocked BOOLEAN NOT NULL DEFAULT false;
```

### `portal_tokens`
```sql
-- token is 32 random bytes encoded as lowercase hex = exactly 64 characters
CREATE TABLE IF NOT EXISTS portal_tokens (
  id            SERIAL PRIMARY KEY,
  assessment_id INT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  token         VARCHAR(64) UNIQUE NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_portal_tokens_token ON portal_tokens (token);
CREATE INDEX IF NOT EXISTS idx_portal_tokens_expires ON portal_tokens (expires_at);
CREATE INDEX IF NOT EXISTS idx_portal_tokens_assessment ON portal_tokens (assessment_id);
```

### `portal_messages`
```sql
-- sender: 'team' = Baawa team, 'prospect' = the assessment submitter
CREATE TABLE IF NOT EXISTS portal_messages (
  id            SERIAL PRIMARY KEY,
  assessment_id INT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  sender        VARCHAR(20) NOT NULL CHECK (sender IN ('team', 'prospect')),
  body          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_portal_messages_assessment ON portal_messages (assessment_id, created_at);
```

---

## Frontend — New Components

### `PortalLogin` (`/portal/login`)
- Left-aligned layout (Login B style)
- Brand label: "Baawa Assessment" in orange
- Heading: "Access your results"
- Subtext: "Enter the email you used to submit"
- Single email input + "Send magic link" button
- On submit: shows "Check your inbox — we've sent you a link" confirmation state
- If portal auth cookie already present and valid: redirect to `/portal/results`
- Light theme default, dark toggle in top-right corner
- Matches existing Outfit font + colour palette

### `PortalVerify` (`/portal/verify`)
- On mount: extracts `?token=` from URL, immediately POSTs it to `POST /api/portal/verify` (removes token from URL via `history.replaceState` before the POST to avoid it lingering in browser history)
- Shows "Logging you in…" spinner during the request
- On success: redirects to `/portal/results`
- On failure (expired/invalid): shows error message with link back to `/portal/login`

### `PortalResults` (`/portal/results`)
- On mount: calls `GET /api/portal/me` — if it returns 401, redirect to `/portal/login` with "Your session expired — log in again"
- A 401 from any portal API call must also trigger a redirect to `/portal/login` (not just the initial mount check)
- Light theme default, dark/light toggle button top-right, preference stored in `localStorage`
- **Mobile (< 640px):** single column; **Desktop:** two-column (2/3 results, 1/3 messages)

#### Left column — Results
1. **Score hero** — locked state: "Our experts are reviewing your submission. You'll receive your results directly from us."; unlocked: score number
2. **Summary** — locked/unlocked same as score
3. **Opportunity + Risk cards** side by side — locked/unlocked same as score
4. **Score breakdown** — 5 dimension bars — locked/unlocked same as score
5. **Conversation transcript** — always visible, collapsed by default behind "Show your answers" toggle
6. **Consultant CTA** — soft placeholder: "Want a deeper review? We'll reach out."

#### Right column — Messages
- Panel header: "Messages / from Baawa team"
- Thread of messages: team messages left-aligned (orange tint), prospect replies right-aligned (neutral)
- Reply input at bottom with send button
- Empty state: "No messages yet — we'll be in touch soon."

---

## Admin CRM Changes

Two new actions on each assessment card/detail view:

1. **"Unlock results"** button — calls `POST /api/assessments/:id/unlock-results`, flips `results_unlocked = true`. One-way for now.
2. **"Send message"** input — text field + send button, calls `POST /api/assessments/:id/message`. Displays existing thread inline. Triggers a notification email to the prospect.

---

## Notification Email (team → prospect)

When the Baawa team sends a message via the admin CRM, Resend sends:

- **Subject:** "You have a message from the Baawa team"
- **Body:** "The Baawa team has left you a message regarding your assessment. Log in to read it and reply." + link to `/portal/login`

This is the minimum needed to make two-way messaging actually work — without it, the prospect has no reason to return to the portal.

---

## Theme

- **Default:** Light (`#F8F6F3` background, `#1A1A1A` text, orange accents)
- **Dark:** `#0A0A0A` background, `#FDFCFA` text (current assessment funnel palette)
- **Toggle:** sun/moon icon button, preference stored in `localStorage`
- Font: Outfit (already loaded)
- Both themes use the same orange accent: `#FF6B35` / `#E85520`

---

## Mobile Behaviour

- Below 640px: two-column layout collapses to single column
- Stack order: score hero → opp/risk → breakdown → messages → transcript → CTA
- Full-width inputs and buttons
- Messages panel becomes a full-width section rather than sidebar

---

## Error States

| Scenario | Behaviour |
|---|---|
| Magic link expired | "This link has expired. Request a new one." + link back to login |
| Email not found on login | Silent success — same message as valid email (prevents enumeration) |
| Already logged in (valid cookie) | `/portal/login` redirects directly to `/portal/results` |
| Cookie expired / 401 from API | Redirect to `/portal/login`: "Your session expired — log in again" |
| Results not yet unlocked | "Under review" message — score/feedback not rendered |
| Duplicate email in assessments | Most recent submission (`ORDER BY created_at DESC LIMIT 1`) is used |

---

## Known Limitations (deferred)

- **No unread message indicators** — neither side sees which messages are new. A `read_at` column could be added to `portal_messages` in a future iteration.
- **No per-email rate limiting** — current protection is delete-on-new-request (one active token per email at a time) plus the global IP rate limit. Per-email cooldown can be added if abuse is observed.
- **Phone login not supported** — email only for now.
- **No result re-locking** — once unlocked, results are always visible.

---

## Out of Scope (this iteration)

- Phone/OTP login
- Paid consultant booking
- Result sharing / public links
