import { Router, type Request, type Response } from 'express'
import { db } from '../db/client'
import { z } from 'zod'

const router = Router()

function requireAdmin(req: Request, res: Response): boolean {
  const key = req.headers.authorization?.replace('Bearer ', '')
  if (!key || key !== process.env.FOUNDER_API_KEY) {
    res.status(401).json({ error: 'Unauthorized' })
    return false
  }
  return true
}

// POST /api/calls — admin proposes call slots for an assessment
router.post('/', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return
  try {
    const parsed = z.object({
      assessment_id: z.number(),
      proposed_slots: z.array(z.object({ datetime: z.string(), label: z.string() })).min(1).max(5),
      meeting_link: z.string().optional(),
    }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

    const { assessment_id, proposed_slots, meeting_link } = parsed.data

    // Upsert — one call slot record per assessment
    const result = await db.query<{ id: number }>(
      `INSERT INTO call_slots (assessment_id, proposed_slots, meeting_link, status)
       VALUES ($1, $2, $3, 'pending')
       ON CONFLICT (assessment_id) DO UPDATE
         SET proposed_slots = EXCLUDED.proposed_slots,
             meeting_link = EXCLUDED.meeting_link,
             status = 'pending',
             selected_slot = NULL
       RETURNING id`,
      [assessment_id, JSON.stringify(proposed_slots), meeting_link ?? null]
    )
    res.json({ id: result.rows[0].id })
  } catch (err) {
    console.error('POST /calls error:', err)
    res.status(500).json({ error: 'Failed to create call slots' })
  }
})

// GET /api/calls/:assessmentId — get call for an assessment (admin)
router.get('/:assessmentId', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return
  try {
    const result = await db.query(
      `SELECT * FROM call_slots WHERE assessment_id = $1`,
      [req.params.assessmentId]
    )
    res.json(result.rows[0] ?? null)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch call slot' })
  }
})

// PUT /api/calls/:id/complete — admin marks call as done
router.put('/:id/complete', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return
  try {
    await db.query(
      `UPDATE call_slots SET status = 'completed' WHERE id = $1`,
      [req.params.id]
    )
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to update call status' })
  }
})

export default router
