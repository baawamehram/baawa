import { Router } from 'express'
import { z } from 'zod'
import { db } from '../db/client'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.use(requireAuth)

// GET /api/clients
router.get('/', async (_req, res) => {
  try {
    const result = await db.query(
      `SELECT c.*, a.score, a.score_summary
       FROM clients c
       LEFT JOIN assessments a ON c.assessment_id = a.id
       ORDER BY c.created_at DESC`
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to list clients' })
  }
})

// GET /api/clients/:id
router.get('/:id', async (req, res) => {
  try {
    const [client, deliverables, notes, activities] = await Promise.all([
      db.query('SELECT * FROM clients WHERE id = $1', [req.params.id]),
      db.query('SELECT * FROM deliverables WHERE client_id = $1 ORDER BY created_at', [req.params.id]),
      db.query('SELECT * FROM client_notes WHERE client_id = $1 ORDER BY created_at DESC', [req.params.id]),
      db.query('SELECT * FROM activities WHERE client_id = $1 ORDER BY created_at DESC', [req.params.id]),
    ])
    if (!client.rows[0]) return res.status(404).json({ error: 'Not found' })
    res.json({
      ...client.rows[0],
      deliverables: deliverables.rows,
      notes: notes.rows,
      activities: activities.rows,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to get client' })
  }
})

// PUT /api/clients/:id
router.put('/:id', async (req, res) => {
  try {
    const schema = z.object({
      founder_name: z.string().optional(),
      company_name: z.string().optional(),
      phone: z.string().optional(),
      website: z.string().optional(),
      stage: z.enum(['phase1', 'phase2', 'churned']).optional(),
      phase1_fee: z.number().optional(),
      phase2_monthly_fee: z.number().optional(),
      phase2_revenue_pct: z.number().optional(),
      start_date: z.string().optional(),
    })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Invalid data' })

    const fields = parsed.data
    const keys = Object.keys(fields) as (keyof typeof fields)[]
    if (keys.length === 0) return res.json({ ok: true })

    const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ')
    const values = keys.map((k) => fields[k])
    await db.query(
      `UPDATE clients SET ${setClauses}, updated_at = NOW() WHERE id = $${keys.length + 1}`,
      [...values, req.params.id]
    )

    // Log activity if stage changed
    if (fields.stage) {
      await db.query(
        `INSERT INTO activities (client_id, type, description) VALUES ($1, 'stage_changed', $2)`,
        [req.params.id, `Stage changed to ${fields.stage}`]
      )
    }

    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update client' })
  }
})

// POST /api/clients/:id/notes
router.post('/:id/notes', async (req, res) => {
  try {
    const parsed = z.object({ content: z.string().min(1) }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Invalid note' })

    const result = await db.query<{ id: number }>(
      'INSERT INTO client_notes (client_id, content) VALUES ($1, $2) RETURNING id',
      [req.params.id, parsed.data.content]
    )
    const noteId = result.rows[0].id

    // Auto-analyze in background if long enough
    if (parsed.data.content.length > 20) {
      import('../services/noteAnalysis').then(({ analyzeNote }) => {
        analyzeNote(parsed.data.content).then(async (analysis) => {
          await db.query(
            `UPDATE client_notes 
             SET sentiment = $1, ai_summary = $2, risk_flag = $3 
             WHERE id = $4`,
            [analysis.sentiment, analysis.summary, analysis.risk_flag, noteId]
          )
        }).catch(console.error)
      }).catch(console.error)
    }

    await db.query(
      `INSERT INTO activities (client_id, type, description) VALUES ($1, 'note_added', 'Note added')`,
      [req.params.id]
    )
    res.json({ ok: true, noteId })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to add note' })
  }
})

// POST /api/clients/:id/deliverables
router.post('/:id/deliverables', async (req, res) => {
  try {
    const schema = z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      due_date: z.string().optional(),
    })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Invalid deliverable' })

    const result = await db.query<{ id: number }>(
      'INSERT INTO deliverables (client_id, title, description, due_date) VALUES ($1, $2, $3, $4) RETURNING id',
      [req.params.id, parsed.data.title, parsed.data.description ?? null, parsed.data.due_date ?? null]
    )
    res.json({ id: result.rows[0].id })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to add deliverable' })
  }
})

export default router
