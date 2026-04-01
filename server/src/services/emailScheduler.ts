import cron from 'node-cron'
import { db } from '../db/client'
import {
  sendConfirmationEmail,
  sendValueReminderEmail,
  sendSocialProofEmail,
  sendObjectionHandlerEmail,
  sendLastTouchEmail,
  sendReEngagementEmail,
} from './emailService'

/**
 * Email queue system - tracks which emails have been sent to each assessment
 * This prevents duplicate sends and manages segmentation (booked vs not booked)
 */

interface EmailQueueRecord {
  assessment_id: number
  email_type:
    | 'confirmation'
    | 'value_reminder'
    | 'social_proof'
    | 'objection_handler'
    | 'last_touch'
    | 'pre_call'
    | 'post_call'
    | 'reengagement'
  sent_at: Date
}

/**
 * Initialize email queue table on startup
 */
export async function initializeEmailQueue() {
  try {
    // Note: email_queue is created by index.ts migrations, but we ensure the schema is correct here

    // Verify email_queue exists and has assessment_id column
    const tableCheckResult = await db.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'email_queue' AND column_name = 'assessment_id'
    `)

    if (tableCheckResult.rows.length === 0) {
      console.warn('⚠️ email_queue table missing assessment_id column, attempting migration...')
      try {
        await db.query(`
          ALTER TABLE email_queue ADD COLUMN assessment_id INTEGER REFERENCES assessments(id)
        `)
        console.log('✅ Added assessment_id column to email_queue')
      } catch (err) {
        console.error('Failed to add assessment_id column:', err)
      }
    }

    // Create indices for faster lookups if they don't exist
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_email_queue_assessment
      ON email_queue(assessment_id, email_type)
    `)

    console.log('✅ Email queue initialized')
  } catch (err) {
    console.error('Failed to initialize email queue:', err)
  }
}

/**
 * Check if an email has already been sent
 */
async function hasEmailBeenSent(
  assessmentId: number,
  emailType: EmailQueueRecord['email_type']
): Promise<boolean> {
  const result = await db.query(
    'SELECT 1 FROM email_queue WHERE assessment_id = $1 AND email_type = $2 LIMIT 1',
    [assessmentId, emailType]
  )
  return result.rows.length > 0
}

/**
 * Record email as sent
 */
async function recordEmailSent(assessmentId: number, emailType: EmailQueueRecord['email_type']) {
  await db.query(
    'INSERT INTO email_queue (assessment_id, email_type) VALUES ($1, $2)',
    [assessmentId, emailType]
  )
}

/**
 * Get assessment data needed for email context
 */
async function getAssessmentForEmail(assessmentId: number) {
  const result = await db.query(
    `SELECT
      id, email,
      (SELECT name FROM sessions WHERE assessment_id = $1 LIMIT 1) as name,
      (SELECT id FROM sessions WHERE assessment_id = $1 LIMIT 1) as session_id,
      (SELECT created_at FROM sessions WHERE assessment_id = $1 LIMIT 1) as completed_at,
      (SELECT selected_slot FROM call_slots WHERE assessment_id = $1 LIMIT 1) as call_booked
    FROM assessments WHERE id = $1`,
    [assessmentId]
  )
  return result.rows[0]
}

/**
 * Email 1: Send confirmation immediately on assessment completion
 * Triggered from POST /api/sessions/:id/complete
 */
export async function sendConfirmationOnComplete(assessmentId: number) {
  try {
    if (await hasEmailBeenSent(assessmentId, 'confirmation')) {
      return // Already sent
    }

    const assessment = await getAssessmentForEmail(assessmentId)
    if (!assessment || !assessment.email || !assessment.name) {
      console.error(`Cannot send confirmation: missing data for assessment ${assessmentId}`)
      return
    }

    await sendConfirmationEmail({
      email: assessment.email,
      name: assessment.name,
      assessmentId,
      sessionId: assessment.session_id,
      completedAt: assessment.completed_at,
    })

    await recordEmailSent(assessmentId, 'confirmation')
  } catch (err) {
    console.error(`Failed to send confirmation email for assessment ${assessmentId}:`, err)
  }
}

/**
 * Cron: Run every minute to check for scheduled emails
 * This handles all delayed email sends
 */
export function startEmailScheduler() {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      await processScheduledEmails()
    } catch (err) {
      console.error('Email scheduler error:', err)
    }
  })

  console.log('✉️  Email scheduler started')
}

