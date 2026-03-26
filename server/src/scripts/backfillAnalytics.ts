import 'dotenv/config'
import { db } from '../db/client'
import { ConversationTurn } from '../services/questioning'

function computeAnswerStats(conversation: ConversationTurn[]) {
  const userTurns = conversation.filter((t) => t.role === 'user')
  if (userTurns.length === 0) {
    return { question_count: 0, avg: null, min: null, max: null }
  }
  const wc = userTurns.map((t) => t.content.trim().split(/\s+/).length)
  return {
    question_count: userTurns.length,
    avg: wc.reduce((a, b) => a + b, 0) / wc.length,
    min: Math.min(...wc),
    max: Math.max(...wc),
  }
}

async function backfill() {
  console.log('Starting session_analytics backfill...')

  // Get all sessions that don't already have an analytics row
  const sessions = await db.query<{
    id: string
    conversation: ConversationTurn[]
    question_count: number
    journey_config_version: number | null
  }>(
    `SELECT s.id, s.conversation, s.question_count, s.journey_config_version
     FROM sessions s
     LEFT JOIN session_analytics sa ON sa.session_id = s.id
     WHERE sa.session_id IS NULL`
  )

  console.log(`Found ${sessions.rows.length} sessions without analytics rows`)

  let inserted = 0
  for (const session of sessions.rows) {
    // Check if this session has a completed assessment
    const assessment = await db.query<{
      id: number
      score: number
      score_breakdown: Record<string, number>
    }>(
      'SELECT id, score, score_breakdown FROM assessments WHERE session_id = $1 LIMIT 1',
      [session.id]
    )

    const stats = computeAnswerStats(session.conversation)
    const hasAssessment = assessment.rows.length > 0
    const a = hasAssessment ? assessment.rows[0] : null

    try {
      await db.query(
        `INSERT INTO session_analytics
         (session_id, assessment_id, completed, question_count,
          avg_answer_words, min_answer_words, max_answer_words,
          drop_off_at_question, score, score_breakdown, journey_config_version)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (session_id) DO NOTHING`,
        [
          session.id,
          a?.id ?? null,
          hasAssessment,
          stats.question_count,
          stats.avg,
          stats.min,
          stats.max,
          hasAssessment ? null : (stats.question_count > 0 ? stats.question_count - 1 : null),
          a?.score ?? null,
          a?.score_breakdown ? JSON.stringify(a.score_breakdown) : null,
          session.journey_config_version ?? 1,
        ]
      )
      inserted++
    } catch (e) {
      console.error(`Failed to insert analytics for session ${session.id}:`, e)
    }
  }

  console.log(`Backfill complete — inserted ${inserted} rows`)
  await db.end()
}

backfill().catch((err) => {
  console.error('Backfill failed:', err)
  process.exit(1)
})
