import 'dotenv/config'
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

const app = express()
app.set('trust proxy', 1)

// Middleware
const CLIENT_URL = process.env.CLIENT_URL
if (!CLIENT_URL && process.env.NODE_ENV === 'production') {
  console.error('FATAL: CLIENT_URL must be set in production')
  process.exit(1)
}
app.use(cors({ origin: CLIENT_URL ?? '*' }))
app.use(rateLimit({ windowMs: 60_000, max: 60 }))
app.use(express.json())

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

const PORT = process.env.PORT ?? 3001
app.listen(PORT, () => console.log(`Server listening on :${PORT}`))

export default app
