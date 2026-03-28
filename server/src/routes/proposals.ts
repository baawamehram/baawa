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

const PackageSchema = z.object({
  name: z.string(),
  description: z.string(),
  price: z.number(),
  currency: z.string().default('GBP'),
  deliverables: z.array(z.string()),
})

// POST /api/proposals — admin creates proposal
router.post('/', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return
  try {
    const parsed = z.object({
      assessment_id: z.number(),
      title: z.string(),
      summary: z.string().optional(),
      packages: z.array(PackageSchema).min(1),
      total_price: z.number(),
      currency: z.string().default('GBP'),
    }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

    const { assessment_id, title, summary, packages, total_price, currency } = parsed.data
    const result = await db.query<{ id: number }>(
      `INSERT INTO proposals (assessment_id, title, summary, packages, total_price, currency)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [assessment_id, title, summary ?? null, JSON.stringify(packages), total_price, currency]
    )
    res.json({ id: result.rows[0].id })
  } catch (err) {
    console.error('POST /proposals error:', err)
    res.status(500).json({ error: 'Failed to create proposal' })
  }
})

// GET /api/proposals/assessment/:assessmentId — all proposals for an assessment
router.get('/assessment/:assessmentId', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return
  try {
    const result = await db.query(
      `SELECT * FROM proposals WHERE assessment_id = $1 ORDER BY created_at DESC`,
      [req.params.assessmentId]
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch proposals' })
  }
})

// PUT /api/proposals/:id/send — push proposal to portal
router.put('/:id/send', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return
  try {
    await db.query(
      `UPDATE proposals SET status = 'sent', sent_at = NOW() WHERE id = $1`,
      [req.params.id]
    )
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to send proposal' })
  }
})

// DELETE /api/proposals/:id
router.delete('/:id', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return
  try {
    await db.query(`DELETE FROM proposals WHERE id = $1`, [req.params.id])
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete proposal' })
  }
})

export default router
