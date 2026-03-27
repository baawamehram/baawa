import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { VoiceInput } from './VoiceInput'

interface QuestionCardProps {
  question: string
  questionKey: number
  loading: boolean
  onSubmit: (answer: string) => void
  onRecordingChange?: (isRecording: boolean) => void
}

const AI_PROCESSING_LINES = [
  '> Transcribing audio payload...',
  '> Executing behavioral synthesis...',
  '> Querying intelligence knowledge base...',
  '> Formulating adaptive query...',
  '> Calibrating response engine...',
]

export function QuestionCard({ question, questionKey, loading, onSubmit, onRecordingChange }: QuestionCardProps) {
  const [answer, setAnswer] = useState('')
  const [showTextarea, setShowTextarea] = useState(false)
  const [isVoiceRecording, setIsVoiceRecording] = useState(false)
  const [processingLineIndex, setProcessingLineIndex] = useState(0)

  useEffect(() => {
    setAnswer('')
    setShowTextarea(false)
    setIsVoiceRecording(false)
  }, [questionKey])

  // Rotate AI processing microcopy while loading
  useEffect(() => {
    if (!loading) {
      setProcessingLineIndex(0)
      return
    }
    const interval = setInterval(() => {
      setProcessingLineIndex((i) => (i + 1) % AI_PROCESSING_LINES.length)
    }, 900)
    return () => clearInterval(interval)
  }, [loading])

  const handleSubmit = () => {
    const trimmed = answer.trim()
    if (!trimmed || loading) return
    setAnswer('')
    setShowTextarea(false)
    onSubmit(trimmed)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit()
    }
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={questionKey}
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -40 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        style={{ width: '100%', maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 40 }}
      >
        {/* Question text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 'clamp(20px, 5vw, 28px)',
            fontWeight: 500,
            color: '#FFFFFF',
            lineHeight: 1.5,
            margin: 0,
            textAlign: 'left',
          }}
        >
          {question}
        </motion.p>

        {/* Answer area */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          {/* AI Thinking microcopy when loading */}
          <AnimatePresence mode="wait">
            {loading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 20 }}
              >
                <AnimatePresence mode="wait">
                  <motion.span
                    key={processingLineIndex}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.25 }}
                    style={{
                      display: 'block',
                      fontFamily: 'monospace',
                      fontSize: 12,
                      color: '#ff6b35',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {AI_PROCESSING_LINES[processingLineIndex]}
                  </motion.span>
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Voice or Text area — only show when not loading */}
          {!loading && (
            <>
              {showTextarea ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={loading}
                    autoFocus
                    placeholder="Type your answer here..."
                    rows={4}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#FFFFFF',
                      fontFamily: 'Outfit, sans-serif',
                      fontSize: 16, // Must be 16px to prevent iOS auto-zoom
                      lineHeight: 1.6,
                      padding: '16px',
                      resize: 'none',
                      outline: 'none',
                      borderRadius: 4,
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#FFFFFF' }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <button
                      onClick={() => setShowTextarea(false)}
                      style={{ background: 'none', border: 'none', color: '#555', fontFamily: 'Outfit, sans-serif', fontSize: 12, cursor: 'pointer', letterSpacing: '0.05em', padding: 0 }}
                    >
                      ← Use Voice Instead
                    </button>
                    <motion.button
                      onClick={handleSubmit}
                      disabled={!answer.trim() || loading}
                      whileTap={{ scale: !answer.trim() ? 1 : 0.97 }}
                      style={{
                        background: answer.trim() ? '#FFFFFF' : 'transparent',
                        border: '1px solid',
                        borderColor: answer.trim() ? '#FFFFFF' : 'rgba(255,255,255,0.15)',
                        color: answer.trim() ? '#000' : '#555',
                        fontFamily: 'Outfit, sans-serif',
                        fontSize: 13,
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        padding: '14px 28px',
                        cursor: !answer.trim() ? 'not-allowed' : 'pointer',
                        borderRadius: 4,
                        touchAction: 'manipulation',
                      }}
                    >
                      SUBMIT
                    </motion.button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Primary: Giant Voice Button */}
                  <VoiceInput
                    onTranscript={(text) => {
                      const trimmed = text.trim()
                      if (trimmed && !loading) onSubmit(trimmed)
                    }}
                    onVoiceUnavailable={() => setShowTextarea(true)}
                    disabled={loading}
                    onRecordingChange={(isRec) => {
                      setIsVoiceRecording(isRec)
                      if (onRecordingChange) onRecordingChange(isRec)
                    }}
                  />
                  {/* Secondary: subdued fallback to typing */}
                  {!isVoiceRecording && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      style={{ textAlign: 'center' }}
                    >
                      <button
                        onClick={() => setShowTextarea(true)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#444',
                          fontFamily: 'Outfit, sans-serif',
                          fontSize: 12,
                          cursor: 'pointer',
                          padding: '8px 0',
                          letterSpacing: '0.05em',
                          textDecoration: 'underline',
                          textDecorationColor: '#333',
                        }}
                      >
                        Prefer to type instead
                      </button>
                    </motion.div>
                  )}
                </div>
              )}
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
