import { Router, Request, Response } from 'express'
import { db } from '../db/client'
import { requireAuth } from '../middleware/auth'
import { z } from 'zod'

const router = Router()

// GET /api/work-plan-costs?work_plan_id=X - Get all costs for a work plan
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { work_plan_id } = req.query

    if (!work_plan_id) {
      return res.status(400).json({ error: 'work_plan_id query parameter required' })
    }

    const result = await db.query(
      `SELECT * FROM work_plan_costs WHERE work_plan_id = $1 ORDER BY created_at DESC`,
      [work_plan_id]
    )

    res.json(result.rows)
  } catch (err) {
    console.error('GET work-plan-costs error:', err)
    res.status(500).json({ error: 'Failed to fetch costs' })
  }
})

// POST /api/work-plan-costs - Create a new cost item
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = z.object({
      work_plan_id: z.number(),
      description: z.string().min(1),
      amount: z.number().positive(),
      category: z.string().optional(),
    }).safeParse(req.body)

    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request' })
    }

    const { work_plan_id, description, amount, category } = parsed.data

    // Verify work plan exists
    const planCheck = await db.query(
      `SELECT id FROM work_plans WHERE id = $1`,
      [work_plan_id]
    )

    if (planCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Work plan not found' })
    }

    const result = await db.query(
      `INSERT INTO work_plan_costs (work_plan_id, description, amount, category)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [work_plan_id, description, amount, category || null]
    )

    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error('POST work-plan-costs error:', err)
    res.status(500).json({ error: 'Failed to create cost' })
  }
})

// PUT /api/work-plan-costs/:id - Update a cost item or approve it
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const parsed = z.object({
      description: z.string().min(1).optional(),
      amount: z.number().positive().optional(),
      category: z.string().optional(),
      approved: z.boolean().optional(),
    }).safeParse(req.body)

    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request' })
    }

    // Fetch existing cost
    const costCheck = await db.query(
      `SELECT * FROM work_plan_costs WHERE id = $1`,
      [id]
    )

    if (costCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Cost not found' })
    }

    const updates: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (parsed.data.description) {
      updates.push(`description = $${paramCount++}`)
      values.push(parsed.data.description)
    }
    if (parsed.data.amount !== undefined) {
      updates.push(`amount = $${paramCount++}`)
      values.push(parsed.data.amount)
    }
    if (parsed.data.category !== undefined) {
      updates.push(`category = $${paramCount++}`)
      values.push(parsed.data.category || null)
    }
    if (parsed.data.approved !== undefined) {
      updates.push(`approved = $${paramCount++}`)
      values.push(parsed.data.approved)
      if (parsed.data.approved) {
        updates.push(`approved_at = NOW()`)
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    values.push(id)

    const result = await db.query(
      `UPDATE work_plan_costs SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    )

    // If cost was approved, check if all costs for this work plan are now approved
    if (parsed.data.approved === true) {
      const cost = result.rows[0]
      const allCostsResult = await db.query(
        `SELECT COUNT(*) as total, SUM(CASE WHEN approved = true THEN 1 ELSE 0 END) as approved_count
         FROM work_plan_costs WHERE work_plan_id = $1`,
        [cost.work_plan_id]
      )

      const allCosts = allCostsResult.rows[0]
      if (parseInt(allCosts.total) === parseInt(allCosts.approved_count)) {
        // All costs approved - update work plan
        await db.query(
          `UPDATE work_plans SET costs_approved_at = NOW(), costs_approved_by = $1 WHERE id = $2`,
          [(req as any).user?.email || 'admin', cost.work_plan_id]
        )
      }
    }

    res.json(result.rows[0])
  } catch (err) {
    console.error('PUT work-plan-costs error:', err)
    res.status(500).json({ error: 'Failed to update cost' })
  }
})

// PUT /api/work-plan-costs/:id/approve - Approve a cost
router.put('/:id/approve', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    // Fetch existing cost
    const costCheck = await db.query(
      `SELECT * FROM work_plan_costs WHERE id = $1`,
      [id]
    )

    if (costCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Cost not found' })
    }

    // Update cost as approved
    const result = await db.query(
      `UPDATE work_plan_costs SET approved = true, approved_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cost not found' })
    }

    const cost = result.rows[0]

    // Check if all costs for this work plan are now approved
    const allCostsResult = await db.query(
      `SELECT COUNT(*) as total, SUM(CASE WHEN approved = true THEN 1 ELSE 0 END) as approved_count
       FROM work_plan_costs WHERE work_plan_id = $1`,
      [cost.work_plan_id]
    )

    const allCosts = allCostsResult.rows[0]
    if (parseInt(allCosts.total) === parseInt(allCosts.approved_count)) {
      // All costs approved - update work plan
      await db.query(
        `UPDATE work_plans SET costs_approved_at = NOW(), costs_approved_by = $1 WHERE id = $2`,
        [(req as any).user?.email || 'admin', cost.work_plan_id]
      )
    }

    res.json(result.rows[0])
  } catch (err) {
    console.error('PUT work-plan-costs/:id/approve error:', err)
    res.status(500).json({ error: 'Failed to approve cost' })
  }
})

// DELETE /api/work-plan-costs/:id - Delete a cost item
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    // Fetch cost
    const costCheck = await db.query(
      `SELECT * FROM work_plan_costs WHERE id = $1`,
      [id]
    )

    if (costCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Cost not found' })
    }

    const cost = costCheck.rows[0]

    // Check if cost is approved
    if (cost.approved) {
      return res.status(409).json({ error: 'Cannot delete approved cost' })
    }

    // Delete cost
    await db.query(
      `DELETE FROM work_plan_costs WHERE id = $1`,
      [id]
    )

    res.status(204).send()
  } catch (err) {
    console.error('DELETE work-plan-costs error:', err)
    res.status(500).json({ error: 'Failed to delete cost' })
  }
})

export default router
