# Baawa-Mehram Platform — Full Agent Context Document

## What This Document Is

This is a complete technical context document for the **baawa-mehram** platform — an AI-powered lead qualification funnel + agency CRM. Use this to understand the full system before building any feature.

---

## What the Platform Does

An elite digital marketing agency uses this platform to:
1. **Qualify leads** — prospects complete an 8-question adaptive AI assessment
2. **Score and triage** — AI scores each submission 0–100; founder reviews in dashboard
3. **Onboard clients** — accepted prospects get a private portal with proposals, agreements, deliverables, and messaging
4. **Manage clients** — full CRM with pipeline stages, deliverables, work plans, notes, and activity logs
5. **Optimize the funnel** — AI Journey Optimizer analyzes weekly metrics and proposes config changes

---

## User Story: From Discovery to Delivery

### How a Founder Discovers Baawa

A digital marketing agency's founder (let's call them Alex) targets early-stage founders facing go-to-market challenges. Instead of a generic contact form, prospects land on a beautiful page with:
- A 12-second cosmic journey (Three.js: solar system → Earth zoom → city reveal)
- A compelling headline: *"This is not a form. This is a conversation."*
- A single CTA button to start an assessment

**Why this matters:** The cosmic intro signals that this isn't another run-of-the-mill SaaS. It sets the tone — thoughtful, immersive, premium.

---

### Step 1: The Assessment (Prospect POV)

The prospect clicks "Start Assessment" and begins a **personalized, conversational interview** with AI:

**8 Structured Questions** (types: open text, multiple choice, slider, ranking):
1. What's your biggest go-to-market challenge?
2. [MCQ] Which stage: pre-launch, launched <6mo, >6mo?
3. [Slider] Revenue: $0–$1M+
4. [Ranking] Rank top 3 growth priorities
5. ... (etc.)

**Key differences from a form:**
- Questions adapt and feel contextual (previous answers inform the next question)
- Voice input supported — prospect can answer via microphone (Whisper transcription)
- Takes ~10–15 minutes (feels like an interview, not a survey)
- Animated guide character provides subtle feedback
- Progress bar shows how far through they are

**What happens behind the scenes:**
- Every answer is sent to the backend via POST `/api/sessions/:id/answer`
- AI classifies conversation topics (go-to-market, hiring, product, etc.)
- RAG retrieves relevant behavioral economics principles to refine the next question
- Session analytics track: answer length, input method (voice vs text), drop-off point

When the prospect has answered all 8 questions, they're asked to enter their email and submit.

---

### Step 2: AI Scoring & Internal Triage (Agency Founder POV)

Immediately after submit:
1. Backend runs AI scoring via Claude Haiku
2. Score 0–100 with breakdown across 5 dimensions:
   - **PMF (Product-Market Fit)** — clarity of the problem + solution alignment
   - **Validation** — customer feedback, traction, evidence
   - **Growth** — scalability, market size understanding
   - **Mindset** — founder's clarity, decision-making framework
   - **Revenue Potential** — pricing strategy, business model viability

3. AI generates:
   - **1-line summary** of the founder's business
   - **Biggest Opportunity** — the one thing that could unlock growth
   - **Biggest Risk** — what could derail them

4. All triage emails fire (prospect gets ACK; founder gets full submission with score)

---

### Step 3: Alex Reviews in the Dashboard

Alex logs into the admin dashboard with `FOUNDER_API_KEY` and navigates to **Submissions**:
- Table sorted by score (descending)
- Filters: status (pending, reviewing, onboarded, deferred), score range
- For each submission: founder name, company, score badge, status

Alex clicks on a high-scoring prospect to view:
- Full conversation transcript
- AI score breakdown (bar charts: PMF 18/20, Validation 15/20, etc.)
- Biggest opportunity & risk highlighted
- Alex's own notes textarea (saved for internal reference)

**Three actions:**
1. **Accept** — "Let's work together" → prospect added to CRM as a client
2. **Defer** → AI generates personalized rejection email (considers the conversation tone)
3. **Review** → Mark as reviewing (move to next batch later)

---

### Step 4: Prospect Portal Access (Client POV)

Once accepted, the prospect receives an email: *"Your assessment is approved. Here's your exclusive portal link."*

