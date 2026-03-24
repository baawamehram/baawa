import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { db } from '../db/client'
import { generateDeferEmail } from '../services/deferEmail'
import { sendOnboardEmail, sendDeferEmail } from '../services/email'
import { ConversationTurn } from '../services/questioning'

const router = Router()

// Auth middleware — Bearer token
function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token || token !== process.env.FOUNDER_API_KEY) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  next()
}

router.use(requireAuth)

// GET /api/assessments — list all, sorted by score desc
router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await db.query(
      `SELECT id, email, score, score_breakdown, score_summary, biggest_opportunity, biggest_risk, status, city, country, created_at
       FROM assessments
       ORDER BY score DESC NULLS LAST, created_at DESC`
    )
    res.json(result.rows)
  } catch (err) {
    console.error('GET /assessments error:', err)
    res.status(500).json({ error: 'Failed to list assessments' })
  }
})

// GET /api/assessments/:id — single assessment with full conversation
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await db.query(
      'SELECT * FROM assessments WHERE id = $1',
      [req.params.id]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' })
    res.json(result.rows[0])
  } catch (err) {
    console.error('GET /assessments/:id error:', err)
    res.status(500).json({ error: 'Failed to get assessment' })
  }
})

// POST /api/assessments/:id/onboard — mark as onboarded, send email, create client
router.post('/:id/onboard', async (req: Request, res: Response) => {
  try {
    const result = await db.query<{ email: string; status: string }>(
      'SELECT email, status FROM assessments WHERE id = $1',
      [req.params.id]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' })
    const assessment = result.rows[0]

    await db.query(
      `UPDATE assessments SET status = 'onboarded', updated_at = NOW() WHERE id = $1`,
      [req.params.id]
    )

    // Create client record
    const clientResult = await db.query<{ id: number }>(
      `INSERT INTO clients (assessment_id, email) VALUES ($1, $2) RETURNING id`,
      [req.params.id, assessment.email]
    )

    await sendOnboardEmail(assessment.email)

    res.json({ clientId: clientResult.rows[0].id })
  } catch (err) {
    console.error('POST /assessments/:id/onboard error:', err)
    res.status(500).json({ error: 'Failed to onboard' })
  }
})

// POST /api/assessments/:id/defer — generate + send defer email, mark deferred
router.post('/:id/defer', async (req: Request, res: Response) => {
  try {
    const result = await db.query<{ email: string; conversation: ConversationTurn[] }>(
      'SELECT email, conversation FROM assessments WHERE id = $1',
      [req.params.id]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' })
    const assessment = result.rows[0]

    const emailBody = await generateDeferEmail(assessment.conversation, assessment.email)
    await sendDeferEmail(assessment.email, emailBody)

    await db.query(
      `UPDATE assessments SET status = 'deferred', updated_at = NOW() WHERE id = $1`,
      [req.params.id]
    )

    res.json({ ok: true })
  } catch (err) {
    console.error('POST /assessments/:id/defer error:', err)
    res.status(500).json({ error: 'Failed to defer' })
  }
})

// PUT /api/assessments/:id/notes — update founder notes
router.put('/:id/notes', async (req: Request, res: Response) => {
  try {
    const parsed = z.object({ notes: z.string() }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Invalid notes' })

    await db.query(
      `UPDATE assessments SET founder_notes = $1, updated_at = NOW() WHERE id = $2`,
      [parsed.data.notes, req.params.id]
    )
    res.json({ ok: true })
  } catch (err) {
    console.error('PUT /assessments/:id/notes error:', err)
    res.status(500).json({ error: 'Failed to update notes' })
  }
})

export default router
