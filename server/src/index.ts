import 'dotenv/config'
import cron from 'node-cron'
import { runOptimizer } from './services/journeyOptimizer'
import { V1_INTRO_MESSAGES } from './db/seeds/journeyConfigV1'
import express from 'express'
import cors from 'cors'
import { rateLimit } from 'express-rate-limit'
import { db } from './db/client'
import sessionsRouter from './routes/sessions'
import assessmentsRouter from './routes/assessments'
import knowledgeRouter from './routes/knowledge'
import clientsRouter from './routes/clients'
import deliverablesRouter from './routes/deliverables'
import voiceRouter from './routes/voice'
import geoRouter from './routes/geo'
import marketRouter from './routes/market'
import journeyRouter from './routes/journey'
import cookieParser from 'cookie-parser'
import portalRouter from './routes/portal'
import ingestionRouter from './routes/ingestion'
import debugRouter from './routes/debug'
import callsRouter from './routes/calls'
import proposalsRouter from './routes/proposals'

const app = express()
app.set('trust proxy', 1)

// Middleware
const CLIENT_URL = process.env.CLIENT_URL
if (!CLIENT_URL && process.env.NODE_ENV === 'production') {
  console.error('FATAL: CLIENT_URL must be set in production')
  process.exit(1)
}
const allowedOrigins = CLIENT_URL
  ? Array.from(new Set([
      CLIENT_URL,
      CLIENT_URL.replace(/^https:\/\/www\./, 'https://'),
      CLIENT_URL.replace(/^https:\/\/(?!www\.)/, 'https://www.'),
    ]))
  : ['http://localhost:5173', 'http://localhost:4173']  // dev fallback — wildcard blocks credentialed requests

const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
}
app.use(cors(corsOptions))
app.options('*', cors(corsOptions))
app.use(rateLimit({ windowMs: 60_000, max: 60 }))
app.use(express.json())
app.use(cookieParser())

// Routes
app.use('/api/sessions', sessionsRouter)
app.use('/api/assessments', assessmentsRouter)
app.use('/api/knowledge', knowledgeRouter)
app.use('/api/clients', clientsRouter)
app.use('/api/deliverables', deliverablesRouter)
app.use('/api/voice', voiceRouter)
app.use('/api/geo', geoRouter)
app.use('/api/market-data', marketRouter)
app.use('/api/journey', journeyRouter)
app.use('/api/portal', portalRouter)
app.use('/api/admin/ingest', ingestionRouter)
app.use('/api/admin/debug', debugRouter)
app.use('/api/calls', callsRouter)
app.use('/api/proposals', proposalsRouter)

// Health
app.get('/health', async (_req, res) => {
  try {
    await db.query('SELECT 1')
    res.json({ status: 'ok', db: 'connected' })
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' })
  }
})

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err)
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason)
})