Portal login flow:
- Prospect enters email → **6-digit OTP sent via Resend** → logs in
- JWT cookie (7-day) grants access to their private workspace

**Portal sections:**
1. **Overview** — status, next steps timeline
2. **Assessment** — score/summary/opportunity/risk (gated — only visible after Alex unlocks)
3. **Work Plans** — Alex creates a markdown-based work plan with tasks + cost estimates → prospect reviews + approves
4. **Deliverables** — Phase 1 milestones (e.g., "Market research deck", "Competitive analysis") → prospect accepts when complete
5. **Agreements** — Alex sends proposals (custom packages + pricing) → prospect signs digitally
6. **Engagements** — 2-way messaging with Alex's team (prospect can ask questions, team can provide updates)
7. **Calls** — Alex proposes 3 call slots → prospect picks one → auto-confirmation emails

---

### Step 5: Pricing & Cost Assignment

Baawa supports a **flexible Phase 1 + Phase 2 model** where **costs are determined per engagement based on actual work scope**:

#### Phase 1: Discovery & Foundation
- **Variable Fee** — determined by team/agents based on scope
- Includes: Strategy document, market research, competitive analysis, initial positioning framework
- Deliverables milestone-based (5–8 key outputs)
- Timeline: 4–8 weeks (varies by scope)
- **How it works in Baawa:**
  - After prospect is accepted, team/agents review the assessment + conversation to determine Phase 1 scope
  - Alex creates a Work Plan with tasks: "Research market", "Create positioning doc", "Analyze competitors"
  - Each task has estimated_hours and cost (determined by team based on complexity)
  - Deliverables linked to client (portal_visible = true for milestone summaries)
  - Prospect approves costs before Phase 1 begins
  - Prospect accepts final deliverable → marked "accepted_at" + "accepted_by"

#### Phase 2: Execution & Scale (Optional)
- **Retainer Fee** (agent-determined per client) + **Revenue Share** (optional, agent-determined)
- Includes: Ongoing optimization, quarterly reviews, new initiative launches
- **How it works in Baawa:**
  - Client record stores: `phase2_monthly_fee` (retainer) + `phase2_revenue_pct` (% of attributable growth)
  - Dashboard Revenue section shows active Phase 2 MRR (sum of all monthly fees)
  - Team can track: which clients are in Phase 2, estimated annual contract value (ACV)

#### Cost Visibility in Portal
- **Work Plan Costs** table shown to prospect:
  - Description of each cost item (e.g., "Market research", "Workshop facilitation", "Deliverable production")
  - Cost per item (determined by agents during scoping)
  - Subtotal before approval
  - Status: pending approval → approved
  - Once all costs approved, work plan moves to "in_progress"

---

### Step 6: Ongoing Relationship

**In Baawa's CRM:**
- **Client Notes** — Alex adds observations ("Great market instinct", "Needs clarity on pricing strategy")
  - AI auto-analyzes sentiment (positive/neutral/negative) + risk flags
  - Activity log auto-logs: "Note added", "Deliverable accepted", "Proposal approved"
- **Pipeline Stage** — Alex drags client card between Kanban columns: Phase 1 → Phase 2 → Churned
- **Deliverables** — Track completion, toggle "portal_visible" to show client milestone summaries
- **Activity Feed** — Full log of all events (emails sent, calls scheduled, agreements signed)

---

### Step 7: Revenue Dashboard

Alex opens **Revenue Overview**:
- **Phase 1 Revenue** — total value of active Phase 1 engagements
- **Active MRR** — sum of all `phase2_monthly_fee` for clients in Phase 2
- **Pipeline Value** — projected value of Phase 2 for Phase 1 clients (based on conversion assumptions)
- **Client Table** — sortable: founder, company, stage, phase1_fee, phase2_monthly_fee, start_date, ARR (annual recurring)

---

### Key Value Props for Prospects

| What | Why It Matters |
|---|---|
| **Assessment is conversational, not a form** | Feels like being heard by someone who understands their challenges |
| **Score + breakdown transparent** | Clear, tangible feedback on strengths and gaps |
| **Private portal with messaging** | Direct relationship; can ask questions asynchronously |
| **Work plans + deliverables tracked** | Clear milestones and accountability |
| **Proposals & agreements signed digitally** | Professional, frictionless (no back-and-forth on email) |
| **Revenue-based pricing option** | Agency has skin in the game; aligned incentives |

