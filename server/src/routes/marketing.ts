import { Router, Request, Response } from 'express'
import { db } from '../db/client'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'

const router = Router()
router.use(requireAuth)

const EMAIL_TYPES = [
  'confirmation',
  'value_reminder',
  'social_proof',
  'objection_handler',
  'last_touch',
  'reengagement',
  'pre_call',
  'post_call',
] as const

const emailTypeEnum = z.enum(EMAIL_TYPES)

// Hardcoded defaults for when templates are first accessed
const HARDCODED_DEFAULTS: Record<string, { subject: string; html_body: string }> = {
  confirmation: {
    subject: 'Your assessment is being reviewed',
    html_body: `<div style="font-family: 'Outfit', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="font-size: 24px; margin-bottom: 16px;">Hi {{name}},</h1>
      <p style="font-size: 16px; line-height: 1.6; color: #333;">
        You've just taken the most important step toward clarity. Your answers are now with our team.
      </p>
      <div style="background: #f0fdf4; border-left: 4px solid #059669; padding: 16px; margin: 24px 0;">
        <p style="margin: 0 0 12px; font-weight: 600;">Here's what happens next:</p>
        <ul style="margin: 0; padding-left: 20px;">
          <li style="margin: 8px 0;"><strong>24 hours:</strong> Our analysts review your assessment</li>
          <li style="margin: 8px 0;"><strong>48 hours:</strong> We reach out with your call booking link (if you're a fit)</li>
          <li style="margin: 8px 0;"><strong>Your investment:</strong> Completely free at this stage</li>
        </ul>
      </div>
      <p style="font-size: 16px; line-height: 1.6; color: #333;">
        While you wait, check out how other founders used their assessments to uncover <strong>$340K+ in strategic opportunities</strong>.
      </p>
      <p style="font-size: 14px; color: #666; margin-top: 32px;">See you soon,<br>Team Baawa</p>
    </div>`,
  },
  value_reminder: {
    subject: 'What our team is looking for in your assessment',
    html_body: `<div style="font-family: 'Outfit', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="font-size: 24px; margin-bottom: 16px;">Hi {{name}},</h1>
      <p style="font-size: 16px; line-height: 1.6; color: #333;">While our team analyzes your answers, here's what they're evaluating:</p>
      <div style="margin: 24px 0;">
        <div style="margin-bottom: 16px;"><p style="margin: 0 0 4px; font-weight: 600; color: #059669;">1. Market Clarity</p><p style="margin: 0; color: #666;">Do you truly understand who your customer is?</p></div>
        <div style="margin-bottom: 16px;"><p style="margin: 0 0 4px; font-weight: 600; color: #059669;">2. Execution Readiness</p><p style="margin: 0; color: #666;">Are you positioned to scale, or do you have foundational gaps?</p></div>
        <div style="margin-bottom: 16px;"><p style="margin: 0 0 4px; font-weight: 600; color: #059669;">3. Problem Prioritization</p><p style="margin: 0; color: #666;">Are you solving the right problem in the right order?</p></div>
        <div style="margin-bottom: 16px;"><p style="margin: 0 0 4px; font-weight: 600; color: #059669;">4. Founder Maturity</p><p style="margin: 0; color: #666;">Do you own your challenges, or externalize them?</p></div>
        <div><p style="margin: 0 0 4px; font-weight: 600; color: #059669;">5. Investment Capacity</p><p style="margin: 0; color: #666;">Are you serious enough to invest in solving this?</p></div>
      </div>
      <p style="font-size: 16px; line-height: 1.6; color: #333;">
        Founders who pass this evaluation get matched with consultants worth <strong>$5,000–$20,000+</strong> in annual retainers.
      </p>
      <p style="font-size: 14px; color: #666; margin-top: 32px;">— Team Baawa</p>
    </div>`,
  },
  social_proof: {
    subject: 'What 287 founders discovered (and you might too)',
    html_body: `<div style="font-family: 'Outfit', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="font-size: 24px; margin-bottom: 16px;">Hi {{name}},</h1>
      <p style="font-size: 16px; line-height: 1.6; color: #333;">Quick stats from this week's assessments:</p>
      <div style="background: #f0fdf4; border: 1px solid #d1fae5; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <div style="margin-bottom: 12px;"><p style="margin: 0; font-size: 18px; font-weight: 700; color: #059669;">287</p><p style="margin: 0; color: #666; font-size: 14px;">founders assessed</p></div>
        <div style="margin-bottom: 12px;"><p style="margin: 0; font-size: 18px; font-weight: 700; color: #059669;">92%</p><p style="margin: 0; color: #666; font-size: 14px;">completed the full assessment</p></div>
        <div style="margin-bottom: 12px;"><p style="margin: 0; font-size: 18px; font-weight: 700; color: #059669;">$340K+</p><p style="margin: 0; color: #666; font-size: 14px;">in consulting matched to fit founders</p></div>
      </div>
      <p style="font-size: 16px; line-height: 1.6; color: #333;">
        The most common response? <strong>"I never realized that."</strong>
      </p>
      <p style="font-size: 14px; color: #666; margin-top: 32px;">— Team Baawa</p>
    </div>`,
  },
  objection_handler: {
    subject: 'Why founders hesitate (and why you shouldn\'t)',
    html_body: `<div style="font-family: 'Outfit', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="font-size: 24px; margin-bottom: 16px;">Hi {{name}},</h1>
      <p style="font-size: 16px; line-height: 1.6; color: #333;">We've noticed some founders hesitate at the call stage:</p>
      <div style="margin: 24px 0;">
        <div style="margin-bottom: 20px;"><p style="margin: 0 0 8px; font-weight: 600;">→ I don't have time for a call.</p><p style="margin: 0; color: #666;">This is 30 minutes. Your assessment depends on it.</p></div>
        <div style="margin-bottom: 20px;"><p style="margin: 0 0 8px; font-weight: 600;">→ What if I'm not a fit?</p><p style="margin: 0; color: #666;">Then we both know early. Plus, you keep your insights.</p></div>
      </div>
      <a href="{{callBookingUrl}}" style="display: inline-block; background: #059669; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 24px;">Book Your Call</a>
      <p style="font-size: 14px; color: #666; margin-top: 32px;">— Team Baawa</p>
    </div>`,
  },
  last_touch: {
    subject: 'Your assessment is complete (one final reminder)',
    html_body: `<div style="font-family: 'Outfit', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="font-size: 24px; margin-bottom: 16px;">Hi {{name}},</h1>
      <p style="font-size: 16px; line-height: 1.6; color: #333;">Your assessment is ready. The call link is live for the next 7 days.</p>
      <p style="font-size: 16px; line-height: 1.6; color: #333;">One click, 30 minutes, answers that change how you think about your business.</p>
      <a href="{{callBookingUrl}}" style="display: inline-block; background: #059669; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 24px;">Book Your Call</a>
      <p style="font-size: 14px; color: #666; margin-top: 32px;">— Team Baawa</p>
    </div>`,
  },
  reengagement: {
    subject: 'One more thing we wanted you to know',
    html_body: `<div style="font-family: 'Outfit', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="font-size: 24px; margin-bottom: 16px;">Hi {{name}},</h1>
      <p style="font-size: 16px; line-height: 1.6; color: #333;">Your assessment revealed some powerful insights.</p>
      <div style="background: #f0fdf4; border-left: 4px solid #059669; padding: 16px; margin: 24px 0;">
        <p style="margin: 0; color: #333; line-height: 1.6;">{{topInsight}}</p>
      </div>
      <p style="font-size: 16px; line-height: 1.6; color: #333;">This alone could shift your trajectory. Don't sleep on it.</p>
      <p style="font-size: 14px; color: #666; margin-top: 32px;">— Team Baawa</p>
    </div>`,
  },
  pre_call: {
    subject: 'Your call is tomorrow — here\'s what to prepare',
    html_body: `<div style="font-family: 'Outfit', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="font-size: 24px; margin-bottom: 16px;">Hi {{name}},</h1>
      <p style="font-size: 16px; line-height: 1.6; color: #333;">Quick prep for tomorrow:</p>
      <div style="background: #f0fdf4; border-left: 4px solid #059669; padding: 16px; margin: 24px 0;">
        <ul style="margin: 0; padding-left: 20px;">
          <li style="margin: 12px 0;"><strong>Have</strong> your last 3 months of customer feedback</li>
          <li style="margin: 12px 0;"><strong>Think about</strong> your biggest unsolved problem</li>
          <li style="margin: 12px 0;"><strong>Grab</strong> a pen — you'll want to take notes</li>
        </ul>
      </div>
      <p style="font-size: 16px; line-height: 1.6; color: #333;">This call isn't a sales pitch. It's a diagnosis.</p>
      <p style="font-size: 14px; color: #666; margin-top: 32px;">See you {{callTime}} tomorrow.<br>— Team Baawa</p>
    </div>`,
  },
  post_call: {
    subject: 'Thank you {{name}} — here\'s your next steps',
    html_body: `<div style="font-family: 'Outfit', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="font-size: 24px; margin-bottom: 16px;">Hi {{name}},</h1>
      <p style="font-size: 16px; line-height: 1.6; color: #333;">Great talking with you today.</p>
      <div style="background: #f0fdf4; border-left: 4px solid #059669; padding: 16px; margin: 24px 0;">
        <div style="margin-bottom: 16px;"><p style="margin: 0 0 4px; font-weight: 600; color: #059669;">Your biggest opportunity:</p><p style="margin: 0;">{{opportunity}}</p></div>
        <div style="margin-bottom: 16px;"><p style="margin: 0 0 4px; font-weight: 600; color: #059669;">Quick win (do this week):</p><p style="margin: 0;">{{quickWin}}</p></div>
        <div><p style="margin: 0 0 4px; font-weight: 600; color: #059669;">Your exact need:</p><p style="margin: 0;">{{consultantType}}</p></div>
      </div>
      <p style="font-size: 16px; line-height: 1.6; color: #333;"><strong>Next:</strong> Your matched consultant will reach out within 48 hours.</p>
      <p style="font-size: 14px; color: #666; margin-top: 32px;">— Team Baawa</p>
    </div>`,
  },
}

