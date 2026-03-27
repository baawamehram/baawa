import 'dotenv/config'
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
  : null
const corsOptions = {
  origin: allowedOrigins ?? '*',
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

    console.log('Startup migrations OK')
  } catch (err) {
    console.error('Startup migration error:', err)
  }

  const PORT = process.env.PORT ?? 3001
  app.listen(PORT, () => console.log(`Server listening on :${PORT}`))
}

void startServer()

export default app