---

### Key Value Props for the Agency (Alex)

| What | Why It Matters |
|---|---|
| **Pre-qualified leads** | AI assessment filters tire-kickers; only engaged founders make it to portal |
| **Structured assessment data** | Can segment by problem domain, revenue potential, mindset fit |
| **Client portal reduces friction** | No back-and-forth emails; everything in one place |
| **Deliverables tracked** | Accountability; easier to upsell Phase 2 when Phase 1 outputs are visible |
| **Revenue dashboard** | See at a glance: Phase 1 billings vs Phase 2 MRR; pipeline health |
| **Email sequences + notifications** | Automated engagement (no manual follow-up needed) |
| **AI optimizer** — weekly proposal for config changes | Continuously improve funnel based on data |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite → Vercel |
| Backend | Node.js + Express + TypeScript → Railway |
| Database | PostgreSQL + pgvector extension (Railway) |
| Primary LLM | Anthropic Claude (model configurable via `CLAUDE_MODEL` env) |
| LLM Fallback | Claude → Gemini → Groq (automatic, via `llm-provider.ts`) |
| Embeddings | Google AI (Gemini, 768-dim) |
| Voice | Groq Whisper (Gemini fallback) |
| Email | Resend |

**Project root:** `C:\Users\G15\baawa-mehram`  
**Monorepo structure:** `client/` (React), `server/` (Express), `knowledge-base/` (RS .md files)

---

## Directory Structure

### client/src
```
App.tsx                          # All React Router routes
hooks/
  useSession.ts                  # Session state for assessment funnel
  useStructuredSession.ts        # Structured 8Q session variant
  useVoiceRecorder.ts            # MediaRecorder + Whisper integration
lib/
  analytics.ts
  api.ts                         # Admin API calls
  portalApi.ts                   # Portal (prospect) API calls
components/
  Assessment/
    AssessmentShell.tsx          # Assessment state machine
    QuestionCard.tsx / QuestionShell.tsx
    QuestionTypes/               # MCQ, OpenText, Ranking, Slider
    VoiceInput.tsx               # Mic → Whisper → textarea
    GenieCharacter.tsx           # Animated guide character
  CosmicJourney/                 # Three.js intro animation
    SolarSystem.tsx / EarthZoom.tsx / LocationReveal.tsx
  Dashboard/                     # Admin CRM
    SubmissionList.tsx / SubmissionDetail.tsx
    Pipeline.tsx                 # Kanban
    ClientsPage.tsx / ClientDetail.tsx
    ClientDashboard/             # Per-client tabs
      OverviewTab / ProfileTab / AssessmentTab / TasksTab /
      WorkPlansTab / AgreementsTab / EngagementsTab / index
    Intelligence.tsx             # Funnel analytics + optimizer + Sentinel
    KnowledgeBase.tsx
    MarketingDashboard.tsx       # Email templates, sequences, A/B tests
    RevenueOverview.tsx
    CommandCenter.tsx            # Live market data
    FunnelAnalytics.tsx
    ActivityFeed.tsx / ClientNotes.tsx / DeliverablesTracker.tsx
    ThemeContext.tsx
  Portal/                        # Prospect-facing portal
    Login.tsx                    # OTP login
    Results.tsx                  # Score reveal
    ClientDashboard/             # Same tab structure as admin
    MessagesPanel.tsx / PortalCall.tsx / PortalDeliverables.tsx
    PortalInsights.tsx / PortalProposal.tsx
  LandingPage / OnboardingIntro / EmailCapture / ThankYou
```