// GET /api/marketing/stats
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const weekResult = await db.query(
      `SELECT COUNT(*) as count FROM assessments
       WHERE status = 'completed' AND created_at >= NOW() - INTERVAL '7 days'`
    )
    const monthResult = await db.query(
      `SELECT COUNT(*) as count FROM assessments
       WHERE status = 'completed' AND created_at >= NOW() - INTERVAL '30 days'`
    )
    const emailsByType = await db.query(
      `SELECT email_type, COUNT(*) as count FROM email_queue
       GROUP BY email_type ORDER BY email_type`
    )
    const funnelResult = await db.query(
      `SELECT
         (SELECT COUNT(*) FROM assessments WHERE status = 'completed') as total_assessments,
         (SELECT COUNT(*) FROM email_queue) as total_emails,
         (SELECT COUNT(*) FROM call_slots WHERE selected_slot IS NOT NULL) as calls_booked`
    )
    const recentQueue = await db.query(
      `SELECT eq.assessment_id, a.founder_name as name, eq.email_type, eq.sent_at
       FROM email_queue eq
       LEFT JOIN assessments a ON a.id = eq.assessment_id
       ORDER BY eq.sent_at DESC LIMIT 50`
    )

    res.json({
      assessmentsThisWeek: Number(weekResult.rows[0]?.count ?? 0),
      assessmentsThisMonth: Number(monthResult.rows[0]?.count ?? 0),
      emailsByType: emailsByType.rows,
      funnel: funnelResult.rows[0],
      recentQueue: recentQueue.rows,
    })
  } catch (err) {
    console.error('GET /marketing/stats error:', err)
    res.status(500).json({ error: 'Failed to load stats' })
  }
})

