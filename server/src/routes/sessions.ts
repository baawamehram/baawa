import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { db } from '../db/client'
import { geolocateIP } from '../services/geo'
import { generateNextQuestion, ConversationTurn } from '../services/questioning'
import { scoreConversation } from '../services/scoring'
import { sendProspectAck, sendFounderNotification } from '../services/email'

const router = Router()

// POST /api/sessions/start
// Creates a session, geolocates IP, generates Q1
router.post('/start', async (req: Request, res: Response) => {
  try {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      ?? req.socket.remoteAddress
      ?? '127.0.0.1'

    const geo = await geolocateIP(ip)

    const sessionResult = await db.query<{ id: string }>(
      `INSERT INTO sessions (ip_address, city, country, lat, lon)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [ip, geo?.city ?? null, geo?.country ?? null, geo?.lat ?? null, geo?.lon ?? null]
    )
    const sessionId = sessionResult.rows[0].id

    const { question } = await generateNextQuestion([], 'Start the interview.')

    // Store Q1 in conversation
    await db.query(
      `UPDATE sessions SET conversation = $1, question_count = 1 WHERE id = $2`,
      [JSON.stringify([{ role: 'assistant', content: question }]), sessionId]
    )

    res.json({
      sessionId,
      question,
      city: geo?.city ?? null,
      country: geo?.country ?? null,
    })
  } catch (err) {
    console.error('POST /sessions/start error:', err)
    res.status(500).json({ error: 'Failed to start session' })
  }
})

// POST /api/sessions/:id/answer
// Submits an answer, generates next question or signals done
router.post('/:id/answer', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const parsed = z.object({ answer: z.string().min(1).max(5000) }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Invalid answer' })

    const { answer } = parsed.data

    const sessionResult = await db.query<{
      conversation: ConversationTurn[]
      question_count: number
      status: string
    }>(
      'SELECT conversation, question_count, status FROM sessions WHERE id = $1',
      [id]
    )

    if (!sessionResult.rows[0]) return res.status(404).json({ error: 'Session not found' })
    const session = sessionResult.rows[0]
    if (session.status !== 'active') return res.status(400).json({ error: 'Session already completed' })

    const conversation = session.conversation

    // Server-side hard cap: if already at 25 questions, signal done
    if (session.question_count >= 25) {
      await db.query(
        `UPDATE sessions SET status = 'completed' WHERE id = $1`,
        [id]
      )
      return res.json({ done: true })
    }

    // Append the founder's answer
    const updatedConversation: ConversationTurn[] = [
      ...conversation,
      { role: 'user', content: answer },
    ]

    const result = await generateNextQuestion(updatedConversation, answer)

    if (result.done) {
      await db.query(
        `UPDATE sessions
         SET conversation = $1, status = 'completed'
         WHERE id = $2`,
        [JSON.stringify(updatedConversation), id]
      )
      return res.json({ done: true })
    }

    // Append the next question
    const newConversation: ConversationTurn[] = [
      ...updatedConversation,
      { role: 'assistant', content: result.question },
    ]

    await db.query(
      `UPDATE sessions
       SET conversation = $1, question_count = question_count + 1
       WHERE id = $2`,
      [JSON.stringify(newConversation), id]
    )

    res.json({ question: result.question, done: false })
  } catch (err) {
    console.error('POST /sessions/:id/answer error:', err)
    res.status(500).json({ error: 'Failed to process answer' })
  }
})

// POST /api/sessions/:id/complete
// Captures email, runs scoring, sends emails, creates assessment record
router.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const parsed = z.object({ email: z.string().email() }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Invalid email' })

    const { email } = parsed.data

    const sessionResult = await db.query<{
      conversation: ConversationTurn[]
      city: string | null
      country: string | null
    }>(
      'SELECT conversation, city, country FROM sessions WHERE id = $1',
      [id]
    )

    if (!sessionResult.rows[0]) return res.status(404).json({ error: 'Session not found' })
    const session = sessionResult.rows[0]

    // Check for duplicate email
    const existing = await db.query(
      'SELECT id FROM assessments WHERE email = $1',
      [email]
    )
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already submitted' })
    }

    const scoring = await scoreConversation(session.conversation)

    const assessmentResult = await db.query<{ id: number }>(
      `INSERT INTO assessments
       (session_id, email, city, country, conversation, score, score_breakdown, score_summary, biggest_opportunity, biggest_risk)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        id,
        email,
        session.city,
        session.country,
        JSON.stringify(session.conversation),
        scoring.score,
        JSON.stringify(scoring.breakdown),
        scoring.summary,
        scoring.biggest_opportunity,
        scoring.biggest_risk,
      ]
    )

    // Fire emails (non-blocking — don't fail the request if email fails)
    void sendProspectAck(email).catch((e) => console.error('Prospect ACK email failed:', e))
    void sendFounderNotification(
      email, scoring.score, scoring.summary,
      scoring.biggest_opportunity, scoring.biggest_risk
    ).catch((e) => console.error('Founder notification failed:', e))

    res.json({ assessmentId: assessmentResult.rows[0].id })
  } catch (err) {
    console.error('POST /sessions/:id/complete error:', err)
    res.status(500).json({ error: 'Failed to complete session' })
  }
})

export default router