### server/src
```
index.ts                         # Express app, route mounting, startup migrations, cron
db/
  client.ts                      # PostgreSQL connection pool
  schema.sql                     # Canonical DB schema
  migrate.ts                     # Startup migration runner
  seeds/journeyConfigV1.ts       # Initial journey config seed
middleware/
  auth.ts                        # requireAuth (FOUNDER_API_KEY)
  portalAuth.ts                  # requirePortalAuth (JWT cookie)
routes/
  sessions.ts assessments.ts clients.ts deliverables.ts
  portal.ts proposals.ts calls.ts
  journey.ts marketing.ts knowledge.ts
  voice.ts geo.ts market.ts ingestion.ts
  workplans.ts workplantasks.ts workplancosts.ts
  debug.ts
services/
  llm-provider.ts                # Multi-provider LLM client (Claude→Gemini→Groq)
  questioning.ts                 # 8-question QUESTION_BANK definition
  scoring.ts                     # 0–100 AI scoring + breakdown
  rag.ts                         # pgvector cosine similarity retrieval
  knowledge.ts                   # Ingest, chunk, embed, manage knowledge base
  email.ts                       # Low-level Resend wrappers (8 email types)
  emailScheduler.ts              # Cron-based timed email sequences
  emailService.ts                # Template renderer + variable substitution
  activity.ts                    # Activity log writer
  classification.ts              # Problem domain classification from conversation
  deferEmail.ts                  # AI-generated defer/rejection email
  drafting.ts                    # AI deliverable content drafting via RAG
  geo.ts                         # ip-api.com geolocation
  ingestion.ts                   # Full scrape → embed → upsert pipeline
  journeyConfig.ts               # Active journey config loader + cache
  journeyOptimizer.ts            # Weekly AI funnel optimizer
  marketData.ts                  # Finnhub / FRED / Guardian live data
  noteAnalysis.ts                # AI sentiment + risk flag on client notes
  scraper.ts                     # Web article scraper
  sentinelAgent.ts               # AI agent: friction/optimization/anomaly proposals
scripts/
  backfill-identity.ts / backfillAnalytics.ts / runOptimizer.ts
```

---

## Authentication Model

| Route group | Auth mechanism |
|---|---|
| Public (sessions, portal login, geo, voice) | None |
| Admin dashboard + API | `Authorization: Bearer <FOUNDER_API_KEY>` header |
| Prospect portal | `portal_token` httpOnly cookie OR Authorization header (7-day signed JWT) |

---

## All API Routes

### Sessions (public)
| Method | Path | Description |
|---|---|---|
| POST | `/api/sessions/start` | Create session, geolocate IP, return Q1 |
| POST | `/api/sessions/:id/answer` | Submit structured answer, receive next question |
| POST | `/api/sessions/:id/complete` | Submit email → AI score → create assessment → fire emails |

### Assessments (admin auth)
| Method | Path | Description |
|---|---|---|
| GET | `/api/assessments` | List all; supports `?q`, `?limit`, `?offset` |
| GET | `/api/assessments/:id` | Single assessment with full conversation |
| POST | `/api/assessments/:id/review` | Mark as 'reviewing' |
| POST | `/api/assessments/:id/rescore` | Re-run AI scoring |
| POST | `/api/assessments/:id/onboard` | Accept → create client → send onboard email |
| POST | `/api/assessments/:id/defer` | AI defer email → send → mark deferred |
| PUT | `/api/assessments/:id/notes` | Update founder internal notes |
| POST | `/api/assessments/:id/unlock-results` | Make score/summary visible in portal |
| POST | `/api/assessments/:id/message` | Send team → prospect message |
| GET | `/api/assessments/:id/messages` | Full portal message thread (admin view) |
| PUT | `/api/assessments/:id/identity` | Update founder_name + company_name (propagates to client) |
| GET | `/api/assessments/:id/analytics` | Get session_analytics row |
| POST | `/api/assessments/:id/sentinel` | Trigger Sentinel AI discovery |
| GET | `/api/assessments/:id/sentinel/proposals` | Get Sentinel proposals |
| GET | `/api/assessments/sentinel/proposals/all` | All open Sentinel proposals |
| PATCH | `/api/assessments/sentinel/:id/status` | Update Sentinel proposal status |

### Clients (admin auth)
| Method | Path | Description |
|---|---|---|
| GET | `/api/clients` | List; supports `?q`, `?showArchived` |
| GET | `/api/clients/:id` | Client with deliverables, notes, activities |
| PUT | `/api/clients/:id` | Update stage, fees, contact info |
| POST | `/api/clients/:id/notes` | Add note → auto AI sentiment analysis |
| POST | `/api/clients/:id/deliverables` | Create deliverable |
| DELETE | `/api/clients/:id` | Soft-archive client |