// GET /api/marketing/templates/:type
router.get('/templates/:type', async (req: Request, res: Response) => {
  try {
    const { type } = req.params
    const parsed = emailTypeEnum.safeParse(type)
    if (!parsed.success) return res.status(400).json({ error: 'Invalid email type' })

    const result = await db.query(
      `SELECT email_type, subject, html_body, is_default, updated_at FROM email_templates
       WHERE email_type = $1`,
      [type]
    )

    if (result.rows.length > 0) {
      return res.json(result.rows[0])
    }

    // Lazy-seed: insert hardcoded default and return it
    const defaults = HARDCODED_DEFAULTS[type] || { subject: '', html_body: '' }
    await db.query(
      `INSERT INTO email_templates (email_type, subject, html_body, is_default)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (email_type) DO NOTHING`,
      [type, defaults.subject, defaults.html_body]
    )

    res.json({
      email_type: type,
      subject: defaults.subject,
      html_body: defaults.html_body,
      is_default: true,
      updated_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error(`GET /marketing/templates/:type error:`, err)
    res.status(500).json({ error: 'Failed to load template' })
  }
})

// PUT /api/marketing/templates/:type
router.put('/templates/:type', async (req: Request, res: Response) => {
  try {
    const { type } = req.params
    const parsed = emailTypeEnum.safeParse(type)
    if (!parsed.success) return res.status(400).json({ error: 'Invalid email type' })

    const body = z
      .object({
        subject: z.string().min(1),
        html_body: z.string().min(1),
      })
      .safeParse(req.body)
    if (!body.success) return res.status(400).json({ error: 'Invalid body' })

    await db.query(
      `INSERT INTO email_templates (email_type, subject, html_body, is_default)
       VALUES ($1, $2, $3, false)
       ON CONFLICT (email_type) DO UPDATE SET subject = $2, html_body = $3, is_default = false, updated_at = NOW()`,
      [type, body.data.subject, body.data.html_body]
    )

    res.json({ ok: true })
  } catch (err) {
    console.error('PUT /marketing/templates/:type error:', err)
    res.status(500).json({ error: 'Failed to save template' })
  }
})

// POST /api/marketing/templates/:type/reset
router.post('/templates/:type/reset', async (req: Request, res: Response) => {
  try {
    const { type } = req.params
    const parsed = emailTypeEnum.safeParse(type)
    if (!parsed.success) return res.status(400).json({ error: 'Invalid email type' })

    await db.query(`DELETE FROM email_templates WHERE email_type = $1`, [type])
    res.json({ ok: true })
  } catch (err) {
    console.error('POST /marketing/templates/:type/reset error:', err)
    res.status(500).json({ error: 'Failed to reset template' })
  }
})

// GET /api/marketing/sequences
router.get('/sequences', async (_req: Request, res: Response) => {
  try {
    const result = await db.query(`SELECT * FROM email_sequence_config ORDER BY email_type`)
    res.json(result.rows)
  } catch (err) {
    console.error('GET /marketing/sequences error:', err)
    res.status(500).json({ error: 'Failed to load sequences' })
  }
})

// PUT /api/marketing/sequences/:type
router.put('/sequences/:type', async (req: Request, res: Response) => {
  try {
    const { type } = req.params
    const parsed = emailTypeEnum.safeParse(type)
    if (!parsed.success) return res.status(400).json({ error: 'Invalid email type' })

    const body = z
      .object({
        enabled: z.boolean().optional(),
        delay_hours: z.number().min(0).optional(),
      })
      .safeParse(req.body)
    if (!body.success) return res.status(400).json({ error: 'Invalid body' })

    const updates: string[] = []
    const values: any[] = [type]
    let paramIndex = 2

    if (body.data.enabled !== undefined) {
      updates.push(`enabled = $${paramIndex}`)
      values.push(body.data.enabled)
      paramIndex++
    }
    if (body.data.delay_hours !== undefined) {
      updates.push(`delay_hours = $${paramIndex}`)
      values.push(body.data.delay_hours)
      paramIndex++
    }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' })

    updates.push(`updated_at = NOW()`)
    const sql = `UPDATE email_sequence_config SET ${updates.join(', ')} WHERE email_type = $1`
    await db.query(sql, values)

    res.json({ ok: true })
  } catch (err) {
    console.error('PUT /marketing/sequences/:type error:', err)
    res.status(500).json({ error: 'Failed to update sequence' })
  }
})

// GET /api/marketing/ab-tests
router.get('/ab-tests', async (_req: Request, res: Response) => {
  try {
    const result = await db.query(
      `SELECT abt.*,
        (SELECT COUNT(*) FROM email_queue WHERE email_type = abt.email_type AND ab_variant = 'variant') as variant_sends,
        (SELECT COUNT(*) FROM email_queue WHERE email_type = abt.email_type AND ab_variant = 'control') as control_sends
       FROM email_ab_tests abt
       ORDER BY abt.created_at DESC`
    )
    res.json(result.rows)
  } catch (err) {
    console.error('GET /marketing/ab-tests error:', err)
    res.status(500).json({ error: 'Failed to load A/B tests' })
  }
})

// POST /api/marketing/ab-tests
router.post('/ab-tests', async (req: Request, res: Response) => {
  try {
    const body = z
      .object({
        email_type: emailTypeEnum,
        variant_name: z.string().min(1),
        subject: z.string().min(1),
        html_body: z.string().min(1),
        traffic_split: z.number().min(0.1).max(0.9).default(0.5),
      })
      .safeParse(req.body)
    if (!body.success) return res.status(400).json({ error: 'Invalid body' })

    // Check if active test already exists
    const check = await db.query(
      `SELECT 1 FROM email_ab_tests WHERE email_type = $1 AND active = true LIMIT 1`,
      [body.data.email_type]
    )
    if (check.rows.length > 0) {
      return res.status(409).json({ error: 'Active test already exists for this email type' })
    }

    const result = await db.query(
      `INSERT INTO email_ab_tests (email_type, variant_name, subject, html_body, traffic_split)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [body.data.email_type, body.data.variant_name, body.data.subject, body.data.html_body, body.data.traffic_split]
    )

    res.json({ id: result.rows[0].id, ok: true })
  } catch (err) {
    console.error('POST /marketing/ab-tests error:', err)
    res.status(500).json({ error: 'Failed to create A/B test' })
  }
})

// PUT /api/marketing/ab-tests/:id
router.put('/ab-tests/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const body = z
      .object({
        variant_name: z.string().min(1).optional(),
        subject: z.string().min(1).optional(),
        html_body: z.string().min(1).optional(),
        traffic_split: z.number().min(0.1).max(0.9).optional(),
        active: z.boolean().optional(),
      })
      .safeParse(req.body)
    if (!body.success) return res.status(400).json({ error: 'Invalid body' })

    const updates: string[] = []
    const values: any[] = [id]
    let paramIndex = 2

    if (body.data.variant_name !== undefined) {
      updates.push(`variant_name = $${paramIndex}`)
      values.push(body.data.variant_name)
      paramIndex++
    }
    if (body.data.subject !== undefined) {
      updates.push(`subject = $${paramIndex}`)
      values.push(body.data.subject)
      paramIndex++
    }
    if (body.data.html_body !== undefined) {
      updates.push(`html_body = $${paramIndex}`)
      values.push(body.data.html_body)
      paramIndex++
    }
    if (body.data.traffic_split !== undefined) {
      updates.push(`traffic_split = $${paramIndex}`)
      values.push(body.data.traffic_split)
      paramIndex++
    }
    if (body.data.active !== undefined) {
      updates.push(`active = $${paramIndex}`)
      values.push(body.data.active)
      paramIndex++
    }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' })

    const sql = `UPDATE email_ab_tests SET ${updates.join(', ')} WHERE id = $1`
    await db.query(sql, values)

    res.json({ ok: true })
  } catch (err) {
    console.error('PUT /marketing/ab-tests/:id error:', err)
    res.status(500).json({ error: 'Failed to update A/B test' })
  }
})

// DELETE /api/marketing/ab-tests/:id
router.delete('/ab-tests/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    await db.query(`DELETE FROM email_ab_tests WHERE id = $1`, [id])
    res.json({ ok: true })
  } catch (err) {
    console.error('DELETE /marketing/ab-tests/:id error:', err)
    res.status(500).json({ error: 'Failed to delete A/B test' })
  }
})

// POST /api/marketing/ab-tests/:id/declare-winner
router.post('/ab-tests/:id/declare-winner', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const body = z
      .object({
        apply_to_template: z.boolean().default(false),
      })
      .safeParse(req.body)
    if (!body.success) return res.status(400).json({ error: 'Invalid body' })

    // Get the test
    const testResult = await db.query(`SELECT * FROM email_ab_tests WHERE id = $1`, [id])
    if (!testResult.rows[0]) return res.status(404).json({ error: 'Test not found' })

    const test = testResult.rows[0]

    // Mark as winner and inactive
    await db.query(`UPDATE email_ab_tests SET winner = true, active = false WHERE id = $1`, [id])

    // Optionally apply to template
    if (body.data.apply_to_template) {
      await db.query(
        `INSERT INTO email_templates (email_type, subject, html_body, is_default)
         VALUES ($1, $2, $3, false)
         ON CONFLICT (email_type) DO UPDATE SET subject = $2, html_body = $3, is_default = false, updated_at = NOW()`,
        [test.email_type, test.subject, test.html_body]
      )
    }

    res.json({ ok: true })
  } catch (err) {
    console.error('POST /marketing/ab-tests/:id/declare-winner error:', err)
    res.status(500).json({ error: 'Failed to declare winner' })
  }
})

export default router
