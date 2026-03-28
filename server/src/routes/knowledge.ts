import { Router, Request, Response } from 'express'
import multer from 'multer'
import { 
  ingestMarkdown, 
  listKnowledgeSources, 
  setSourceActive, 
  deleteSource, 
  ingestUrl, 
  ingestPdf 
} from '../services/knowledge'
import { requireAuth } from '../middleware/auth'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

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

// POST /api/knowledge — upload a file (.md or .pdf) and ingest it
router.post('/', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
    
    const sourceName = (req.body.source_name as string | undefined)?.trim()
      || req.file.originalname.replace(/\.[^.]+$/, '')
    const category = (req.body.category as string | undefined) || 'general'

    let count = 0
    if (req.file.originalname.toLowerCase().endsWith('.md')) {
      const text = req.file.buffer.toString('utf-8')
      count = await ingestMarkdown(text, sourceName, category)
    } else if (req.file.originalname.toLowerCase().endsWith('.pdf')) {
      count = await ingestPdf(req.file.buffer, sourceName, category)
    } else {
      return res.status(400).json({ error: 'Only .md and .pdf files are accepted' })
    }

    res.json({ source_name: sourceName, chunks_inserted: count })
  } catch (err) {
    console.error('POST /knowledge error:', err)
    res.status(500).json({ error: 'Failed to ingest file' })
  }
})

// POST /api/knowledge/url — ingest content from a URL
router.post('/url', async (req: Request, res: Response) => {
  try {
    const { url, source_name, category } = req.body
    if (!url) return res.status(400).json({ error: 'URL is required' })
    
    const finalSourceName = source_name?.trim() || new URL(url).hostname
    const count = await ingestUrl(url, finalSourceName, category || 'article')
    
    res.json({ source_name: finalSourceName, chunks_inserted: count })
  } catch (err) {
    console.error('POST /knowledge/url error:', err)
    res.status(500).json({ error: 'Failed to ingest URL' })
  }
})

// PUT /api/knowledge/:sourceName — toggle active
router.put('/:sourceName', async (req: Request, res: Response) => {
  try {
    const isActive = req.body.is_active as boolean
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'is_active must be boolean' })
    }
    await setSourceActive(req.params.sourceName, isActive)
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
