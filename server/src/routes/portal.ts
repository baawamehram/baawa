import { Router, Request, Response } from 'express'
import { z } from 'zod'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { db } from '../db/client'
import { sendMagicLink } from '../services/email'
import { requirePortalAuth } from '../middleware/portalAuth'

const router = Router()

const JWT_SECRET = process.env.PORTAL_JWT_SECRET ?? 'dev-secret'
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173'
const TOKEN_REGEX = /^[0-9a-f]{64}$/

// POST /api/portal/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const parsed = z.object({ email: z.string().email() }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Invalid email' })

    const { email } = parsed.data

    const assessmentResult = await db.query<{ id: number }>(
      `SELECT id FROM assessments WHERE email = $1 ORDER BY created_at DESC LIMIT 1`,
      [email]
    )

    if (assessmentResult.rows[0]) {
      const assessmentId = assessmentResult.rows[0].id

      // Delete any existing unexpired tokens for this assessment
      await db.query(
        `DELETE FROM portal_tokens WHERE assessment_id = $1 AND expires_at > NOW()`,
        [assessmentId]
      )

      const token = crypto.randomBytes(32).toString('hex')
      await db.query(
        `INSERT INTO portal_tokens (assessment_id, token, expires_at) VALUES ($1, $2, NOW() + interval '15 minutes')`,
        [assessmentId, token]
      )

      const magicLink = `${FRONTEND_URL}/portal/verify?token=${token}`
      void sendMagicLink(email, magicLink).catch((e) => console.error('sendMagicLink failed:', e))
    }

    // Always return ok — prevents email enumeration
    res.json({ ok: true })
  } catch (err) {
    console.error('POST /portal/login error:', err)
    res.status(500).json({ error: 'Failed to send login link' })
  }
})

// POST /api/portal/verify
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const parsed = z.object({ token: z.string() }).safeParse(req.body)
    if (!parsed.success || !TOKEN_REGEX.test(parsed.data.token)) {
      return res.status(400).json({ error: 'Invalid token format' })
    }

    const { token } = parsed.data

    const result = await db.query<{ id: number; assessment_id: number }>(
      `SELECT id, assessment_id FROM portal_tokens WHERE token = $1 AND expires_at > NOW()`,
      [token]
    )

    if (!result.rows[0]) {
      return res.status(400).json({ error: 'Link has expired or is invalid. Request a new one.' })
    }

    const { id: tokenId, assessment_id: assessmentId } = result.rows[0]

    // Get email for JWT payload
    const assessmentResult = await db.query<{ email: string }>(
      `SELECT email FROM assessments WHERE id = $1`,
      [assessmentId]
    )
    if (!assessmentResult.rows[0]) {
      return res.status(400).json({ error: 'Assessment not found' })
    }

    // Delete token (one-time use)
    await db.query(`DELETE FROM portal_tokens WHERE id = $1`, [tokenId])

    const jwtPayload = { assessmentId, email: assessmentResult.rows[0].email }
    const signedToken = jwt.sign(jwtPayload, JWT_SECRET, { expiresIn: '7d' })

    res.cookie('portal_token', signedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
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
      `SELECT id, email, created_at, conversation, results_unlocked,
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
    res.json({ ok: true })
  } catch (err) {
    console.error('POST /portal/messages error:', err)
    res.status(500).json({ error: 'Failed to send message' })
  }
})

export default router
