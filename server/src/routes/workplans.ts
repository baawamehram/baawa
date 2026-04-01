import { Router, Request, Response } from 'express'
import { db } from '../db/client'
import { requireAuth } from '../middleware/auth'
import { z } from 'zod'

const router = Router()

// POST /api/work-plans - Create work plan
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = z.object({
      client_id: z.number(),
      assessment_id: z.number(),
      title: z.string(),
      description: z.string().optional(),
      markdown_source: z.string().optional(),
    }).safeParse(req.body)

    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request' })
    }

    const { client_id, assessment_id, title, description, markdown_source } = parsed.data

    const result = await db.query(
      `INSERT INTO work_plans (client_id, assessment_id, title, description, markdown_source, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [client_id, assessment_id, title, description, markdown_source, (req as any).user?.email || 'admin']
    )

    res.json(result.rows[0])
  } catch (err) {
    console.error('POST /work-plans error:', err)
    res.status(500).json({ error: 'Failed to create work plan' })
  }
})

// GET /api/work-plans/:client_id - Get all plans for client
router.get('/:client_id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { client_id } = req.params

    const result = await db.query(
      `SELECT * FROM work_plans WHERE client_id = $1 ORDER BY created_at DESC`,
      [client_id]
    )

    res.json(result.rows)
  } catch (err) {
    console.error('GET /work-plans error:', err)
    res.status(500).json({ error: 'Failed to fetch work plans' })
  }
})

// GET /api/work-plans/:id/detail - Get plan with tasks and costs
router.get('/:id/detail', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const [planRes, tasksRes, costsRes] = await Promise.all([
      db.query(`SELECT * FROM work_plans WHERE id = $1`, [id]),
      db.query(`SELECT * FROM work_plan_tasks WHERE work_plan_id = $1 ORDER BY order_index`, [id]),
      db.query(`SELECT * FROM work_plan_costs WHERE work_plan_id = $1`, [id]),
    ])

    if (planRes.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' })
    }

    res.json({
      plan: planRes.rows[0],
      tasks: tasksRes.rows,
      costs: costsRes.rows,
    })
  } catch (err) {
    console.error('GET /work-plans detail error:', err)
    res.status(500).json({ error: 'Failed to fetch plan' })
  }
})

// PUT /api/work-plans/:id - Update plan status
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const parsed = z.object({
      status: z.enum(['draft', 'awaiting_approval', 'costs_pending', 'costs_approved', 'in_progress', 'complete']).optional(),
      client_approved_at: z.string().datetime().optional(),
      costs_approved_at: z.string().datetime().optional(),
      total_cost: z.number().optional(),
    }).safeParse(req.body)

    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request' })
    }

    const updates: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (parsed.data.status) {
      updates.push(`status = $${paramCount++}`)
      values.push(parsed.data.status)
    }
    if (parsed.data.client_approved_at) {
      updates.push(`client_approved_at = $${paramCount++}`)
      values.push(parsed.data.client_approved_at)
    }
    if (parsed.data.costs_approved_at) {
      updates.push(`costs_approved_at = $${paramCount++}`)
      values.push(parsed.data.costs_approved_at)
    }
    if (parsed.data.total_cost) {
      updates.push(`total_cost = $${paramCount++}`)
      values.push(parsed.data.total_cost)
    }

    updates.push(`updated_at = NOW()`)
    values.push(id)

    const result = await db.query(
      `UPDATE work_plans SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    )

    res.json(result.rows[0])
  } catch (err) {
    console.error('PUT /work-plans error:', err)
    res.status(500).json({ error: 'Failed to update work plan' })
  }
})

export default router
