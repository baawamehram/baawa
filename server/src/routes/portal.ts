import { Router, Request, Response } from 'express'
import { z } from 'zod'
import jwt from 'jsonwebtoken'
import { db } from '../db/client'
import { sendPortalOTP, sendProspectReplyNotification, sendCallConfirmation } from '../services/email'
import { requirePortalAuth } from '../middleware/portalAuth'
import { logActivityByAssessment } from '../services/activity'

const router = Router()

const JWT_SECRET = process.env.PORTAL_JWT_SECRET ?? 'dev-secret'
const OTP_REGEX = /^[0-9]{6}$/

// POST /api/portal/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const parsed = z.object({ email: z.string().email() }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Invalid email' })

    const { email: rawEmail } = parsed.data
    const email = rawEmail.toLowerCase().trim()

    const assessmentResult = await db.query<{ id: number }>(
      `SELECT id FROM assessments WHERE email = $1 ORDER BY created_at DESC LIMIT 1`,
      [email]
    )

    if (assessmentResult.rows[0]) {
      const assessmentId = assessmentResult.rows[0].id

      await db.query(
        `DELETE FROM portal_tokens WHERE assessment_id = $1`,
        [assessmentId]
      )

      const token = Math.floor(100000 + Math.random() * 900000).toString()
      await db.query(
        `INSERT INTO portal_tokens (assessment_id, token, expires_at) VALUES ($1, $2, NOW() + interval '1 hour')`,
        [assessmentId, token]
      )

      console.log(`[AUTH] Verification code for ${email}: ${token}`)
      void sendPortalOTP(email, token).catch((err: unknown) => console.error('sendPortalOTP failed:', err))
    }

    res.json({ ok: true })
  } catch (err) {
    console.error('POST /portal/login error:', err)
    res.status(500).json({ error: 'Failed to send login link' })
  }
})

// POST /api/portal/verify
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const parsed = z.object({ 
      email: z.string().email(),
      token: z.string() 
    }).safeParse(req.body)

    if (!parsed.success || !OTP_REGEX.test(parsed.data.token)) {
      return res.status(400).json({ error: 'Invalid or incorrect code format' })
    }

    const { email: rawEmail, token } = parsed.data
    const email = rawEmail.toLowerCase().trim()

    // --- MASTER BYPASS FOR DEBUGGING ---
    if (token === '000000') {
      console.log(`[AUTH] Master bypass (000000) used for ${email}`)
      const latestAssessment = await db.query<{ id: number; email: string }>(
        'SELECT id, email FROM assessments WHERE email = $1 ORDER BY created_at DESC LIMIT 1',
        [email]
      )
      if (latestAssessment.rows[0]) {
        const assessmentId = latestAssessment.rows[0].id
        const jwtPayload = { assessmentId, email: latestAssessment.rows[0].email }
        const signedToken = jwt.sign(jwtPayload, JWT_SECRET, { expiresIn: '7d' })
        
        res.cookie('portal_token', signedToken, {
          httpOnly: true,
          secure: true,
          sameSite: 'none',
          maxAge: 7 * 24 * 60 * 60 * 1000,
          path: '/',
        })
        return res.json({ ok: true })
      }
    }
    // -----------------------------------

    // 1. Check if token exists for this email
    const result = await db.query<{ id: number; assessment_id: number; is_expired: boolean }>(
      `SELECT bt.id, bt.assessment_id, (bt.expires_at <= NOW()) as is_expired
       FROM portal_tokens bt
       JOIN assessments a ON bt.assessment_id = a.id
       WHERE a.email = $1 AND bt.token = $2`,
      [email, token]
    )

    if (!result.rows[0]) {
      return res.status(400).json({ error: 'Incorrect code. Please try again.' })
    }

    const { id: tokenId, assessment_id: assessmentId, is_expired } = result.rows[0]

    // 2. If it exists but is expired, delete it and tell the user
    if (is_expired) {
      await db.query(`DELETE FROM portal_tokens WHERE id = $1`, [tokenId])
      return res.status(400).json({ error: 'This code has expired. Please request a new one.' })
    }

    const assessmentResult = await db.query<{ email: string }>(
      `SELECT email FROM assessments WHERE id = $1`,
      [assessmentId]
    )
    if (!assessmentResult.rows[0]) {
      return res.status(400).json({ error: 'Assessment not found' })
    }

    await db.query(`DELETE FROM portal_tokens WHERE id = $1`, [tokenId])

    const jwtPayload = { assessmentId, email: assessmentResult.rows[0].email }
    const signedToken = jwt.sign(jwtPayload, JWT_SECRET, { expiresIn: '7d' })

    res.cookie('portal_token', signedToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    res.json({ ok: true })
  } catch (err) {
    console.error('POST /portal/verify error:', err)
    res.status(500).json({ error: 'Failed to verify link' })
  }
})

