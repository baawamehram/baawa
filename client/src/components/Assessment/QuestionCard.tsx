import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { VoiceInput } from './VoiceInput'

interface QuestionCardProps {
  question: string
  questionKey: number // changes per question so AnimatePresence remounts
  loading: boolean
  onSubmit: (answer: string) => void
  onRecordingChange?: (isRecording: boolean) => void
}

export function QuestionCard({ question, questionKey, loading, onSubmit, onRecordingChange }: QuestionCardProps) {
  const [answer, setAnswer] = useState('')

  // Reset answer when question changes
  useEffect(() => {
    setAnswer('')
  }, [questionKey])

  const handleSubmit = () => {
    const trimmed = answer.trim()
    if (!trimmed || loading) return
    setAnswer('')
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
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        style={{
          width: '100%',
          maxWidth: 640,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {/* Question text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 'clamp(18px, 3vw, 24px)',
            color: '#FDFCFA',
            lineHeight: 1.55,
            margin: 0,
            textAlign: 'center',
          }}
        >
          {question}
        </motion.p>

        {/* Answer area */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder="Share your thoughts…"
            rows={4}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              background: 'rgba(255,107,53,0.06)',
              border: '1px solid rgba(255,107,53,0.3)',
              borderRadius: 12,
              color: '#FDFCFA',
              fontFamily: 'Outfit, sans-serif',
              fontSize: 15,
              lineHeight: 1.6,
              padding: '14px 16px',
              resize: 'vertical',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#FF6B35'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,107,53,0.3)'
            }}
          />

          {/* Voice + Submit row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <VoiceInput
              onTranscript={(text) => {
                const trimmed = text.trim()
                setAnswer(trimmed)
                if (trimmed && !loading) onSubmit(trimmed)
              }}
              disabled={loading}
              onRecordingChange={onRecordingChange}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: 'rgba(255,176,154,0.5)', fontFamily: 'Outfit, sans-serif' }}>
                ⌘↵ to send
              </span>
              <motion.button
                onClick={handleSubmit}
                disabled={!answer.trim() || loading}
                whileHover={{ scale: !answer.trim() || loading ? 1 : 1.04 }}
                whileTap={{ scale: !answer.trim() || loading ? 1 : 0.96 }}
                style={{
                  background:
                    !answer.trim() || loading
                      ? 'rgba(255,107,53,0.2)'
                      : 'linear-gradient(135deg, #FF6B35, #E85520)',
                  border: 'none',
                  borderRadius: 10,
                  color: !answer.trim() || loading ? 'rgba(255,176,154,0.4)' : '#0A0A0A',
                  fontFamily: 'Outfit, sans-serif',
                  fontSize: 14,
                  fontWeight: 600,
                  padding: '10px 24px',
                  cursor: !answer.trim() || loading ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s, color 0.2s',
                  letterSpacing: '0.02em',
                }}
              >
                {loading ? 'Thinking…' : 'Continue →'}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
