import { db } from '../db/client'

/**
 * Log an activity for a client.
 * Does not block/throw to ensure main flow integrity.
 */
export async function logActivity(clientId: number, type: string, description: string): Promise<void> {
  try {
    await db.query(
      'INSERT INTO activities (client_id, type, description) VALUES ($1, $2, $3)',
      [clientId, type, description]
    )
  } catch (err) {
    console.error(`Failed to log activity [${type}] for client ${clientId}:`, err)
  }
}

/**
 * Log an activity based on assessment ID (useful for portal events where clientId is unknown but can be resolved).
 */
export async function logActivityByAssessment(assessmentId: number, type: string, description: string): Promise<void> {
  try {
    const result = await db.query<{ id: number }>('SELECT id FROM clients WHERE assessment_id = $1', [assessmentId])
    const clientId = result.rows[0]?.id
    if (clientId) {
      await logActivity(clientId, type, description)
    }
  } catch (err) {
    console.warn(`logActivityByAssessment failed: Could not resolve client for assessment ${assessmentId}`)
  }
}
