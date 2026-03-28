# AGENTS.md — Instructions for All Coding LLMs

> Read this file before touching any code. It contains everything you need to continue work on this project without the original developer re-explaining anything.

---

## Project Overview

**Baawa Mehram** is a full-stack web application for a digital marketing consultancy. It has two main parts:

1. **Assessment Funnel** — An immersive "cosmic journey" onboarding experience where clients answer adaptive AI-generated questions about their business. Claude (with Gemini/Groq fallback) generates each question based on prior answers using Rory Sutherland's behavioral economics principles + RAG from a knowledge base.

2. **Agency CRM + Admin Dashboard** — A password-protected consultant dashboard with: submission review, client pipeline (Kanban), deliverables tracker, revenue overview, knowledge base management, and an AI journey optimizer.

3. **Submission Portal** — A client-facing portal at `/portal/*` where assessment takers log in via 6-digit Email OTP, view their analysis/deliverables (staged unlock), and exchange messages with the Baawa team.

**Deployed:** Frontend on Vercel (baawa.co), Backend on Railway.

---

## Tech Stack

- **Frontend:** React 18 + Vite + TypeScript, Framer Motion, react-router-dom v6, Three.js, Leaflet.js, Tailwind CSS
- **Backend:** Node.js + Express + TypeScript, PostgreSQL + pgvector, Resend (email)
- **LLM:** Claude (claude-haiku-4-5) → Gemini → Groq fallback chain
- **Auth:** Dashboard — `Authorization: Bearer <FOUNDER_API_KEY>` header. Portal — JWT in httpOnly cookie (`portal_token`), 6-digit OTP via Resend
- **Fonts:** Outfit (body/heading), Cormorant Garamond (display), Manrope (logo only)
- **Monorepo:** `client/` (Vercel) + `server/` (Railway)

---

## Architecture & Key Decisions

- **Adaptive questioning:** Claude Haiku generates each question dynamically based on full conversation history + top-3 RAG chunks from pgvector knowledge base
- **LLM fallback chain:** Claude → Gemini → Groq (implemented in `server/src/services/llm.ts` or similar)
- **Portal auth:** Step 1: Request 6-digit OTP via email. Step 2: Enter code in `/portal/login` -> 7-day JWT in httpOnly cookie. `SameSite=lax` in dev, `SameSite=none; Secure` in production (cross-origin: Vercel + Railway)
- **Results staging:** Conversation always visible in portal. Score/feedback locked until admin clicks "Unlock Results" (`results_unlocked` column on assessments)
- **Two-way messaging:** `portal_messages` table, `sender: 'team' | 'prospect'`
- **DB migrations:** Run automatically at server startup in `startServer()` in `server/src/index.ts` — all `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
- **Email:** Resend, domain `baawa.co` (verified), FROM: `hello@baawa.co`
- **Dashboard styling:** Pure inline styles (no Tailwind dependency) — black `#000000` page bg, `#111111` cards, `#1a1a1a` inputs, `#333333` borders, white text, white primary buttons with black text

---

## Folder Structure

```
baawa-mehram/
├── client/                         # React + Vite → Vercel
│   ├── src/
│   │   ├── components/
│   │   │   ├── Assessment/         # QuestionCard, VoiceInput, AssessmentShell, GenieCharacter
│   │   │   ├── CosmicJourney/      # Three.js solar system, Earth zoom, location reveal, intro messages
│   │   │   ├── Dashboard/          # Full CRM: index, SubmissionList, SubmissionDetail, Pipeline,
│   │   │   │                       #   ClientDetail, ClientProfile, DeliverablesTracker, ClientNotes,
│   │   │   │                       #   ActivityFeed, RevenueOverview, KnowledgeBase, Intelligence
│   │   │   ├── Portal/             # Login (OTP), Results, MessagesPanel, usePortalTheme
│   │   │   ├── EmailCapture/
│   │   │   ├── ThankYou/
│   │   │   ├── LandingPage/        # Homepage with burger menu (About Us) + Login button
│   │   │   └── Logo.tsx            # LogoLight, LogoDark, LogoIcon, LogoSymbol
│   │   ├── lib/
│   │   │   ├── api.ts              # API_URL constant
│   │   │   └── portalApi.ts        # portalFetch() — wraps fetch with credentials:include + 401 handling
│   │   ├── hooks/
│   │   │   ├── useSession.ts       # Assessment session state
│   │   │   └── useVoiceRecorder.ts # MediaRecorder wrapper
│   │   └── App.tsx                 # Routes: /, /dashboard, /portal/login, /portal/results
│   ├── tailwind.config.js          # Minimal — custom tokens: brand-orange (#FF6B35), brand-orange-dark
│   ├── vercel.json                 # SPA rewrite rule
│   └── index.html                  # Loads Outfit, Cormorant Garamond, Manrope from Google Fonts
│
├── server/                         # Express + PostgreSQL → Railway
│   ├── src/
│   │   ├── routes/
│   │   │   ├── sessions.ts         # POST /api/sessions/start|answer|complete
│   │   │   ├── assessments.ts      # GET/PUT assessments, unlock-results, message, messages
│   │   │   ├── portal.ts           # POST /login|verify, GET /me|messages, POST /messages
│   │   │   ├── clients.ts          # CRM client + deliverable endpoints
│   │   │   ├── voice.ts            # POST /api/voice/transcribe (Whisper)
│   │   │   ├── journey.ts          # GET /api/journey/intro
│   │   │   └── market-data.ts      # Forex/BTC data proxy
│   │   ├── middleware/
│   │   │   └── portalAuth.ts       # requirePortalAuth — reads portal_token cookie, validates JWT
│   │   ├── services/
│   │   │   ├── email.ts            # All email flows via Resend (8 functions)
│   │   │   ├── rag.ts              # pgvector RAG retrieval
│   │   │   ├── questioning.ts      # Haiku adaptive question generation
│   │   │   ├── scoring.ts          # Haiku final scoring
│   │   │   ├── geo.ts              # IP geolocation
│   │   │   ├── journeyConfig.ts    # Journey config DB service
│   │   │   └── journeyOptimizer.ts # AI journey optimizer
│   │   ├── db/
│   │   │   ├── client.ts           # PostgreSQL connection pool
│   │   │   ├── schema.sql          # Full DB schema
│   │   │   └── seeds/
│   │   │       ├── journeyConfigV1.ts  # V1_INTRO_MESSAGES (must stay in sync with CosmicJourney/index.tsx MSGS)
│   │   │       └── runSeed.ts
│   │   └── index.ts                # Express app + startup migrations
│   └── vitest.config.ts            # Excludes dist/ from test runs
│
├── knowledge-base/
│   └── rory-sutherland.md          # RS behavioral economics knowledge base
│
├── docs/superpowers/
│   ├── specs/2026-03-26-submission-portal-design.md
│   └── plans/2026-03-26-submission-portal.md   # Full portal implementation plan (Tasks 1-15)
│
└── AGENTS.md                       # This file
```

