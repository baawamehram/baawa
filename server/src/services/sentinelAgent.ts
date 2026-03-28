import { db } from '../db/client'
import { callLLM } from './llm-provider'

export interface SentinelFinding {
  type: 'friction' | 'optimization' | 'anomaly'
  observation: string
  proposal: string
  behavioral_frame: string
}

export async function conductDiscovery(sessionId: string): Promise<SentinelFinding[]> {
  // 1. Fetch Assessment & Analytics
  const sessionResult = await db.query(`
    SELECT s.id, s.transcript, a.email, a.score, an.events, an.health_score, an.last_input_method
    FROM sessions s
    LEFT JOIN assessments a ON s.id = a.id
    LEFT JOIN session_analytics an ON s.id = an.session_id
    WHERE s.id = $1
  `, [sessionId])

  if (sessionResult.rows.length === 0) return []
  const session = sessionResult.rows[0]

  // 2. Prepare context for AI Discovery
  const context = {
    transcript: session.transcript,
    analytics: {
      health_score: session.health_score,
      last_input_method: session.last_input_method,
      events: session.events
    }
  }

  const prompt = `
    You are the "Cosmic Sentinel," an AI diagnostic agent for a high-end strategic consultancy.
    Your job is to analyze the "Golden Path" of this specific customer journey and find friction points or strategic opportunities.
    
    ANALYSIS DATA:
    ${JSON.stringify(context, null, 2)}
    
    BEHAVIORAL FRAMES (Rory Sutherland Principles):
    - "Signaling": Is the founder trying to look good rather than being honest?
    - "Perceived Value": Is the assessment feeling tedious rather than valuable?
    - "Choice Architecture": Are we overwhelming them with complex adaptive questions?
    - "Psychological Moonshot": Is there a small change that could disproportionately improve engagement?
    
    TASKS:
    1. Identify specific friction points (e.g., "Latency spike on question 3", "Mood drop in transcript").
    2. Propose a targeted optimization.
    3. Categorize types: 'friction', 'optimization', 'anomaly'.
    
    RESPOND ONLY IN JSON FORMAT:
    [
      {
        "type": "friction",
        "observation": "Founder paused for 24s on the pricing question...",
        "proposal": "Use a 'Chunking' strategy to break the pricing question into context then ask.",
        "behavioral_frame": "Choice Architecture"
      }
    ]
  `

  try {
    const { text: response } = await callLLM({
      messages: [{ role: 'user', content: prompt }],
      systemPrompt: 'You are the Cosmic Sentinel, a behavioral diagnostic expert.',
      chain: 'optimizer',
      maxTokens: 1000
    })

    const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim()
    const findings: SentinelFinding[] = JSON.parse(cleanJson)

    // 3. Persist findings
    for (const f of findings) {
      await db.query(`
        INSERT INTO sentinel_proposals (session_id, type, observation, proposal, behavioral_frame)
        VALUES ($1, $2, $3, $4, $5)
      `, [sessionId, f.type, f.observation, f.proposal, f.behavioral_frame])
    }

    return findings
  } catch (err) {
    console.error('[Sentinel] Discovery failed:', err)
    return []
  }
}

export async function getSessionFindings(sessionId: string) {
  const result = await db.query(`
    SELECT * FROM sentinel_proposals WHERE session_id = $1 ORDER BY created_at DESC
  `, [sessionId])
  return result.rows
}

export async function getAllOpenFindings() {
  const result = await db.query(`
    SELECT sp.*, a.email as founder_email
    FROM sentinel_proposals sp
    LEFT JOIN assessments a ON sp.session_id = a.id
    WHERE sp.status = 'open'
    ORDER BY sp.created_at DESC
  `)
  return result.rows
}
