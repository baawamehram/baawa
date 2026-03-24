import { Router, Request, Response } from 'express'
import { rateLimit } from 'express-rate-limit'
import multer from 'multer'
import OpenAI, { toFile } from 'openai'

const router = Router()

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const voiceRateLimit = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many voice requests, please try again later.' },
})

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB — Whisper API limit
  fileFilter: (_req, file, cb) => {
    const allowed = ['audio/webm', 'audio/mp4', 'video/webm', 'video/mp4']
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Unsupported audio format. Use WebM or MP4.'))
    }
  },
})

// POST /api/voice/transcribe
router.post(
  '/transcribe',
  voiceRateLimit,
  upload.single('audio'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided.' })
      }

      const file = await toFile(req.file.buffer, req.file.originalname, {
        type: req.file.mimetype,
      })

      const transcription = await openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
      })

      return res.json({ transcript: transcription.text })
    } catch (err) {
      console.error('POST /voice/transcribe error:', err)
      return res.status(500).json({ error: 'Failed to transcribe audio.' })
    }
  }
)

export default router