---

## Database Schema (key tables)

```sql
sessions          -- Assessment conversations (id: UUID)
assessments       -- Completed submissions (email, score, score_breakdown, results_unlocked)
portal_tokens     -- 6-digit OTP tokens (15 min expiry, one-time use)
portal_messages   -- Two-way messages (sender: 'team'|'prospect')
clients           -- CRM clients (stage: phase1|phase2|churned)
deliverables      -- Per-client deliverables
client_notes      -- Per-client notes
activities        -- Activity log
knowledge_chunks  -- pgvector embeddings of RS knowledge base
journey_config    -- AI journey config versions
session_analytics -- Per-session analytics (session_id: UUID)
```

---

## Environment Variables

**Railway (server):**
```
DATABASE_URL=
RESEND_API_KEY=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=           # Embeddings only
FOUNDER_API_KEY=          # Dashboard password
PORTAL_JWT_SECRET=        # Random 32-byte hex string
FRONTEND_URL=             # https://www.baawa.co
PORT=8080
```

**Vercel (client):**
```
VITE_API_URL=https://your-railway-url.railway.app
```

---

## Current Project State (as of 2026-03-27)

### Fully implemented & deployed:
- Full assessment funnel (cosmic journey → adaptive questions → email capture → thank you)
- Admin CRM dashboard (submissions, pipeline, clients, deliverables, revenue, knowledge base, intelligence optimizer)
- LLM fallback chain (Claude → Gemini → Groq)
- Voice input (Whisper transcription)
- Submission portal (Tasks 1-14 complete):
  - 6-digit Email OTP auth (`/portal/login` -> enter code -> `/portal/results`)
  - Staged analysis unlock
  - Two-way messaging (client ↔ consultant)
  - Admin CRM: unlock button + message thread in SubmissionDetail
- Landing page with burger menu (About Us: Mission/Vision/Core Belief/Values) + Login button in nav
- Intro messages updated to "Baawa consultancy hub" copy

### Known issues / in progress:
- Dashboard styling was broken due to undefined Tailwind custom tokens — fixed by switching to pure inline styles (black/white theme). May need polish.
- Resend domain `baawa.co` was "not started" — user was in the process of verifying DNS. Once verified, magic link emails will work.
- Portal smoke test (Task 15) not yet completed — pending Resend verification.

### Next priority tasks:
1. Verify Resend domain (`baawa.co`) is verified → test full magic link flow end-to-end
2. Polish dashboard styling if needed
3. Run full smoke test (Task 15 in `docs/superpowers/plans/2026-03-26-submission-portal.md`)

---

## Coding Style & Rules

- **TypeScript strict** throughout — no `any` unless absolutely unavoidable
- **Backend:** Express route handlers are `async`, all wrapped in try/catch returning 500 on error
- **DB queries:** Use typed generics `db.query<{ col: type }>(...)`
- **Validation:** Zod on all request bodies
- **Email errors:** `sendMagicLink` is fire-and-forget (`void fn().catch(console.error)`) — non-critical
- **Frontend:** Functional components with hooks only, no class components
- **Portal components:** Use `portalFetch()` for all portal API calls (handles 401 redirect automatically)
- **Dashboard components:** Pure inline styles — no Tailwind classes
- **LandingPage + portal components:** Mix of inline styles and Tailwind (Tailwind works fine here)
- **DO NOT:** Add unnecessary comments, mock the DB in tests, skip try/catch on async route handlers

---

## How to Continue

1. Read this file
2. Read the relevant source files for your task
3. For portal tasks, also read `docs/superpowers/plans/2026-03-26-submission-portal.md`
4. Follow the existing patterns — match the style of nearby code
5. Run `cd server && npm test` after backend changes
6. Run `cd client && npx tsc --noEmit` after frontend changes
7. All work goes directly to `main` branch (no worktrees, no PRs)
