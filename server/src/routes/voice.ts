import { Router, Request, Response } from 'express'
import { rateLimit } from 'express-rate-limit'
import multer from 'multer'
import Groq, { toFile } from 'groq-sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'

const router = Router()

function getGroqClient() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY ?? '' })
}

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

      console.log(`[voice] Attempting transcription for ${req.file.originalname} (${req.file.size} bytes)...`)

      // Attempt Groq (Whisper) first — Fast and OSS
      try {
        const file = await toFile(req.file.buffer, req.file.originalname, {
          type: req.file.mimetype,
        })
        const groq = getGroqClient()
        const transcription = await groq.audio.transcriptions.create({
          file,
          model: 'whisper-large-v3-turbo',
        })
        console.log('[voice] Groq transcription successful.')
        return res.json({ transcript: transcription.text })
      } catch (groqErr) {
        console.warn('[voice] Groq transcription failed, falling back to Gemini:', groqErr instanceof Error ? groqErr.message : String(groqErr))
      }

      // Fallback: Gemini 1.5 Flash (Supports audio input directly)
      try {
        if (!process.env.GOOGLE_AI_API_KEY) {
          throw new Error('GOOGLE_AI_API_KEY not configured for voice fallback.')
        }

        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY)
        const model = genAI.getGenerativeModel({ model: 'gemini-3-flash' })

        const result = await model.generateContent([
          {
            inlineData: {
              data: req.file.buffer.toString('base64'),
              mimeType: req.file.mimetype
            }
          },
          'Transcribe this audio exactly as heard. Do not add anything else.'
        ])

        const transcript = result.response.text()
        console.log('[voice] Gemini transcription successful.')
        return res.json({ transcript })
      } catch (geminiErr) {
        console.error('[voice] Gemini transcription also failed:', geminiErr instanceof Error ? geminiErr.message : String(geminiErr))
      }

      return res.status(500).json({ error: 'All transcription providers failed.' })
    } catch (err) {
      console.error('POST /voice/transcribe critical error:', err)
      return res.status(500).json({ error: 'Failed to transcribe audio.' })
    }
  }
)

export default router
