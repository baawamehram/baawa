import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { db } from '../db/client'
import { geolocateIP } from '../services/geo'
import { ConversationTurn, QUESTION_BANK, getQuestion, QuestionType } from '../services/questioning'
import { scoreConversationHybrid } from '../services/scoring'
import { sendProspectAck, sendFounderNotification } from '../services/email'
import { sendConfirmationOnComplete } from '../services/emailScheduler'
import { getActiveConfig } from '../services/journeyConfig'
import { classifyProblemDomains } from '../services/classification'

const router = Router()

// POST /api/sessions/start
// Creates a session, geolocates IP, generates Q1
router.post('/start', async (req: Request, res: Response) => {
  try {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      ?? req.socket.remoteAddress
      ?? '127.0.0.1'

    const geo = await geolocateIP(ip)

    // Parse optional intake fields from request body
    const intake = z.object({
      name: z.string().optional(),
      region: z.string().optional(),
      language: z.string().optional(),
      email: z.string().email().optional(),
    }).safeParse(req.body);
    const intakeData = intake.success ? intake.data : {};

    const sessionResult = await db.query<{ id: string }>(
      `INSERT INTO sessions (ip_address, city, country, lat, lon, name, region, language, email)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        ip,
        geo?.city ?? null,
        geo?.country ?? null,
        geo?.lat ?? null,
        geo?.lon ?? null,
        intakeData.name ?? null,
        intakeData.region ?? null,
        intakeData.language ?? null,
        intakeData.email ?? null,
      ]
    )
    const sessionId = sessionResult.rows[0].id

    // Stamp the active config version before generating Q1
    const config = await getActiveConfig()
    await db.query(
      `UPDATE sessions SET journey_config_version = $1 WHERE id = $2`,
      [config.version, sessionId]
    )

    // Get Q1 from question bank
    const q1 = QUESTION_BANK[0]
    const q1Turn: ConversationTurn = {
      role: 'assistant',
      content: q1.question,
      questionType: q1.type as QuestionType
    }

    // Store Q1 in conversation
    await db.query(
      `UPDATE sessions SET conversation = $1, question_count = 1 WHERE id = $2`,
      [JSON.stringify([q1Turn]), sessionId]
    )

    res.json({
      sessionId,
      question: q1.question,
      questionType: q1.type,
      city: geo?.city ?? null,
      country: geo?.country ?? null,
    })
  } catch (err) {
    console.error('POST /sessions/start error:', err)
    res.status(500).json({ error: 'Failed to start session' })
  }
})

// POST /api/sessions/:id/answer
// Submits structured answer, returns next question from question bank
router.post('/:id/answer', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    // Accept structured answer format
    const answerSchema = z.discriminatedUnion('type', [
      z.object({ type: z.literal('open_text'), value: z.string().min(1).max(5000) }),
      z.object({ type: z.literal('mcq'), value: z.string().min(1).max(500) }),
      z.object({ type: z.literal('slider'), value: z.number().min(0).max(10) }),
      z.object({ type: z.literal('ranking'), value: z.array(z.string()).min(1).max(10) }),
    ])

    const parsed = z.object({
      questionIndex: z.number().int().min(0).max(7),
      payload: answerSchema,
      displayText: z.string().min(1).max(5000),
      inputType: z.enum(['voice', 'text', 'click', 'drag']).optional(),
      clientLatency: z.number().optional()
    }).safeParse(req.body)

    if (!parsed.success) {
      console.error('Answer validation error:', parsed.error.errors)
      return res.status(400).json({ error: 'Invalid answer format', details: parsed.error.errors })
    }

    const { questionIndex, payload, displayText, inputType, clientLatency } = parsed.data

    const sessionResult = await db.query<{
      conversation: ConversationTurn[]
      question_count: number
      status: string
      journey_config_version: number | null
    }>(
      'SELECT conversation, question_count, status, journey_config_version FROM sessions WHERE id = $1',
      [id]
    )

    if (!sessionResult.rows[0]) return res.status(404).json({ error: 'Session not found' })
    const session = sessionResult.rows[0]
    if (session.status !== 'active') return res.status(400).json({ error: 'Session already completed' })

    const conversation = session.conversation

    // Hard cap at 8 questions (new system)
    if (session.question_count >= 8) {
      await db.query(`UPDATE sessions SET status = 'completed' WHERE id = $1`, [id])
      return res.json({ done: true })
    }

    // Append the founder's structured answer
    const userTurn: ConversationTurn = {
      role: 'user',
      content: displayText,
      questionType: payload.type,
      structuredAnswer: {
        type: payload.type,
        value: payload.value,
        displayText
      }
    }

    const updatedConversation: ConversationTurn[] = [
      ...conversation,
      userTurn,
    ]

    // --- REAL-TIME HEARTBEAT (Update Analytics) ---
    void (async () => {
      try {
        const stats = computeAnswerStats(updatedConversation)
        const newEvent = {
          step: session.question_count,
          inputType: inputType ?? 'unknown',
          latency: clientLatency ?? 0,
          words: displayText.trim().split(/\s+/).length,
          timestamp: new Date().toISOString()
        }

        await db.query(
          `INSERT INTO session_analytics
           (session_id, question_count, avg_answer_words, min_answer_words, max_answer_words, drop_off_at_question, journey_config_version, events, last_input_method)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (session_id) DO UPDATE SET
             question_count = EXCLUDED.question_count,
             avg_answer_words = EXCLUDED.avg_answer_words,
             min_answer_words = EXCLUDED.min_answer_words,
             max_answer_words = EXCLUDED.max_answer_words,
             drop_off_at_question = EXCLUDED.question_count,
             events = session_analytics.events || EXCLUDED.events,
             last_input_method = EXCLUDED.last_input_method`,
          [
            id,
            stats.question_count,
            stats.avg_answer_words,
            stats.min_answer_words,
            stats.max_answer_words,
            stats.question_count,
            session.journey_config_version,
            JSON.stringify([newEvent]),
            inputType ?? 'unknown'
          ]
        )
      } catch (e) {
        console.error('[heartbeat] Failed to update analytics:', e)
      }
    })()

    // Check if this is the last question
    if (questionIndex >= 7) {
      // Question 8 submitted — signal done
      await db.query(
        `UPDATE sessions SET conversation = $1, status = 'completed' WHERE id = $2`,
        [JSON.stringify(updatedConversation), id]
      )
      return res.json({ done: true })
    }

    // Get next question from bank
    const nextQuestion = getQuestion(questionIndex + 1)
    if (!nextQuestion) {
      await db.query(
        `UPDATE sessions SET conversation = $1, status = 'completed' WHERE id = $2`,
        [JSON.stringify(updatedConversation), id]
      )
      return res.json({ done: true })
    }

    // Append the next question
    const nextQuestionTurn: ConversationTurn = {
      role: 'assistant',
      content: nextQuestion.question,
      questionType: nextQuestion.type as QuestionType,
      options: nextQuestion.options,
      sliderConfig: nextQuestion.sliderConfig
    }

    const newConversation: ConversationTurn[] = [
      ...updatedConversation,
      nextQuestionTurn,
    ]

    await db.query(
      `UPDATE sessions SET conversation = $1, question_count = question_count + 1 WHERE id = $2`,
      [JSON.stringify(newConversation), id]
    )

    res.json({
      question: nextQuestion.question,
      questionType: nextQuestion.type,
      options: nextQuestion.options,
      sliderConfig: nextQuestion.sliderConfig,
      done: false
    })
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
    const parsed = z.object({
      email: z.string().email(),
      phone: z.string().optional(),
    }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Invalid email' })

    const { email: rawEmail, phone } = parsed.data
    const email = rawEmail.toLowerCase().trim()

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

    // Removed duplicate email check to support multiple submissions per user

    const scoring = await scoreConversationHybrid(session.conversation)

    const sessionData = await db.query<{ name: string | null }>(
      'SELECT name FROM sessions WHERE id = $1',
      [id]
    )

    const assessmentResult = await db.query<{ id: number }>(
      `INSERT INTO assessments
       (session_id, email, phone, city, country, conversation, score, score_breakdown, score_summary, biggest_opportunity, biggest_risk, founder_name, company_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING id`,
      [
        id,
        email,
        phone ?? null,
        session.city,
        session.country,
        JSON.stringify(session.conversation),
        scoring.score,
        JSON.stringify(scoring.breakdown),
        scoring.summary,
        scoring.biggest_opportunity,
        scoring.biggest_risk,
        sessionData.rows[0]?.name ?? null,
        scoring.company_name ?? null // Scoring engine usually extracts company
      ]
    )

    // Fire emails (non-blocking — don't fail the request if email fails)
    void sendProspectAck(email).catch((e) => console.error('Prospect ACK email failed:', e))
    void sendFounderNotification(
      email, scoring.score, scoring.summary,
      scoring.biggest_opportunity, scoring.biggest_risk
    ).catch((e) => console.error('Founder notification failed:', e))

    res.json({ assessmentId: assessmentResult.rows[0].id })

    // Send confirmation email — fire and forget, non-critical
    void sendConfirmationOnComplete(assessmentResult.rows[0].id).catch((e) =>
      console.error('Confirmation email failed:', e)
    )

    // Classify problem domains — fire and forget, non-critical
    void (async () => {
      try {
        const domains = await classifyProblemDomains(session.conversation)
        if (domains.length > 0) {
          await db.query(
            `UPDATE assessments SET problem_domains = $1 WHERE id = $2`,
            [JSON.stringify(domains), assessmentResult.rows[0].id]
          )
        }
      } catch (e) {
        console.warn('[classification] Failed:', (e as Error).message)
      }
    })()

    // Insert session_analytics row — non-blocking, non-critical
    void (async () => {
      try {
        const sessionFull = await db.query<{
          conversation: ConversationTurn[]
          journey_config_version: number | null
        }>(
          'SELECT conversation, journey_config_version FROM sessions WHERE id = $1',
          [id]
        )
        const s = sessionFull.rows[0]
        if (!s) return

        const stats = computeAnswerStats(s.conversation)
        await db.query(
          `INSERT INTO session_analytics
           (session_id, assessment_id, completed, question_count,
            avg_answer_words, min_answer_words, max_answer_words,
            drop_off_at_question, score, score_breakdown, journey_config_version)
           VALUES ($1, $2, true, $3, $4, $5, $6, NULL, $7, $8, $9)
           ON CONFLICT (session_id) DO NOTHING`,
          [
            id,
            assessmentResult.rows[0].id,
            stats.question_count,
            stats.avg_answer_words,
            stats.min_answer_words,
            stats.max_answer_words,
            scoring.score,
            JSON.stringify(scoring.breakdown),
            s.journey_config_version,
          ]
        )
      } catch (e) {
        console.error('session_analytics insert failed (non-critical):', e)
      }
    })()
  } catch (err) {
    console.error('POST /sessions/:id/complete error:', err)
    res.status(500).json({ error: 'Failed to complete session' })
  }
})

function computeAnswerStats(conversation: ConversationTurn[]): {
  question_count: number
  avg_answer_words: number | null
  min_answer_words: number | null
  max_answer_words: number | null
} {
  const userTurns = conversation.filter((t) => t.role === 'user')
  if (userTurns.length === 0) {
    return { question_count: 0, avg_answer_words: null, min_answer_words: null, max_answer_words: null }
  }
  const wordCounts = userTurns.map((t) => t.content.trim().split(/\s+/).length)
  return {
    question_count: userTurns.length,
    avg_answer_words: wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length,
    min_answer_words: Math.min(...wordCounts),
    max_answer_words: Math.max(...wordCounts),
  }
}

export default router
