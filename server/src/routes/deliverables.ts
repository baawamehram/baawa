import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { db } from '../db/client'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.use(requireAuth)

// PUT /api/deliverables/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      status: z.enum(['pending', 'in_progress', 'completed']),
    })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Invalid status' })

    const completedAt = parsed.data.status === 'completed' ? 'NOW()' : null
    await db.query(
      'UPDATE deliverables SET status = $1, completed_at = $2 WHERE id = $3',
      [parsed.data.status, completedAt, req.params.id]
    )
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update deliverable' })
  }
})

export default router
