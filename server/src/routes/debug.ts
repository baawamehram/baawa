import { Router } from 'express'
import { db } from '../db/client'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.use(requireAuth)

// Populates session_analytics with fake data to test the Intelligence tab
router.post('/seed-analytics', async (_req, res) => {
  try {
    // 1. Clear old test analytics
    await db.query('DELETE FROM session_analytics')

    // 2. Insert 12 fake completed sessions across 30 days
    for (let i = 0; i < 12; i++) {
        // Create a unique session for each analytics record
        const sessionRes = await db.query('INSERT INTO sessions (status) VALUES ($1) RETURNING id', ['completed'])
        const sessionId = sessionRes.rows[0].id
        
        const score = 65 + Math.floor(Math.random() * 25)
        const words = 40 + Math.floor(Math.random() * 40)
        await db.query(
            `INSERT INTO session_analytics 
             (session_id, completed, question_count, avg_answer_words, score, journey_config_version, created_at)
             VALUES ($1, true, 8, $2, $3, 1, NOW() - interval '${i * 2} days')`,
            [sessionId, words, score]
        )
    }

    res.json({ ok: true, message: 'Seeded 12 analytic records for testing.' })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

export default router
