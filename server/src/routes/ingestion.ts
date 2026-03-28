import { Router, type Request, type Response } from 'express'
import { runFullIngestion, getIngestionStatus } from '../services/ingestion'

const router = Router()

function requireAdmin(req: Request, res: Response): boolean {
  const key = req.headers.authorization?.replace('Bearer ', '')
  if (!key || key !== process.env.FOUNDER_API_KEY) {
    res.status(401).json({ error: 'Unauthorized' })
    return false
  }
  return true
}

// POST /api/admin/ingest — kick off background ingestion
router.post('/', (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return

  // Fire and forget — do NOT await
  void runFullIngestion()

  res.json({
    status: 'started',
    message: 'Knowledge base ingestion running in background. Poll /api/admin/ingest/status for progress.',
  })
})

// GET /api/admin/ingest/status — live status + per-source chunk counts
router.get('/status', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return
  try {
    const status = await getIngestionStatus()
    res.json(status)
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

export default router
