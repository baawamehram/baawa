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
            fontFamily: 'Space Grotesk, sans-serif',
            fontSize: 'clamp(18px, 3vw, 24px)',
            color: '#e0e7ff',
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
              background: 'rgba(99,102,241,0.07)',
              border: '1px solid rgba(99,102,241,0.35)',
              borderRadius: 12,
              color: '#e0e7ff',
              fontFamily: 'Inter, sans-serif',
              fontSize: 15,
              lineHeight: 1.6,
              padding: '14px 16px',
              resize: 'vertical',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#6366f1'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(99,102,241,0.35)'
            }}
          />

          {/* Voice + Submit row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <VoiceInput
              onTranscript={(text) => setAnswer((prev) => (prev ? `${prev} ${text}` : text))}
              disabled={loading}
              onRecordingChange={onRecordingChange}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: 'rgba(165,180,252,0.5)', fontFamily: 'Inter, sans-serif' }}>
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
                      ? 'rgba(99,102,241,0.2)'
                      : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  border: 'none',
                  borderRadius: 10,
                  color: !answer.trim() || loading ? 'rgba(165,180,252,0.4)' : '#fff',
                  fontFamily: 'Space Grotesk, sans-serif',
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