async function startServer() {
  // Run any pending structural migrations before accepting traffic
  try {
    await db.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS journey_config_version INT`)
    await db.query(`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS phone VARCHAR(50)`)
    await db.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS name VARCHAR(255)`)
    await db.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS region VARCHAR(255)`)
    await db.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS language VARCHAR(255)`)
    await db.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS email VARCHAR(255)`)
    // Knowledge base pipeline columns
    await db.query(`ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS source_url TEXT`)
    await db.query(`ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS ingested_at TIMESTAMPTZ DEFAULT NOW()`)
    await db.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_knowledge_url_chunk
      ON knowledge_chunks(source_url, chunk_index)
      WHERE source_url IS NOT NULL
    `)
    await db.query(`
      CREATE TABLE IF NOT EXISTS journey_config (
        id          SERIAL PRIMARY KEY,
        version     INT NOT NULL,
        status      TEXT NOT NULL DEFAULT 'proposed',
        risk_level  TEXT NOT NULL DEFAULT 'low',
        system_prompt      TEXT NOT NULL,
        intro_messages     JSONB NOT NULL DEFAULT '[]',
        scoring_weights    JSONB NOT NULL DEFAULT '{}',
        change_summary     TEXT,
        activated_at       TIMESTAMPTZ,
        created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    await db.query(`
      CREATE TABLE IF NOT EXISTS session_analytics (
        id                     SERIAL PRIMARY KEY,
        session_id             UUID NOT NULL REFERENCES sessions(id),
        journey_config_version INT,
        total_score            INT,
        answer_count           INT,
        avg_answer_length      INT,
        completed              BOOLEAN NOT NULL DEFAULT FALSE,
        created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS session_analytics_session_id ON session_analytics (session_id)`)
    await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS journey_config_one_active ON journey_config ((1)) WHERE status = 'active'`)
    // Keep v1 intro messages current with the codebase
    await db.query(
      `UPDATE journey_config SET intro_messages = $1 WHERE version = 1`,
      [JSON.stringify(V1_INTRO_MESSAGES)]
    )

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

    // Phase 1 — Problem classification
    await db.query(`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS problem_domains JSONB`)
    await db.query(`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS founder_archetype VARCHAR(100)`)
    await db.query(`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS engagement_pulse VARCHAR(100)`)

    // Phase 1.5 — Client archival
    await db.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false`)

    // Phase 2 — Call scheduling
    await db.query(`
      CREATE TABLE IF NOT EXISTS call_slots (
        id             SERIAL PRIMARY KEY,
        assessment_id  INT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE UNIQUE,
        proposed_slots JSONB NOT NULL DEFAULT '[]',
        selected_slot  TIMESTAMPTZ,
        meeting_link   TEXT,
        status         VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    await db.query(`CREATE INDEX IF NOT EXISTS idx_call_slots_assessment ON call_slots (assessment_id)`)

    // Phase 3 — Proposals
    await db.query(`
      CREATE TABLE IF NOT EXISTS proposals (
        id            SERIAL PRIMARY KEY,
        assessment_id INT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
        title         TEXT NOT NULL,
        summary       TEXT,
        packages      JSONB NOT NULL DEFAULT '[]',
        total_price   DECIMAL(10,2),
        currency      VARCHAR(3) NOT NULL DEFAULT 'GBP',
        status        VARCHAR(20) NOT NULL DEFAULT 'draft',
        sent_at       TIMESTAMPTZ,
        approved_at   TIMESTAMPTZ,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    await db.query(`CREATE INDEX IF NOT EXISTS idx_proposals_assessment ON proposals (assessment_id)`)

    // Phase 3 — Agreements (digital signatures)
    await db.query(`
      CREATE TABLE IF NOT EXISTS agreements (
        id                SERIAL PRIMARY KEY,
        proposal_id       INT NOT NULL REFERENCES proposals(id) ON DELETE CASCADE UNIQUE,
        assessment_id     INT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
        signed_name       TEXT,
        signed_at         TIMESTAMPTZ,
        signed_ip         TEXT,
        signed_user_agent TEXT,
        status            VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    // Phase 2 — CRM Intelligence
    await db.query(`ALTER TABLE client_notes ADD COLUMN IF NOT EXISTS sentiment VARCHAR(20)`)
    await db.query(`ALTER TABLE client_notes ADD COLUMN IF NOT EXISTS ai_summary TEXT`)
    await db.query(`ALTER TABLE client_notes ADD COLUMN IF NOT EXISTS risk_flag BOOLEAN DEFAULT false`)
    await db.query(`ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS research_context TEXT`)
    await db.query(`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS founder_archetype VARCHAR(50)`)
    await db.query(`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS engagement_pulse VARCHAR(20) DEFAULT 'neutral'`)

    // Phase 4 — Deliverables portal columns
    await db.query(`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS founder_name VARCHAR(255)`)
    await db.query(`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS company_name VARCHAR(255)`)
    
    await db.query(`ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS portal_visible BOOLEAN NOT NULL DEFAULT false`)
    await db.query(`ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS content TEXT`)
    await db.query(`ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS file_url TEXT`)
    await db.query(`ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ`)
    await db.query(`ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS accepted_by TEXT`)
    await db.query(`ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS milestone_order INT NOT NULL DEFAULT 1`)

    // Performance Indices
    await db.query(`CREATE INDEX IF NOT EXISTS idx_notes_client_id ON client_notes(client_id)`)
    await db.query(`CREATE INDEX IF NOT EXISTS idx_assessments_onboarding ON assessments(email, status)`)

    console.log('Startup migrations + indices OK')
  } catch (err) {
    console.error('Startup migration error:', err)
  }

  // Gap 12: Optimizer Cron — runs every Sunday at midnight
  cron.schedule('0 0 * * 0', async () => {
    console.log('[CRON] Running AI Journey Optimizer...')
    try {
      await runOptimizer()
      console.log('[CRON] Optimizer finished successfully.')
    } catch (err) {
      console.error('[CRON] Optimizer failed:', err)
    }
  })

  const PORT = process.env.PORT ?? 3001
  app.listen(PORT, () => console.log(`Server listening on :${PORT}`))
}

void startServer()

export default app