### Deliverables (admin auth)
| Method | Path | Description |
|---|---|---|
| PUT | `/api/deliverables/:id` | Update status (pending/in_progress/completed) |
| PUT | `/api/deliverables/:id/visibility` | Toggle `portal_visible` flag |
| POST | `/api/deliverables/:id/draft` | AI-draft content via RAG |
| POST | `/api/deliverables/:id/upload` | Upload file → stored as BYTEA in DB |
| GET | `/api/deliverables/:id/file` | Serve file from DB |

### Portal (prospect JWT auth)
| Method | Path | Description |
|---|---|---|
| POST | `/api/portal/login` | Request OTP for email |
| POST | `/api/portal/verify` | Verify 6-digit OTP → receive JWT |
| GET | `/api/portal/me` | Own assessment (score gated by `results_unlocked`) |
| GET | `/api/portal/messages` | Message thread (prospect view) |
| GET | `/api/portal/assessments` | All submissions for this email |
| POST | `/api/portal/switch` | Switch active assessment JWT |
| POST | `/api/portal/messages` | Prospect → team message |
| GET | `/api/portal/call` | Proposed call slots |
| PUT | `/api/portal/call/:id/select` | Book a call slot → confirmation emails |
| GET | `/api/portal/proposal` | Latest sent proposal |
| PUT | `/api/portal/proposal/:id/approve` | Approve proposal |
| PUT | `/api/portal/proposal/:id/reject` | Reject proposal |
| GET | `/api/portal/agreement/:proposalId` | Get agreement |
| POST | `/api/portal/agreement/:proposalId/sign` | Sign agreement (IP + timestamp) |
| GET | `/api/portal/deliverables` | Portal-visible deliverables |
| POST | `/api/portal/deliverables/:id/accept` | Formally accept a deliverable |
| GET | `/api/portal/insights` | Curated knowledge base content |
| GET | `/api/portal/deliverables/:id/file` | Download deliverable file |

### Calls (admin auth)
| Method | Path | Description |
|---|---|---|
| POST | `/api/calls` | Create/upsert proposed call slots |
| GET | `/api/calls/:assessmentId` | Get call slot |
| PUT | `/api/calls/:id/complete` | Mark call completed |

### Proposals (admin auth)
| Method | Path | Description |
|---|---|---|
| POST | `/api/proposals` | Create proposal with packages |
| GET | `/api/proposals/assessment/:assessmentId` | List proposals |
| PUT | `/api/proposals/:id/send` | Push to prospect portal |
| DELETE | `/api/proposals/:id` | Delete proposal |

### Work Plans (admin auth)
| Method | Path | Description |
|---|---|---|
| POST | `/api/work-plans` | Create work plan for a client |
| GET | `/api/work-plans/:client_id` | All work plans for client |
| GET | `/api/work-plans/:id/detail` | Plan with tasks and costs |
| PUT | `/api/work-plans/:id` | Update status/approvals |
| POST/GET/PUT | `/api/work-plan-tasks` | CRUD tasks |
| POST/GET/PUT/DELETE | `/api/work-plan-costs` | CRUD + approve cost items |

### Journey / Funnel Intelligence (admin auth)
| Method | Path | Description |
|---|---|---|
| GET | `/api/journey/intro` | **Public** — active intro_messages for landing page |
| POST | `/api/journey/optimize` | Manually trigger Journey Optimizer |
| GET/POST | `/api/journey/config` | List configs / activate/dismiss |
| GET | `/api/journey/metrics` | Funnel metrics (30/60/90d) |
| GET | `/api/journey/funnel` | Per-step funnel from events JSONB |
| GET | `/api/journey/suggestions` | Smart actionable suggestions |

### Marketing / Email (admin auth)
| Method | Path | Description |
|---|---|---|
| GET | `/api/marketing/stats` | Funnel stats + email queue activity |
| GET/PUT/POST | `/api/marketing/templates/:type` | CRUD email templates |
| GET/PUT | `/api/marketing/sequences/:type` | Email sequence config |
| GET/POST/PUT/DELETE | `/api/marketing/ab-tests` | A/B test management |
| POST | `/api/marketing/ab-tests/:id/declare-winner` | Declare winner → optionally apply to template |

