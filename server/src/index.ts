import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { rateLimit } from 'express-rate-limit'
import { db } from './db/client'

const app = express()

// Middleware
const CLIENT_URL = process.env.CLIENT_URL
if (!CLIENT_URL && process.env.NODE_ENV === 'production') {
  console.error('FATAL: CLIENT_URL must be set in production')
  process.exit(1)
}
app.use(cors({ origin: CLIENT_URL ?? '*' }))
app.use(rateLimit({ windowMs: 60_000, max: 60 }))
app.use(express.json())

// Health
app.get('/health', async (_req, res) => {
  try {
    await db.query('SELECT 1')
    res.json({ status: 'ok', db: 'connected' })
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' })
  }
})

const PORT = process.env.PORT ?? 3001
app.listen(PORT, () => console.log(`Server listening on :${PORT}`))

export default app
