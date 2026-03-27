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

export function QuestionCard({ question, questionKey, loading, onSubmit, onRecordingChange }: QuestionCardProps) {
  const [answer, setAnswer] = useState('')
  const [showTextarea, setShowTextarea] = useState(false)
  const [isVoiceRecording, setIsVoiceRecording] = useState(false)

  useEffect(() => {
    setAnswer('')
    setShowTextarea(false)
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
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{ width: '100%', maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 32 }}
      >
        {/* Question text - Stark & Authoritative */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 'clamp(20px, 3.5vw, 28px)',
            fontWeight: 500,
            color: '#FFFFFF',
            lineHeight: 1.4,
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
          transition={{ delay: 0.3, duration: 0.4 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          {showTextarea && (
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              autoFocus
              placeholder="Input response data..."
              rows={3}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#FFFFFF',
                fontFamily: 'Outfit, sans-serif',
                fontSize: 15,
                lineHeight: 1.6,
                padding: '16px',
                resize: 'none',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#FFFFFF'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
              }}
            />
          )}

          {/* Voice + Submit row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: showTextarea ? 'none' : '1px solid rgba(255,255,255,0.1)', paddingTop: showTextarea ? 0 : 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
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
              {!showTextarea && !isVoiceRecording && (
                <motion.button
                  onClick={() => setShowTextarea(true)}
                  whileHover={{ color: '#FFFFFF' }}
                  style={{
                    background: 'none', border: 'none', color: '#666',
                    fontFamily: 'Outfit, sans-serif', fontSize: 12, letterSpacing: '0.05em',
                    cursor: 'pointer', padding: 0, textTransform: 'uppercase'
                  }}
                >
                  [ Manual Input ]
                </motion.button>
              )}
            </div>

            {showTextarea && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: 11, color: '#666', fontFamily: 'Outfit, sans-serif', letterSpacing: '0.05em' }}>
                  CMD + ENTER
                </span>
                <motion.button
                  onClick={handleSubmit}
                  disabled={!answer.trim() || loading}
                  whileHover={{ backgroundColor: !answer.trim() || loading ? 'transparent' : '#FFFFFF', color: !answer.trim() || loading ? '#666' : '#000' }}
                  style={{
                    background: 'transparent',
                    border: '1px solid',
                    borderColor: !answer.trim() || loading ? 'rgba(255,255,255,0.1)' : '#FFFFFF',
                    color: !answer.trim() || loading ? '#666' : '#FFFFFF',
                    fontFamily: 'Outfit, sans-serif',
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    padding: '12px 24px',
                    cursor: !answer.trim() || loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {loading ? 'EXECUTING' : 'SUBMIT'}
                </motion.button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