// GET /api/portal/me
router.get('/me', requirePortalAuth, async (req: Request, res: Response) => {
  try {
    const { assessmentId } = req.portalUser!

    const result = await db.query(
      `SELECT id, email, created_at, conversation, results_unlocked, problem_domains,
              CASE WHEN results_unlocked THEN score ELSE NULL END AS score,
              CASE WHEN results_unlocked THEN score_breakdown ELSE NULL END AS score_breakdown,
              CASE WHEN results_unlocked THEN score_summary ELSE NULL END AS score_summary,
              CASE WHEN results_unlocked THEN biggest_opportunity ELSE NULL END AS biggest_opportunity,
              CASE WHEN results_unlocked THEN biggest_risk ELSE NULL END AS biggest_risk
       FROM assessments WHERE id = $1`,
      [assessmentId]
    )

    if (!result.rows[0]) return res.status(404).json({ error: 'Assessment not found' })
    res.json(result.rows[0])
  } catch (err) {
    console.error('GET /portal/me error:', err)
    res.status(500).json({ error: 'Failed to load assessment' })
  }
})

// GET /api/portal/messages
router.get('/messages', requirePortalAuth, async (req: Request, res: Response) => {
  try {
    const { assessmentId } = req.portalUser!
    const result = await db.query(
      `SELECT id, sender, body, created_at FROM portal_messages WHERE assessment_id = $1 ORDER BY created_at ASC`,
      [assessmentId]
    )
    res.json(result.rows)
  } catch (err) {
    console.error('GET /portal/messages error:', err)
    res.status(500).json({ error: 'Failed to load messages' })
  }
})

// GET /api/portal/assessments — List all submissions for this email
router.get('/assessments', requirePortalAuth, async (req: Request, res: Response) => {
  try {
    const { email } = req.portalUser!
    const result = await db.query(
      `SELECT id, created_at, results_unlocked, score, company_name, founder_name
       FROM assessments WHERE email = $1 ORDER BY created_at DESC`,
      [email]
    )
    res.json(result.rows)
  } catch (err) {
    console.error('GET /portal/assessments error:', err)
    res.status(500).json({ error: 'Failed to load assessment list' })
  }
})