/**
 * Process all pending scheduled emails
 */
async function processScheduledEmails() {
  const assessments = await db.query(`
    SELECT a.id, a.email,
      (SELECT name FROM sessions WHERE assessment_id = a.id LIMIT 1) as name,
      (SELECT id FROM sessions WHERE assessment_id = a.id LIMIT 1) as session_id,
      (SELECT created_at FROM sessions WHERE assessment_id = a.id LIMIT 1) as completed_at,
      (SELECT selected_slot FROM call_slots WHERE assessment_id = a.id LIMIT 1) as call_booked
    FROM assessments a
    WHERE a.status = 'completed'
      AND a.email IS NOT NULL
      AND (SELECT name FROM sessions WHERE assessment_id = a.id LIMIT 1) IS NOT NULL
    ORDER BY (SELECT created_at FROM sessions WHERE assessment_id = a.id LIMIT 1) DESC
    LIMIT 100
  `)

  for (const assessment of assessments.rows) {
    await processAssessmentEmails(assessment)
  }
}

/**
 * Process all pending emails for a single assessment
 */
async function processAssessmentEmails(assessment: any) {
  const assessmentId = assessment.id
  const completedAt = new Date(assessment.completed_at)
  const now = new Date()
  const hoursSinceCompletion = (now.getTime() - completedAt.getTime()) / (1000 * 60 * 60)
  const hasCallBooked = !!assessment.call_booked

  // Email 2: Value Reminder (12 hours)
  if (hoursSinceCompletion >= 12 && !(await hasEmailBeenSent(assessmentId, 'value_reminder'))) {
    await sendEmail(assessmentId, 'value_reminder', async () => {
      await sendValueReminderEmail({
        email: assessment.email,
        name: assessment.name,
        assessmentId,
        sessionId: assessment.session_id,
        completedAt: completedAt,
      })
    })
  }

  // Email 3: Social Proof (18 hours)
  if (hoursSinceCompletion >= 18 && !(await hasEmailBeenSent(assessmentId, 'social_proof'))) {
    await sendEmail(assessmentId, 'social_proof', async () => {
      await sendSocialProofEmail({
        email: assessment.email,
        name: assessment.name,
        assessmentId,
        sessionId: assessment.session_id,
        completedAt: completedAt,
      })
    })
  }

  // Only send to non-bookers
  if (!hasCallBooked) {
    // Email 4: Objection Handler (24 hours)
    if (
      hoursSinceCompletion >= 24 &&
      !(await hasEmailBeenSent(assessmentId, 'objection_handler'))
    ) {
      await sendEmail(assessmentId, 'objection_handler', async () => {
        await sendObjectionHandlerEmail({
          email: assessment.email,
          name: assessment.name,
          assessmentId,
          sessionId: assessment.session_id,
          completedAt: completedAt,
          callBookingUrl: `${process.env.CLIENT_URL}/portal/login?assessmentId=${assessmentId}`,
        })
      })
    }

    // Email 5: Last Touch (36 hours)
    if (
      hoursSinceCompletion >= 36 &&
      !(await hasEmailBeenSent(assessmentId, 'last_touch'))
    ) {
      await sendEmail(assessmentId, 'last_touch', async () => {
        await sendLastTouchEmail({
          email: assessment.email,
          name: assessment.name,
          assessmentId,
          sessionId: assessment.session_id,
          completedAt: completedAt,
          callBookingUrl: `${process.env.CLIENT_URL}/portal/login?assessmentId=${assessmentId}`,
        })
      })
    }

    // Email 6b: Re-engagement (7 days)
    if (
      hoursSinceCompletion >= 168 &&
      !(await hasEmailBeenSent(assessmentId, 'reengagement'))
    ) {
      await sendEmail(assessmentId, 'reengagement', async () => {
        await sendReEngagementEmail({
          email: assessment.email,
          name: assessment.name,
          assessmentId,
          sessionId: assessment.session_id,
          completedAt: completedAt,
          topInsight: 'Focus on your market positioning clarity this month.',
        })
      })
    }
  }
}

/**
 * Wrapper to send email and record in queue with error handling
 */
async function sendEmail(
  assessmentId: number,
  emailType: EmailQueueRecord['email_type'],
  sendFn: () => Promise<any>
) {
  try {
    await sendFn()
    await recordEmailSent(assessmentId, emailType)
  } catch (err) {
    console.error(`Failed to send ${emailType} email for assessment ${assessmentId}:`, err)
  }
}