### Knowledge Base (admin auth)
| Method | Path | Description |
|---|---|---|
| GET | `/api/knowledge` | List all sources |
| POST | `/api/knowledge` | Upload + ingest .md or .pdf |
| POST | `/api/knowledge/url` | Scrape + ingest URL |
| PUT | `/api/knowledge/:sourceName` | Toggle active/inactive |
| DELETE | `/api/knowledge/:sourceName` | Delete all chunks for source |

### Misc
| Method | Path | Description |
|---|---|---|
| POST | `/api/voice/transcribe` | Transcribe audio (Groq Whisper → Gemini fallback) |
| GET | `/api/geo` | Geolocate requesting IP (public) |
| GET | `/api/market-data` | Live market data (cached) |
| POST | `/api/admin/ingest` | Kick off background knowledge ingestion |
| GET | `/api/admin/ingest/status` | Ingestion progress |
| GET | `/health` | Health check |

---

## Database Schema

### Core Tables

**sessions**
```sql
id UUID PK | ip_address | city | country | lat | lon
conversation JSONB | question_count INT | status VARCHAR ('active'|'completed')
journey_config_version INT | name | region | language | email | created_at
```

**assessments**
```sql
id SERIAL PK | session_id UUID FK | email VARCHAR | phone
city | country | conversation JSONB | score INT (0–100)
score_breakdown JSONB {pmf,validation,growth,mindset,revenue}
score_summary TEXT | biggest_opportunity TEXT | biggest_risk TEXT
founder_name | company_name | status VARCHAR ('pending'|'reviewing'|'onboarded'|'deferred')
founder_notes TEXT | results_unlocked BOOLEAN | problem_domains JSONB
founder_archetype VARCHAR | engagement_pulse VARCHAR | created_at | updated_at
```
> Note: email is NOT unique — supports multiple submissions per prospect.

**clients**
```sql
id SERIAL PK | assessment_id INT FK | founder_name | company_name
email | phone | website | stage VARCHAR ('phase1'|'phase2'|'churned')
phase1_fee DECIMAL | phase2_monthly_fee DECIMAL | phase2_revenue_pct DECIMAL
start_date DATE | archived BOOLEAN | created_at | updated_at
```

**deliverables**
```sql
id SERIAL PK | client_id INT FK | title | description | content TEXT
status VARCHAR ('pending'|'in_progress'|'completed') | due_date DATE
completed_at | file_url | file_data BYTEA | file_name | file_mime
milestone_order INT | portal_visible BOOLEAN | accepted_at | accepted_by
research_context TEXT | created_at
```

**client_notes**
```sql
id | client_id FK | content TEXT | sentiment VARCHAR ('positive'|'neutral'|'negative')
ai_summary TEXT | risk_flag BOOLEAN | created_at
```

**activities**
```sql
id | client_id FK | type VARCHAR | description TEXT | created_at
```

### Portal Tables

**portal_tokens** — 6-digit OTP, 15-min TTL  
**portal_messages** — sender: 'team'|'prospect', body, assessment_id FK

### Email Tables

**email_queue** — pending/sent/failed, ab_variant, assessment_id FK  
**email_templates** — per email_type, html_body, subject, is_default  
**email_sequence_config** — per email_type, enabled BOOLEAN, delay_hours  
**email_ab_tests** — variant_name, traffic_split, active (unique per type), winner

### Sales Tables

**call_slots** — assessment_id FK (UNIQUE), proposed_slots JSONB, selected_slot, meeting_link, status  
**proposals** — assessment_id FK, packages JSONB, total_price, currency, status ('draft'|'sent'|'approved'|'rejected')  
**agreements** — proposal_id FK (UNIQUE), signed_name, signed_at, signed_ip, status ('draft'|'signed')

### Intelligence Tables

**journey_config** — version INT, status ('proposed'|'active'|'archived'|'dismissed'), system_prompt, intro_messages JSONB, scoring_weights JSONB, risk_level, reasoning, metrics_snapshot  
**session_analytics** — per session: completed, question_count, avg_answer_words, drop_off_at_question, events JSONB, last_input_method  
**sentinel_proposals** — type ('friction'|'optimization'|'anomaly'), observation, proposal, behavioral_frame, status ('open'|'implemented'|'archived')

