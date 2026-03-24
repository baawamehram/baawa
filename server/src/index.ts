import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { rateLimit } from 'express-rate-limit'
import { db } from './db/client'

const app = express()

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL ?? '*' }))
app.use(express.json())
app.use(rateLimit({ windowMs: 60_000, max: 60 }))

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
