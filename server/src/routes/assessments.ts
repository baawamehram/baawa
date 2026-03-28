import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { db } from '../db/client'
import { generateDeferEmail } from '../services/deferEmail'
import { sendOnboardEmail, sendDeferEmail, sendMessageNotification } from '../services/email'
import { ConversationTurn } from '../services/questioning'
import { conductDiscovery, getAllOpenFindings, getSessionFindings } from '../services/sentinelAgent'
import { scoreConversation } from '../services/scoring'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.use(requireAuth)

// GET /api/assessments — list all, sorted by score desc
router.get('/', async (req: Request, res: Response) => {
  try {
    const { q, limit = 50, offset = 0 } = req.query
    const values: any[] = []
    let whereClause = '1=1'

    if (q) {
      values.push(`%${q}%`)
      whereClause += ` AND (email ILIKE $1 OR founder_name ILIKE $1 OR company_name ILIKE $1)`
    }

    const result = await db.query(
      `SELECT id, email, score, score_breakdown, score_summary, biggest_opportunity, biggest_risk, status, city, country, created_at, founder_name, company_name
       FROM assessments
       WHERE ${whereClause}
       ORDER BY score DESC NULLS LAST, created_at DESC
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset]
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

// POST /api/assessments/:id/review — mark as reviewing (Gap 7)
// Front-end should call this when the detail page is opened
router.post('/:id/review', async (req: Request, res: Response) => {
  try {
    const result = await db.query<{ status: string }>(
      'SELECT status FROM assessments WHERE id = $1',
      [req.params.id]
    )
    if (result.rows[0]?.status === 'pending') {
      await db.query(
        "UPDATE assessments SET status = 'reviewing', updated_at = NOW() WHERE id = $1",
        [req.params.id]
      )
    }
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' })
  }
})

// POST /api/assessments/:id/rescore — re-run scoring (Gap 11)
router.post('/:id/rescore', async (req: Request, res: Response) => {
  try {
    const result = await db.query<{ conversation: ConversationTurn[] }>(
      'SELECT conversation FROM assessments WHERE id = $1',
      [req.params.id]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' })

    const scoreResult = await scoreConversation(result.rows[0].conversation)

    await db.query(
      `UPDATE assessments SET
        score = $1,
        score_breakdown = $2,
        score_summary = $3,
        biggest_opportunity = $4,
        biggest_risk = $5,
        founder_archetype = $6,
        engagement_pulse = $7,
        updated_at = NOW()
       WHERE id = $8`,
      [
        scoreResult.score,
        JSON.stringify(scoreResult.breakdown),
        scoreResult.summary,
        scoreResult.biggest_opportunity,
        scoreResult.biggest_risk,
        scoreResult.founder_archetype || null,
        scoreResult.engagement_pulse || null,
        req.params.id,
      ]
    )

    res.json({ ok: true, scoreResult })
  } catch (err) {
    console.error('POST /assessments/:id/rescore error:', err)
    res.status(500).json({ error: 'Failed to re-score' })
  }
})

// POST /api/assessments/:id/onboard — mark as onboarded, send email, create client
router.post('/:id/onboard', async (req: Request, res: Response) => {
  try {
    const result = await db.query<{ email: string; status: string; founder_name: string; company_name: string }>(
      'SELECT email, status, founder_name, company_name FROM assessments WHERE id = $1',
      [req.params.id]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' })
    const assessment = result.rows[0]

    if (!['pending', 'reviewing'].includes(assessment.status)) {
      return res.status(400).json({ error: 'Assessment already processed' })
    }

    await db.query(
      `UPDATE assessments SET status = 'onboarded', updated_at = NOW() WHERE id = $1`,
      [req.params.id]
    )

    // Create client record
    const clientResult = await db.query<{ id: number }>(
      `INSERT INTO clients (assessment_id, email, founder_name, company_name) VALUES ($1, $2, $3, $4) RETURNING id`,
      [req.params.id, assessment.email, assessment.founder_name, assessment.company_name]
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
    const result = await db.query<{ email: string; status: string; conversation: ConversationTurn[] }>(
      'SELECT email, status, conversation FROM assessments WHERE id = $1',
      [req.params.id]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' })
    const assessment = result.rows[0]

    if (!['pending', 'reviewing'].includes(assessment.status)) {
      return res.status(400).json({ error: 'Assessment already processed' })
    }

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

// POST /api/assessments/:id/unlock-results — make score/feedback visible to prospect
router.post('/:id/unlock-results', async (req: Request, res: Response) => {
  try {
    const result = await db.query<{ id: number }>(
      `UPDATE assessments SET results_unlocked = true, updated_at = NOW() WHERE id = $1 RETURNING id`,
      [req.params.id]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' })
    res.json({ ok: true })
  } catch (err) {
    console.error('POST /assessments/:id/unlock-results error:', err)
    res.status(500).json({ error: 'Failed to unlock results' })
  }
})

// POST /api/assessments/:id/message — send a message from the team to the prospect
router.post('/:id/message', async (req: Request, res: Response) => {
  try {
    const parsed = z.object({ body: z.string().trim().min(1).max(2000) }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Invalid message' })

    const assessmentResult = await db.query<{ email: string }>(
      `SELECT email FROM assessments WHERE id = $1`,
      [req.params.id]
    )
    if (!assessmentResult.rows[0]) return res.status(404).json({ error: 'Not found' })

    await db.query(
      `INSERT INTO portal_messages (assessment_id, sender, body) VALUES ($1, 'team', $2)`,
      [req.params.id, parsed.data.body]
    )

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173'
    void sendMessageNotification(assessmentResult.rows[0].email, `${frontendUrl}/portal/login`)
      .catch((e) => console.error('sendMessageNotification failed:', e))

    res.json({ ok: true })
  } catch (err) {
    console.error('POST /assessments/:id/message error:', err)
    res.status(500).json({ error: 'Failed to send message' })
  }
})

// GET /api/assessments/:id/messages — admin view of portal message thread
router.get('/:id/messages', async (req: Request, res: Response) => {
  try {
    const result = await db.query(
      `SELECT id, sender, body, created_at FROM portal_messages WHERE assessment_id = $1 ORDER BY created_at ASC`,
      [req.params.id]
    )
    res.json(result.rows)
  } catch (err) {
    console.error('GET /assessments/:id/messages error:', err)
    res.status(500).json({ error: 'Failed to load messages' })
  }
})

// PUT /api/assessments/:id/identity — update owner/company names
router.put('/:id/identity', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      founder_name: z.string().optional(),
      company_name: z.string().optional()
    })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Invalid identity' })

    const { founder_name, company_name } = parsed.data

    await db.query(
      `UPDATE assessments SET founder_name = $1, company_name = $2, updated_at = NOW() WHERE id = $3`,
      [founder_name || null, company_name || null, req.params.id]
    )

    // Also update associated client if exists
    await db.query(
      `UPDATE clients SET founder_name = $1, company_name = $2, updated_at = NOW() WHERE assessment_id = $3`,
      [founder_name || null, company_name || null, req.params.id]
    )

    res.json({ ok: true })
  } catch (err) {
    console.error('PUT /assessments/:id/identity error:', err)
    res.status(500).json({ error: 'Failed to update identity' })
  }
})

// GET /api/assessments/:id/analytics — fetch granular engagement metadata
router.get('/:id/analytics', async (req: Request, res: Response) => {
  try {
    const result = await db.query(
      `SELECT sa.*, a.email, a.founder_name, a.company_name
       FROM session_analytics sa
       JOIN assessments a ON a.id = sa.assessment_id
       WHERE a.id = $1`,
      [req.params.id]
    )
    if (!result.rows[0]) {
      // Try fetching by session_id if it's a UUID
      const sessionResult = await db.query(
        `SELECT * FROM session_analytics WHERE session_id = $1`,
        [req.params.id]
      )
      if (!sessionResult.rows[0]) return res.status(404).json({ error: 'Analytics not found' })
      return res.json(sessionResult.rows[0])
    }
    res.json(result.rows[0])
  } catch (err) {
    console.error('GET /assessments/:id/analytics error:', err)
    res.status(500).json({ error: 'Failed to fetch analytics' })
  }
})

// ── Sentinel (Discovery) API ──

router.post('/:id/sentinel', async (req, res) => {
  try {
    const findings = await conductDiscovery(req.params.id)
    res.json({ success: true, count: findings.length, findings })
  } catch (err) {
    console.error('[SENTINEL_DISCOVERY] Error:', err)
    res.status(500).json({ error: 'Discovery failed' })
  }
})

router.get('/:id/sentinel/proposals', async (req, res) => {
  try {
    const findings = await getSessionFindings(req.params.id)
    res.json(findings)
  } catch (err) {
    console.error('[SENTINEL_SESSION_PROPOSALS] Error:', err)
    res.status(500).json({ error: 'Failed to fetch proposals' })
  }
})

router.get('/sentinel/proposals/all', async (_req, res) => {
  try {
    const proposals = await getAllOpenFindings()
    res.json(proposals)
  } catch (err) {
    console.error('[SENTINEL_PROPOSALS] Error:', err)
    res.status(500).json({ error: 'Failed to fetch proposals' })
  }
})

router.patch('/sentinel/:id/status', async (req, res) => {
  const { status } = req.body
  try {
    await db.query('UPDATE sentinel_proposals SET status = $1 WHERE id = $2', [status, req.params.id])
    res.json({ success: true })
  } catch (err) {
    console.error('[SENTINEL_STATUS] Error:', err)
    res.status(500).json({ error: 'Failed to update status' })
  }
})

export default router
