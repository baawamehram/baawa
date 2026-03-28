import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import { db } from '../db/client'
import { getActiveConfig, invalidateConfigCache } from '../services/journeyConfig'
import { runOptimizer } from '../services/journeyOptimizer'

const router = Router()

// GET /api/journey/intro — public, no auth
// Returns the active intro_messages array for the frontend typewriter
router.get('/intro', async (_req: Request, res: Response) => {
  try {
    const config = await getActiveConfig()
    res.json({ messages: config.intro_messages })
  } catch {
    res.status(500).json({ error: 'Failed to load intro messages' })
  }
})

// POST /api/journey/optimize — trigger optimizer run (auth required)
router.post('/optimize', requireAuth, async (_req: Request, res: Response) => {
  try {
    const result = await runOptimizer()
    res.json(result)
  } catch (err) {
    console.error('POST /journey/optimize error:', err)
    res.status(500).json({ error: 'Optimizer run failed' })
  }
})

// GET /api/journey/config — list all versions (auth required)
router.get('/config', requireAuth, async (_req: Request, res: Response) => {
  try {
    const result = await db.query(
      `SELECT id, version, status, change_summary, risk_level,
              metrics_snapshot, activated_at, created_at
       FROM journey_config
       ORDER BY version DESC`
    )
    res.json(result.rows)
  } catch (err) {
    console.error('GET /journey/config error:', err)
    res.status(500).json({ error: 'Failed to load config list' })
  }
})

// GET /api/journey/config/:id — full detail including prompt and reasoning (auth required)
router.get('/config/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await db.query(
      'SELECT * FROM journey_config WHERE id = $1',
      [req.params.id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Config not found' })
    res.json(result.rows[0])
  } catch (err) {
    console.error('GET /journey/config/:id error:', err)
    res.status(500).json({ error: 'Failed to load config' })
  }
})

// POST /api/journey/config/:id/activate — approve a proposed config (auth required)
router.post('/config/:id/activate', requireAuth, async (req: Request, res: Response) => {
  const client = await db.connect()
  try {
    await client.query('BEGIN')

    const configResult = await client.query(
      `SELECT id, version FROM journey_config WHERE id = $1 AND status = 'proposed'`,
      [req.params.id]
    )
    if (configResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Proposed config not found' })
    }

    await client.query(
      `UPDATE journey_config SET status = 'archived' WHERE status = 'active'`
    )
    await client.query(
      `UPDATE journey_config SET status = 'active', activated_at = NOW() WHERE id = $1`,
      [req.params.id]
    )

    await client.query('COMMIT')
    await invalidateConfigCache()
    res.json({ activated: true })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('POST /journey/config/:id/activate error:', err)
    res.status(409).json({ error: 'Activation conflict — another config may have been activated simultaneously' })
  } finally {
    client.release()
  }
})

// POST /api/journey/config/:id/dismiss — reject a proposed config (auth required)
router.post('/config/:id/dismiss', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await db.query(
      `UPDATE journey_config SET status = 'dismissed'
       WHERE id = $1 AND status = 'proposed'
       RETURNING id`,
      [req.params.id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Proposed config not found' })
    res.json({ dismissed: true })
  } catch (err) {
    console.error('POST /journey/config/:id/dismiss error:', err)
    res.status(500).json({ error: 'Failed to dismiss config' })
  }
})

// GET /api/journey/metrics — completion rate, answer depth, score distribution (auth required)
router.get('/metrics', requireAuth, async (_req: Request, res: Response) => {
  try {
    const windows = [30, 60, 90]
    const results: Record<string, unknown> = {}

    for (const days of windows) {
      const r = await db.query(
        `SELECT
          COUNT(*) FILTER (WHERE completed = true) AS completed_count,
          COUNT(*) FILTER (WHERE completed = false) AS abandoned_count,
          ROUND(AVG(avg_answer_words) FILTER (WHERE completed = true)::numeric, 1) AS avg_answer_words,
          ROUND(AVG(score) FILTER (WHERE completed = true)::numeric, 1) AS score_mean,
          ROUND(STDDEV(score) FILTER (WHERE completed = true)::numeric, 1) AS score_std,
          COUNT(*) FILTER (WHERE score BETWEEN 0 AND 20) AS bucket_0_20,
          COUNT(*) FILTER (WHERE score BETWEEN 21 AND 40) AS bucket_21_40,
          COUNT(*) FILTER (WHERE score BETWEEN 41 AND 60) AS bucket_41_60,
          COUNT(*) FILTER (WHERE score BETWEEN 61 AND 80) AS bucket_61_80,
          COUNT(*) FILTER (WHERE score BETWEEN 81 AND 100) AS bucket_81_100
         FROM session_analytics
         WHERE created_at > NOW() - INTERVAL '${days} days'`,
        []
      )
      const row = r.rows[0]
      const completed = parseInt(row.completed_count)
      const abandoned = parseInt(row.abandoned_count)
      const total = completed + abandoned
      results[`${days}d`] = {
        completion_rate: total > 0 ? Math.round((completed / total) * 1000) / 10 : null,
        avg_answer_words: row.avg_answer_words ? parseFloat(row.avg_answer_words) : null,
        score_mean: row.score_mean ? parseFloat(row.score_mean) : null,
        score_std: row.score_std ? parseFloat(row.score_std) : null,
        score_distribution: {
          '0-20': parseInt(row.bucket_0_20),
          '21-40': parseInt(row.bucket_21_40),
          '41-60': parseInt(row.bucket_41_60),
          '61-80': parseInt(row.bucket_61_80),
          '81-100': parseInt(row.bucket_81_100),
        },
      }
    }

    const activeConfig = await db.query(
      `SELECT version, activated_at FROM journey_config WHERE status = 'active' LIMIT 1`
    )

    res.json({
      windows: results,
      active_config_version: activeConfig.rows[0]?.version ?? null,
      active_config_activated_at: activeConfig.rows[0]?.activated_at ?? null,
    })
  } catch (err) {
    console.error('GET /journey/metrics error:', err)
    res.status(500).json({ error: 'Failed to load metrics' })
  }
})

