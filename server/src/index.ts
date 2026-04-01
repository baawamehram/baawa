import 'dotenv/config'
import cron from 'node-cron'
import { runOptimizer } from './services/journeyOptimizer'
import { initializeEmailQueue, startEmailScheduler } from './services/emailScheduler'
import { V1_INTRO_MESSAGES, V1_SYSTEM_PROMPT } from './db/seeds/journeyConfigV1'
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
import marketingRouter from './routes/marketing'
import workplansRouter from './routes/workplans'
import workplantasksRouter from './routes/workplantasks'
import workplancostsRouter from './routes/workplancosts'

const app = express()
app.set('trust proxy', 1)

// Middleware
const CLIENT_URL = process.env.CLIENT_URL
if (!CLIENT_URL && process.env.NODE_ENV === 'production') {
  console.error('FATAL: CLIENT_URL must be set in production')
  process.exit(1)
}

const PORTAL_JWT_SECRET = process.env.PORTAL_JWT_SECRET
if (!PORTAL_JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('FATAL: PORTAL_JWT_SECRET must be set in production')
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
app.use('/api/marketing', marketingRouter)
app.use('/api/work-plans', workplansRouter)
app.use('/api/work-plan-tasks', workplantasksRouter)
app.use('/api/work-plan-costs', workplancostsRouter)

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
    // Keep v1 intro messages and system prompt current with the codebase
    await db.query(
      `UPDATE journey_config SET intro_messages = $1, system_prompt = $2 WHERE version = 1`,
      [JSON.stringify(V1_INTRO_MESSAGES), V1_SYSTEM_PROMPT]
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
    // Relax portal token uniqueness (6-digit codes can collide)
    await db.query(`ALTER TABLE portal_tokens DROP CONSTRAINT IF EXISTS portal_tokens_token_key`)
    await db.query(`CREATE INDEX IF NOT EXISTS idx_portal_tokens_token ON portal_tokens (token)`)
    await db.query(`CREATE INDEX IF NOT EXISTS idx_portal_tokens_expires ON portal_tokens (expires_at)`)
    await db.query(`CREATE INDEX IF NOT EXISTS idx_portal_tokens_assessment ON portal_tokens (assessment_id)`)

    // Relax assessment email uniqueness to support multi-submissions as per AGENTS.md
    await db.query(`ALTER TABLE assessments DROP CONSTRAINT IF EXISTS assessments_email_key`)
    
    // Normalize existing emails to lowercase
    await db.query(`UPDATE assessments SET email = LOWER(TRIM(email))`)
    await db.query(`UPDATE clients SET email = LOWER(TRIM(email))`)
    await db.query(`UPDATE sessions SET email = LOWER(TRIM(email)) WHERE email IS NOT NULL`)

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

    // Missing columns causing Dashboard loading failure
    await db.query(`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'pending'`)
    await db.query(`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS city VARCHAR(255)`)
    await db.query(`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS country VARCHAR(255)`)
    await db.query(`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS score_summary TEXT`)
    await db.query(`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS biggest_opportunity TEXT`)
    await db.query(`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS biggest_risk TEXT`)
    await db.query(`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS founder_notes TEXT`)
    
    await db.query(`ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS portal_visible BOOLEAN NOT NULL DEFAULT false`)
    await db.query(`ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS content TEXT`)
    await db.query(`ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS file_url TEXT`)
    await db.query(`ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ`)
    await db.query(`ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS accepted_by TEXT`)
    await db.query(`ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS milestone_order INT NOT NULL DEFAULT 1`)

    // Gaps 5 & Railway Persistence — Persistent File Storage
    await db.query(`ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS file_data BYTEA`)
    await db.query(`ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS file_name TEXT`)
    await db.query(`ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS file_mime TEXT`)

    // Performance Indices
    await db.query(`CREATE INDEX IF NOT EXISTS idx_notes_client_id ON client_notes(client_id)`)
    await db.query(`CREATE INDEX IF NOT EXISTS idx_assessments_onboarding ON assessments(email, status)`)

    // Triple Intelligence Upgrade: Phase 1 Migrations
    await db.query(`ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'general'`)
    await db.query(`ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb`)
    
    // Ensure all session_analytics columns exist for real-time heartbeat
    await db.query(`ALTER TABLE session_analytics ADD COLUMN IF NOT EXISTS question_count INT DEFAULT 0`)
    await db.query(`ALTER TABLE session_analytics ADD COLUMN IF NOT EXISTS avg_answer_words FLOAT`)
    await db.query(`ALTER TABLE session_analytics ADD COLUMN IF NOT EXISTS min_answer_words INT`)
    await db.query(`ALTER TABLE session_analytics ADD COLUMN IF NOT EXISTS max_answer_words INT`)
    await db.query(`ALTER TABLE session_analytics ADD COLUMN IF NOT EXISTS drop_off_at_question INT`)
    await db.query(`ALTER TABLE session_analytics ADD COLUMN IF NOT EXISTS events JSONB DEFAULT '[]'::jsonb`)
    await db.query(`ALTER TABLE session_analytics ADD COLUMN IF NOT EXISTS assessment_id INT REFERENCES assessments(id) ON DELETE CASCADE`)
    await db.query(`ALTER TABLE session_analytics ADD COLUMN IF NOT EXISTS score INT`)
    await db.query(`ALTER TABLE session_analytics ADD COLUMN IF NOT EXISTS score_breakdown JSONB`)
    await db.query(`ALTER TABLE session_analytics ADD COLUMN IF NOT EXISTS last_input_method VARCHAR(20)`)

    // Sentinel Proposals Table (The Brain's Memory)
    await db.query(`
      CREATE TABLE IF NOT EXISTS sentinel_proposals (
        id SERIAL PRIMARY KEY,
        session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        observation TEXT NOT NULL,
        proposal TEXT NOT NULL,
        behavioral_frame VARCHAR(100),
        status VARCHAR(20) DEFAULT 'open',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Email queue for email scheduler
    await db.query(`
      CREATE TABLE IF NOT EXISTS email_queue (
        id SERIAL PRIMARY KEY,
        assessment_id INT REFERENCES assessments(id),
        email_type VARCHAR(100) NOT NULL,
        recipient_email VARCHAR(255) NOT NULL,
        subject VARCHAR(255),
        body TEXT,
        ab_variant VARCHAR(50),
        status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
        sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await db.query(`CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status)`)
    await db.query(`CREATE INDEX IF NOT EXISTS idx_email_queue_assessment ON email_queue(assessment_id)`)
    await db.query(`CREATE INDEX IF NOT EXISTS idx_email_queue_type ON email_queue(email_type)`)

    // Email templates
    await db.query(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id SERIAL PRIMARY KEY,
        email_type VARCHAR(50) NOT NULL UNIQUE,
        subject TEXT NOT NULL,
        html_body TEXT NOT NULL,
        is_default BOOLEAN NOT NULL DEFAULT false,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    // Email sequence configuration
    await db.query(`
      CREATE TABLE IF NOT EXISTS email_sequence_config (
        id SERIAL PRIMARY KEY,
        email_type VARCHAR(50) NOT NULL UNIQUE,
        enabled BOOLEAN NOT NULL DEFAULT true,
        delay_hours NUMERIC(6,2) NOT NULL DEFAULT 12,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    // A/B test configuration
    await db.query(`
      CREATE TABLE IF NOT EXISTS email_ab_tests (
        id SERIAL PRIMARY KEY,
        email_type VARCHAR(50) NOT NULL,
        variant_name VARCHAR(100) NOT NULL,
        subject TEXT NOT NULL,
        html_body TEXT NOT NULL,
        traffic_split NUMERIC(4,3) NOT NULL DEFAULT 0.5,
        active BOOLEAN NOT NULL DEFAULT true,
        winner BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    await db.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_ab_tests_one_active
      ON email_ab_tests(email_type) WHERE active = true
    `)

    // Seed default sequence config (all 8 email types with their hardcoded delays)
    await db.query(`
      INSERT INTO email_sequence_config (email_type, enabled, delay_hours) VALUES
        ('confirmation', true, 0),
        ('value_reminder', true, 12),
        ('social_proof', true, 18),
        ('objection_handler', true, 24),
        ('last_touch', true, 36),
        ('reengagement', true, 168),
        ('pre_call', true, 24),
        ('post_call', true, 1)
      ON CONFLICT (email_type) DO NOTHING
    `)

    // Work plans schema
    await db.query(`
      CREATE TABLE IF NOT EXISTS work_plans (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        markdown_source TEXT,
        status VARCHAR(50) DEFAULT 'draft',
        client_approved_at TIMESTAMPTZ,
        client_approved_by VARCHAR(255),
        costs_approved_at TIMESTAMPTZ,
        costs_approved_by VARCHAR(255),
        total_cost NUMERIC(12, 2),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        created_by VARCHAR(255)
      )
    `)

    await db.query(`
      CREATE TABLE IF NOT EXISTS work_plan_tasks (
        id SERIAL PRIMARY KEY,
        work_plan_id INTEGER NOT NULL REFERENCES work_plans(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        order_index INTEGER,
        status VARCHAR(50) DEFAULT 'not_started',
        assigned_to VARCHAR(255),
        due_date DATE,
        estimated_hours NUMERIC(6, 1),
        actual_hours NUMERIC(6, 1),
        cost NUMERIC(12, 2),
        progress_percent INTEGER DEFAULT 0,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    await db.query(`
      CREATE TABLE IF NOT EXISTS work_plan_costs (
        id SERIAL PRIMARY KEY,
        work_plan_id INTEGER NOT NULL REFERENCES work_plans(id) ON DELETE CASCADE,
        description VARCHAR(255) NOT NULL,
        amount NUMERIC(12, 2) NOT NULL,
        category VARCHAR(100),
        approved BOOLEAN DEFAULT false,
        approved_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    // Work plans indices
    await db.query(`CREATE INDEX IF NOT EXISTS idx_work_plans_client ON work_plans(client_id)`)
    await db.query(`CREATE INDEX IF NOT EXISTS idx_work_plans_status ON work_plans(status)`)
    await db.query(`CREATE INDEX IF NOT EXISTS idx_work_plan_tasks_plan ON work_plan_tasks(work_plan_id)`)
    await db.query(`CREATE INDEX IF NOT EXISTS idx_work_plan_costs_plan ON work_plan_costs(work_plan_id)`)

    console.log('Startup migrations + indices OK')

    // Initialize email queue and start scheduler
    await initializeEmailQueue()
    startEmailScheduler()
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