### Work Plan Tables

**work_plans** — client_id FK, assessment_id FK, title, markdown_source, status ('draft'|'awaiting_approval'|'costs_pending'|'costs_approved'|'in_progress'|'complete'), total_cost  
**work_plan_tasks** — work_plan_id FK, title, status, assigned_to, due_date, estimated_hours, cost, progress_percent  
**work_plan_costs** — work_plan_id FK, description, amount, category, approved BOOLEAN

### Knowledge Table

**knowledge_chunks** — content TEXT, embedding vector(768), source_name, is_active, source_url, category, tags JSONB

---

## Key Services — What They Do

| Service | File | Summary |
|---|---|---|
| LLM Client | `llm-provider.ts` | Multi-provider with auto fallback Claude→Gemini→Groq; two chains: 'assessment' and 'optimizer' |
| Question Bank | `questioning.ts` | Defines 8 structured questions (MCQ, open text, slider, ranking); `getQuestion(index)` |
| Scoring | `scoring.ts` | Scores 0–100; returns pmf/validation/growth/mindset/revenue breakdown + archetype |
| RAG | `rag.ts` | pgvector cosine similarity retrieval; Google AI for query embedding |
| Knowledge | `knowledge.ts` | Ingest .md/.pdf/URLs; chunk, embed (Google AI), upsert chunks |
| Email | `email.ts` | Resend wrappers: 8 distinct email types (ACK, notify, onboard, defer, OTP, message, call confirm, optimizer alert) |
| Email Scheduler | `emailScheduler.ts` | Cron-based; fires 8-email timed sequence post-completion (0h, 12h, 18h, 24h, 36h, 168h, pre_call, post_call) |
| Activity | `activity.ts` | Non-blocking activity log writer; also resolves client by assessment_id |
| Classification | `classification.ts` | LLM classifies conversation → problem_domains (e.g. "go-to-market", "hiring") |
| Defer Email | `deferEmail.ts` | LLM generates personalized rejection email from conversation |
| Drafting | `drafting.ts` | LLM + RAG drafts deliverable content |
| Note Analysis | `noteAnalysis.ts` | LLM: sentiment + ai_summary + risk_flag on client notes |
| Journey Config | `journeyConfig.ts` | Loads + caches active `journey_config` from DB |
| Journey Optimizer | `journeyOptimizer.ts` | Weekly cron: analyzes metrics → proposes new config → emails founder |
| Sentinel | `sentinelAgent.ts` | AI agent: friction/optimization/anomaly proposals from session data |
| Geo | `geo.ts` | ip-api.com → city, country, lat, lon |
| Market Data | `marketData.ts` | Finnhub + FRED + Guardian; cached |
| Ingestion | `ingestion.ts` | Scrape → chunk → embed → upsert pipeline |
| Scraper | `scraper.ts` | Scrapes configured RSS/article sources |

---

## Assessment Funnel Flow

```
splash
  → assessment (8 structured questions: MCQ, open text, slider, ranking)
  → complete
  → email capture (POST /api/sessions/:id/complete → AI score → emails fire)
  → submitted
  → thankyou
```

Voice input on all text questions: mic → Groq Whisper → transcript → textarea (editable).

---

## Prospect Portal Flow

1. **Login** — enter email → OTP sent → verify → JWT cookie (7-day)
2. **Overview** — status summary
3. **Assessment** — score/summary revealed once `results_unlocked = true` (admin action)
4. **Engagements** — 2-way messaging with team
5. **Work Plans** — approve work plans
6. **Agreements** — view and digitally sign proposals
7. **Tasks / Deliverables** — accept deliverables; download files
8. **Insights** — curated knowledge base content

---

## Admin Dashboard Sections

1. **Submissions** — list by score, triage (review/onboard/defer), full conversation view
2. **Pipeline** — Kanban: Phase 1 → Phase 2 → Churned
3. **Clients** — CRM list + per-client tabs (Overview, Profile, Assessment, Tasks, Work Plans, Agreements, Engagements, Deliverables)
4. **Intelligence** — funnel analytics, journey optimizer proposals, Sentinel proposals, actionable suggestions
5. **Knowledge Base** — ingest/manage sources
6. **Marketing** — email templates, sequence config, A/B tests, send stats
7. **Revenue** — fee/MRR overview
8. **Command Center** — live market data (stocks, macro, news)