// GET /api/journey/funnel — aggregated funnel stats from events JSONB
router.get('/funnel', requireAuth, async (_req: Request, res: Response) => {
  try {
    const result = await db.query(`
      WITH exploded_events AS (
        SELECT 
          (jsonb_array_elements(events)->>'step')::int as step,
          (jsonb_array_elements(events)->>'latency')::float as latency,
          (jsonb_array_elements(events)->>'inputType') as input_type,
          (jsonb_array_elements(events)->>'words')::int as words
        FROM session_analytics
        WHERE created_at > NOW() - INTERVAL '30 days'
      )
      SELECT 
        step,
        COUNT(*) as count,
        ROUND(AVG(latency)::numeric, 1) as avg_latency,
        ROUND((COUNT(*) FILTER (WHERE input_type = 'voice')::float / NULLIF(COUNT(*), 0) * 100)::numeric, 1) as voice_ratio,
        ROUND(AVG(words)::numeric, 1) as avg_words
      FROM exploded_events
      WHERE step IS NOT NULL
      GROUP BY step
      ORDER BY step ASC
    `)

    const totalStarted = await db.query("SELECT COUNT(*) FROM sessions WHERE created_at > NOW() - INTERVAL '30 days'")
    
    res.json({
      steps: result.rows,
      totalStarted: parseInt(totalStarted.rows[0].count)
    })
  } catch (err) {
    console.error('GET /journey/funnel error:', err)
    res.status(500).json({ error: 'Failed to load funnel stats' })
  }
})

// GET /api/journey/suggestions — smart actionable suggestions (auth required)
router.get('/suggestions', requireAuth, async (_req: Request, res: Response) => {
  try {
    const suggestions: any[] = []

    // 1. High-value leads pending review
    const highLeads = await db.query(
      `SELECT id, email, founder_name, company_name, score
       FROM assessments WHERE status = 'pending' AND score >= 70
       ORDER BY score DESC LIMIT 5`
    )
    highLeads.rows.forEach(l => {
      suggestions.push({
        type: 'lead',
        priority: 'high',
        title: `High-Value Lead: ${l.founder_name || l.email}`,
        description: `${l.founder_name || 'A founder'} from ${l.company_name || 'a new company'} scored ${l.score}/100. They are a prime candidate for onboarding.`,
        action_label: 'View Submission',
        link: `/assessments/${l.id}`
      })
    })

    // 2. Upcoming deliverables
    const dueDeliverables = await db.query(
      `SELECT d.id, d.title, d.due_date, c.founder_name, c.company_name
       FROM deliverables d
       JOIN clients c ON d.client_id = c.id
       WHERE d.status IN ('pending', 'in_progress')
       AND d.due_date <= (NOW() + INTERVAL '7 days')::date
       ORDER BY d.due_date ASC LIMIT 5`
    )
    dueDeliverables.rows.forEach(d => {
      suggestions.push({
        type: 'work',
        priority: d.due_date <= new Date().toISOString().split('T')[0] ? 'high' : 'medium',
        title: `Deliverable Due: ${d.title}`,
        description: `Working with ${d.founder_name} (${d.company_name}). Due on ${new Date(d.due_date).toLocaleDateString()}.`,
        action_label: 'Manage Deliverables',
        link: `/clients` // ideally link to specific client, but /clients works for now
      })
    })

    // 3. Funnel performance
    const completionRes = await db.query(
      `SELECT
         (COUNT(*) FILTER (WHERE completed = true)::float / NULLIF(COUNT(*), 0)) * 100 as rate
       FROM session_analytics
       WHERE created_at > NOW() - INTERVAL '30 days'`
    )
    const rate = completionRes.rows[0]?.rate
    if (rate !== null && rate < 40) {
      suggestions.push({
        type: 'system',
        priority: 'medium',
        title: 'Low Funnel Completion Rate',
        description: `Completion rate is at ${Math.round(rate)}% over the last 30 days. Consider running the AI Journey Optimizer to reduce drop-offs.`,
        action_label: 'Open Intelligence',
        link: '/intelligence'
      })
    }

    res.json(suggestions)
  } catch (err) {
    console.error('GET /journey/suggestions error:', err)
    res.status(500).json({ error: 'Failed to generate suggestions' })
  }
})

export default router
