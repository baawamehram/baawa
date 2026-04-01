import { Router, Request, Response } from 'express'
import { db } from '../db/client'
import { requireAuth } from '../middleware/auth'
import { z } from 'zod'

const router = Router()

// GET /api/work-plan-tasks?client_id=X - Get all tasks for client
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { client_id } = req.query

    if (!client_id) {
      return res.status(400).json({ error: 'client_id query parameter required' })
    }

    const result = await db.query(
      `SELECT wpt.*, wp.title as work_plan_title
       FROM work_plan_tasks wpt
       JOIN work_plans wp ON wpt.work_plan_id = wp.id
       WHERE wp.client_id = $1
       ORDER BY wpt.due_date ASC, wpt.created_at DESC`,
      [client_id]
    )

    res.json(result.rows)
  } catch (err) {
    console.error('GET tasks error:', err)
    res.status(500).json({ error: 'Failed to fetch tasks' })
  }
})

// POST /api/work-plan-tasks - Create task
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = z.object({
      work_plan_id: z.number(),
      title: z.string(),
      description: z.string().optional(),
      order_index: z.number().optional(),
      assigned_to: z.string().optional(),
      due_date: z.string().optional(),
      estimated_hours: z.number().optional(),
      cost: z.number().optional(),
    }).safeParse(req.body)

    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request' })
    }

    const result = await db.query(
      `INSERT INTO work_plan_tasks (work_plan_id, title, description, order_index, assigned_to, due_date, estimated_hours, cost)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [parsed.data.work_plan_id, parsed.data.title, parsed.data.description, parsed.data.order_index, parsed.data.assigned_to, parsed.data.due_date, parsed.data.estimated_hours, parsed.data.cost]
    )

    res.json(result.rows[0])
  } catch (err) {
    console.error('POST task error:', err)
    res.status(500).json({ error: 'Failed to create task' })
  }
})

// PUT /api/work-plan-tasks/:id - Update task
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const parsed = z.object({
      status: z.enum(['not_started', 'in_progress', 'completed', 'blocked']).optional(),
      progress_percent: z.number().min(0).max(100).optional(),
      assigned_to: z.string().nullable().optional(),
      actual_hours: z.number().optional(),
      due_date: z.string().optional(),
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
      if (parsed.data.status === 'completed') {
        updates.push(`completed_at = NOW()`)
      }
    }
    if (parsed.data.progress_percent !== undefined) {
      updates.push(`progress_percent = $${paramCount++}`)
      values.push(parsed.data.progress_percent)
    }
    if (parsed.data.assigned_to !== undefined) {
      updates.push(`assigned_to = $${paramCount++}`)
      values.push(parsed.data.assigned_to)
    }
    if (parsed.data.actual_hours !== undefined) {
      updates.push(`actual_hours = $${paramCount++}`)
      values.push(parsed.data.actual_hours)
    }
    if (parsed.data.due_date) {
      updates.push(`due_date = $${paramCount++}`)
      values.push(parsed.data.due_date)
    }

    updates.push(`updated_at = NOW()`)
    values.push(id)

    const result = await db.query(
      `UPDATE work_plan_tasks SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    )

    res.json(result.rows[0])
  } catch (err) {
    console.error('PUT task error:', err)
    res.status(500).json({ error: 'Failed to update task' })
  }
})

export default router
