import { Router, Request, Response } from 'express'
import multer from 'multer'
import { ingestMarkdown, listKnowledgeSources, setSourceActive, deleteSource } from '../services/knowledge'
import { requireAuth } from '../middleware/auth'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

router.use(requireAuth)

// GET /api/knowledge — list all sources
router.get('/', async (_req: Request, res: Response) => {
  try {
    const sources = await listKnowledgeSources()
    res.json(sources)
  } catch (err) {
    console.error('GET /knowledge error:', err)
    res.status(500).json({ error: 'Failed to list sources' })
  }
})

// POST /api/knowledge — upload a .md file and ingest it
router.post('/', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
    if (!req.file.originalname.endsWith('.md')) {
      return res.status(400).json({ error: 'Only .md files are accepted' })
    }

    const sourceName = (req.body.source_name as string | undefined)?.trim()
      || req.file.originalname.replace('.md', '')

    const text = req.file.buffer.toString('utf-8')
    const count = await ingestMarkdown(text, sourceName)
    res.json({ source_name: sourceName, chunks_inserted: count })
  } catch (err) {
    console.error('POST /knowledge error:', err)
    res.status(500).json({ error: 'Failed to ingest file' })
  }
})

// PUT /api/knowledge/:sourceName — toggle active
router.put('/:sourceName', async (req: Request, res: Response) => {
  try {
    const parsed = { is_active: req.body.is_active as boolean }
    if (typeof parsed.is_active !== 'boolean') {
      return res.status(400).json({ error: 'is_active must be boolean' })
    }
    await setSourceActive(req.params.sourceName, parsed.is_active)
    res.json({ ok: true })
  } catch (err) {
    console.error('PUT /knowledge/:sourceName error:', err)
    res.status(500).json({ error: 'Failed to update source' })
  }
})

// DELETE /api/knowledge/:sourceName
router.delete('/:sourceName', async (req: Request, res: Response) => {
  try {
    await deleteSource(req.params.sourceName)
    res.json({ ok: true })
  } catch (err) {
    console.error('DELETE /knowledge/:sourceName error:', err)
    res.status(500).json({ error: 'Failed to delete source' })
  }
})

export default router
