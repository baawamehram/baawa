import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { db } from '../db/client'

const router = Router()

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token || token !== process.env.FOUNDER_API_KEY) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  next()
}

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
