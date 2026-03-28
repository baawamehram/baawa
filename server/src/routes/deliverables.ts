import { Router, Request, Response } from 'express'
import { z } from 'zod'
import multer from 'multer'
import path from 'path'
import { db } from '../db/client'
import { requireAuth } from '../middleware/auth'

const router = Router()

// Setup multer for local disk storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, 'uploads/')
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  },
})
const upload = multer({ storage })

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

    const fileUrl = `/uploads/${req.file.filename}`
    await db.query(
      'UPDATE deliverables SET file_url = $1 WHERE id = $2',
      [fileUrl, req.params.id]
    )

    res.json({ ok: true, fileUrl })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to upload file' })
  }
})

export default router
