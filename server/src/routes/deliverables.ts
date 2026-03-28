import { Router, Request, Response } from 'express'
import { z } from 'zod'
import multer from 'multer'
import { db } from '../db/client'
import { requireAuth } from '../middleware/auth'

const router = Router()

// Setup multer for memory storage (for DB persistence)
const upload = multer({ storage: multer.memoryStorage() })

router.use(requireAuth)

// PUT /api/deliverables/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      status: z.enum(['pending', 'in_progress', 'completed']),
    })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Invalid status' })

    const completedAt = parsed.data.status === 'completed' ? 'NOW()' : null
    await db.query(
      'UPDATE deliverables SET status = $1, completed_at = $2 WHERE id = $3',
      [parsed.data.status, completedAt, req.params.id]
    )
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update deliverable' })
  }
})

// PUT /api/deliverables/:id/visibility
router.put('/:id/visibility', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      visible: z.boolean(),
    })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Invalid visibility value' })

    await db.query(
      'UPDATE deliverables SET portal_visible = $1 WHERE id = $2',
      [parsed.data.visible, req.params.id]
    )
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update visibility' })
  }
})

// POST /api/deliverables/:id/draft
router.post('/:id/draft', async (req: Request, res: Response) => {
  try {
    const { draftDeliverableContent } = await import('../services/drafting')
    const draft = await draftDeliverableContent(parseInt(req.params.id))
    res.json({ draft })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: (err as Error).message })
  }
})

// POST /api/deliverables/:id/upload
router.post('/:id/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })

    await db.query(
      'UPDATE deliverables SET file_data = $1, file_name = $2, file_mime = $3 WHERE id = $4',
      [req.file.buffer, req.file.originalname, req.file.mimetype, req.params.id]
    )

    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to upload file to database' })
  }
})

// GET /api/deliverables/:id/file — serve file from DB
router.get('/:id/file', async (req: Request, res: Response) => {
  try {
    const result = await db.query(
      'SELECT file_data, file_name, file_mime FROM deliverables WHERE id = $1',
      [req.params.id]
    )
    const file = result.rows[0]
    if (!file || !file.file_data) return res.status(404).json({ error: 'File not found' })

    res.setHeader('Content-Type', file.file_mime)
    res.setHeader('Content-Disposition', `attachment; filename="${file.file_name}"`)
    res.send(file.file_data)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch file' })
  }
})

export default router