---

## Email Sequences

8-email timed sequence after assessment completion:

| Type | Delay |
|---|---|
| confirmation | 0h (immediate) |
| value_reminder | 12h |
| social_proof | 18h |
| objection_handler | 24h |
| last_touch | 36h |
| reengagement | 168h (1 week) |
| pre_call | 24h before call |
| post_call | 1h after call |

Each has a DB template (html_body + subject) with variable substitution. A/B testing supported per type.

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL with pgvector |
| `RESEND_API_KEY` | Outbound email |
| `PORTAL_JWT_SECRET` | Signs portal JWTs |
| `ANTHROPIC_API_KEY` | Claude LLM |
| `GOOGLE_AI_API_KEY` | Gemini embeddings + fallback |
| `GROQ_API_KEY` | Whisper + Groq fallback |
| `FOUNDER_API_KEY` | Admin auth |
| `PORT` | Express port (default 3001) |
| `CLAUDE_MODEL` | Model ID (default: `claude-haiku-4-5-20251001`) |
| `CLIENT_URL` | Frontend URL (CORS) |
| `EMAIL_FROM` | Outbound email from address |
| `FOUNDER_EMAIL` | Receives lead notifications |
| `DASHBOARD_URL` | Used in email links |
| `VITE_API_URL` | Backend URL (client-side) |
| `FINNHUB_API_KEY` | Stock data |
| `FRED_API_KEY` | Macro data |
| `GUARDIAN_API_KEY` | News headlines |
| `GEMINI_ASSESSMENT_MODEL` | Gemini fallback for assessment |
| `GEMINI_OPTIMIZER_MODEL` | Gemini fallback for optimizer |
| `GROQ_ASSESSMENT_MODEL` | Groq fallback for assessment |
| `GROQ_OPTIMIZER_MODEL` | Groq fallback for optimizer |

---

## Deployment

| Component | Platform | Root dir |
|---|---|---|
| Frontend | Vercel | `client/` |
| Backend | Railway | `server/` (Dockerfile) |
| Database | Railway PostgreSQL | pgvector required |

- **Startup**: `server/src/index.ts` runs all migrations on boot before accepting traffic
- **Cron**: Journey Optimizer runs every Sunday midnight; email scheduler runs continuously on startup
- **File storage**: Deliverable files stored as BYTEA in DB (no S3 dependency)

---

## Key Architectural Decisions

1. **Email is NOT unique on assessments** — supports multiple submissions per prospect (intentional)
2. **LLM fallback chain** — all AI calls auto-fallback Claude→Gemini→Groq; `AllProvidersFailedError` if all fail
3. **Files in DB** — BYTEA storage in PostgreSQL (Railway-friendly, no external storage)
4. **Portal auth** — httpOnly JWT cookie (7d) + 6-digit OTP (15-min TTL)
5. **Journey Optimizer** — auto-activates "low risk" config changes; emails founder for "high risk" changes
6. **Sentinel AI** — passive observer; admin reviews proposals before implementing
7. **Knowledge base** — dual use: full text in LLM system prompt + pgvector RAG for retrieval
8. **Session analytics** — non-blocking; updated on every answer submission via background write

---

## Critical File Paths

| File | Purpose |
|---|---|
| `server/src/db/schema.sql` | Canonical DB schema |
| `server/src/index.ts` | Entry point: route mounting, migrations, cron |
| `server/src/services/llm-provider.ts` | All LLM calls go through here |
| `server/src/services/questioning.ts` | 8-question bank definition |
| `server/src/services/email.ts` | All outbound email functions |
| `server/src/services/emailScheduler.ts` | Timed email sequence cron |
| `server/src/routes/portal.ts` | Full prospect portal API |
| `server/src/routes/assessments.ts` | Assessment triage + messaging |
| `client/src/App.tsx` | All React routes |
| `client/src/lib/api.ts` | Admin API client |
| `client/src/lib/portalApi.ts` | Portal API client |
| `.env.example` | All env vars with descriptions |
| `AGENTS.md` | Architectural decisions + dev notes |