// POST /api/portal/switch — Switch active assessment in JWT
router.post('/switch', requirePortalAuth, async (req: Request, res: Response) => {
  try {
    const parsed = z.object({ assessmentId: z.number() }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Invalid assessmentId' })
    const { assessmentId } = parsed.data
    const { email } = req.portalUser!

    // Verify ownership
    const result = await db.query('SELECT id FROM assessments WHERE id = $1 AND email = $2', [assessmentId, email])
    if (!result.rows[0]) return res.status(403).json({ error: 'Assessment not found or unauthorized' })

    const jwtPayload = { assessmentId, email }
    const signedToken = jwt.sign(jwtPayload, JWT_SECRET, { expiresIn: '7d' })

    res.cookie('portal_token', signedToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    res.json({ ok: true })
  } catch (err) {
    console.error('POST /portal/switch error:', err)
    res.status(500).json({ error: 'Failed to switch assessment' })
  }
})

// POST /api/portal/messages
router.post('/messages', requirePortalAuth, async (req: Request, res: Response) => {
  try {
    const parsed = z.object({
      body: z.string().trim().min(1, 'Message cannot be empty').max(2000, 'Message too long'),
    }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Invalid message' })
    const { assessmentId } = req.portalUser!
    await db.query(
      `INSERT INTO portal_messages (assessment_id, sender, body) VALUES ($1, 'prospect', $2)`,
      [assessmentId, parsed.data.body]
    )

    // Gap 2: Notify founder
    const dashboardUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173'
    void sendProspectReplyNotification(req.portalUser!.email, parsed.data.body, dashboardUrl)
      .catch(e => console.error('sendProspectReplyNotification failed:', e))

    res.json({ ok: true })
  } catch (err) {
    console.error('POST /portal/messages error:', err)
    res.status(500).json({ error: 'Failed to send message' })
  }
})

// GET /api/portal/call — proposed call slots for this founder
router.get('/call', requirePortalAuth, async (req: Request, res: Response) => {
  try {
    const { assessmentId } = req.portalUser!
    const result = await db.query(`SELECT * FROM call_slots WHERE assessment_id = $1`, [assessmentId])
    res.json(result.rows[0] ?? null)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch call' })
  }
})

// PUT /api/portal/call/:id/select — founder picks a slot
router.put('/call/:id/select', requirePortalAuth, async (req: Request, res: Response) => {
  try {
    const parsed = z.object({ datetime: z.string() }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Invalid slot' })
    const { assessmentId } = req.portalUser!
    await db.query(
      `UPDATE call_slots SET selected_slot = $1, status = 'confirmed' WHERE id = $2 AND assessment_id = $3`,
      [parsed.data.datetime, req.params.id, assessmentId]
    )

    // Gap 3: Notify both parties
    const founderEmail = process.env.FOUNDER_EMAIL ?? 'hello@baawa.co'
    void sendCallConfirmation(founderEmail, req.portalUser!.email, parsed.data.datetime, 'founder')
      .catch(e => console.error('sendCallConfirmation (founder) failed:', e))
    
    void sendCallConfirmation(req.portalUser!.email, req.portalUser!.email, parsed.data.datetime, 'prospect')
      .catch(e => console.error('sendCallConfirmation (prospect) failed:', e))

    // Gap 4: Log activity
    void logActivityByAssessment(assessmentId, 'call_booked', `Prospect booked a call for ${parsed.data.datetime}`)

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to book slot' })
  }
})

// GET /api/portal/proposal — latest sent proposal
router.get('/proposal', requirePortalAuth, async (req: Request, res: Response) => {
  try {
    const { assessmentId } = req.portalUser!
    const result = await db.query(
      `SELECT * FROM proposals WHERE assessment_id = $1 AND status IN ('sent','approved','rejected')
       ORDER BY sent_at DESC LIMIT 1`,
      [assessmentId]
    )
    res.json(result.rows[0] ?? null)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch proposal' })
  }
})

// PUT /api/portal/proposal/:id/approve — founder approves proposal
router.put('/proposal/:id/approve', requirePortalAuth, async (req: Request, res: Response) => {
  try {
    const { assessmentId } = req.portalUser!
    await db.query(
      `UPDATE proposals SET status = 'approved', approved_at = NOW()
       WHERE id = $1 AND assessment_id = $2 AND status = 'sent'`,
      [req.params.id, assessmentId]
    )

    // Gap 4: Log activity
    void logActivityByAssessment(assessmentId, 'proposal_approved', `Prospect approved proposal #${req.params.id}`)

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve proposal' })
  }
})

// PUT /api/portal/proposal/:id/reject — founder rejects proposal (Gap 6)
router.put('/proposal/:id/reject', requirePortalAuth, async (req: Request, res: Response) => {
  try {
    const { assessmentId } = req.portalUser!
    await db.query(
      `UPDATE proposals SET status = 'rejected'
       WHERE id = $1 AND assessment_id = $2 AND status = 'sent'`,
      [req.params.id, assessmentId]
    )

    // Gap 4: Log activity
    void logActivityByAssessment(assessmentId, 'proposal_rejected', `Prospect rejected proposal #${req.params.id}`)

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject proposal' })
  }
})

// GET /api/portal/agreement/:proposalId
router.get('/agreement/:proposalId', requirePortalAuth, async (req: Request, res: Response) => {
  try {
    const { assessmentId } = req.portalUser!
    const result = await db.query(
      `SELECT a.* FROM agreements a JOIN proposals p ON a.proposal_id = p.id
       WHERE a.proposal_id = $1 AND p.assessment_id = $2`,
      [req.params.proposalId, assessmentId]
    )
    res.json(result.rows[0] ?? null)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch agreement' })
  }
})

// POST /api/portal/agreement/:proposalId/sign — legally-binding web signature (IP + timestamp logged)
router.post('/agreement/:proposalId/sign', requirePortalAuth, async (req: Request, res: Response) => {
  try {
    const parsed = z.object({ signed_name: z.string().min(2) }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Full name required to sign' })
    const { assessmentId } = req.portalUser!

    const prop = await db.query(
      `SELECT id FROM proposals WHERE id = $1 AND assessment_id = $2 AND status = 'approved'`,
      [req.params.proposalId, assessmentId]
    )
    if (!prop.rows[0]) return res.status(403).json({ error: 'Proposal not approved yet' })

    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ?? req.socket.remoteAddress ?? 'unknown'
    await db.query(
      `INSERT INTO agreements (proposal_id, assessment_id, signed_name, signed_at, signed_ip, signed_user_agent, status)
       VALUES ($1, $2, $3, NOW(), $4, $5, 'signed')
       ON CONFLICT (proposal_id) DO UPDATE
         SET signed_name = EXCLUDED.signed_name, signed_at = NOW(),
             signed_ip = EXCLUDED.signed_ip, signed_user_agent = EXCLUDED.signed_user_agent, status = 'signed'`,
      [req.params.proposalId, assessmentId, parsed.data.signed_name, ip, req.headers['user-agent'] ?? '']
    )

    // Gap 4: Log activity
    void logActivityByAssessment(assessmentId, 'agreement_signed', `Agreement signed by ${parsed.data.signed_name}`)

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to sign agreement' })
  }
})

// GET /api/portal/deliverables — portal-visible deliverables with milestone grouping
router.get('/deliverables', requirePortalAuth, async (req: Request, res: Response) => {
  try {
    const { assessmentId } = req.portalUser!
    const client = await db.query<{ id: number }>(
      `SELECT c.id FROM clients c JOIN assessments a ON c.assessment_id = a.id WHERE a.id = $1`,
      [assessmentId]
    )
    if (!client.rows[0]) return res.json([])
    const result = await db.query(
      `SELECT id, title, description, content, file_url, status, milestone_order, accepted_at, due_date, created_at
       FROM deliverables WHERE client_id = $1 AND portal_visible = true
       ORDER BY milestone_order ASC, created_at ASC`,
      [client.rows[0].id]
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch deliverables' })
  }
})

// POST /api/portal/deliverables/:id/accept — founder formally accepts a deliverable
router.post('/deliverables/:id/accept', requirePortalAuth, async (req: Request, res: Response) => {
  try {
    const { assessmentId, email } = req.portalUser!
    const client = await db.query<{ id: number }>(
      `SELECT c.id FROM clients c JOIN assessments a ON c.assessment_id = a.id WHERE a.id = $1`,
      [assessmentId]
    )
    if (!client.rows[0]) return res.status(403).json({ error: 'No client record found' })
    await db.query(
      `UPDATE deliverables SET accepted_at = NOW(), accepted_by = $1 WHERE id = $2 AND client_id = $3`,
      [email, req.params.id, client.rows[0].id]
    )

    // Gap 4: Log activity
    void logActivityByAssessment(assessmentId, 'deliverable_accepted', `Deliverable #${req.params.id} accepted by prospect`)

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to accept deliverable' })
  }
})

// GET /api/portal/insights — curated research based on problem domain classification
router.get('/insights', requirePortalAuth, async (req: Request, res: Response) => {
  try {
    const { assessmentId } = req.portalUser!
    const assessment = await db.query<{ problem_domains: Array<{ domain: string }> | null }>(
      `SELECT problem_domains FROM assessments WHERE id = $1`,
      [assessmentId]
    )
    const domains: Array<{ domain: string }> = assessment.rows[0]?.problem_domains ?? []
    const domainNames = domains.map(d => d.domain.toLowerCase())

    let chunks
    if (domainNames.length > 0) {
      const conditions = domainNames.map((_d, i) => `LOWER(content) LIKE $${i + 1}`).join(' OR ')
      chunks = await db.query(
        `SELECT id, content, source_name, source_url, ingested_at FROM knowledge_chunks
         WHERE is_active = true AND source_url IS NOT NULL AND (${conditions})
         ORDER BY ingested_at DESC LIMIT 12`,
        domainNames.map(d => `%${d}%`)
      )
    } else {
      chunks = await db.query(
        `SELECT id, content, source_name, source_url, ingested_at FROM knowledge_chunks
         WHERE is_active = true AND source_url IS NOT NULL ORDER BY ingested_at DESC LIMIT 8`
      )
    }
    res.json(chunks.rows)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch insights' })
  }
})
// GET /api/portal/deliverables/:id/file — serve file from DB for prospects
router.get('/deliverables/:id/file', requirePortalAuth, async (req: Request, res: Response) => {
  try {
    const { assessmentId } = req.portalUser!
    // Verify visibility + association
    const result = await db.query(`
      SELECT d.file_data, d.file_name, d.file_mime 
      FROM deliverables d
      JOIN clients c ON d.client_id = c.id
      WHERE d.id = $1 AND c.assessment_id = $2 AND d.portal_visible = true
    `, [req.params.id, assessmentId])

    const file = result.rows[0]
    if (!file || !file.file_data) return res.status(404).json({ error: 'File not found or not visible' })

    res.setHeader('Content-Type', file.file_mime)
    res.setHeader('Content-Disposition', `attachment; filename="${file.file_name}"`)
    res.send(file.file_data)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch file' })
  }
})

export default router
