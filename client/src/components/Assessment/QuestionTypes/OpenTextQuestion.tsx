import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { VoiceInput } from '../VoiceInput'

interface OpenTextQuestionProps {
  question: string
  onSubmit: (value: string, inputType: 'voice' | 'text') => void
  loading?: boolean
}

export function OpenTextQuestion({ question, onSubmit, loading = false }: OpenTextQuestionProps) {
  const [text, setText] = useState('')
  const [inputMethod, setInputMethod] = useState<'voice' | 'text'>('voice')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleVoiceTranscript = (transcript: string) => {
    setText(transcript)
    setInputMethod('voice')
  }

  const handleSubmit = () => {
    console.log('OpenText submit clicked, text:', text, 'length:', text.trim().length)
    if (text.trim().length >= 10) {
      onSubmit(text, inputMethod)
    }
  }

  const characterCount = text.trim().length

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          width: '100%',
          maxWidth: 500
        }}
      >
        <h2
          style={{
            fontSize: 'clamp(18px, 5vw, 24px)',
            fontWeight: 500,
            color: '#FFFFFF',
            fontFamily: "'Outfit', sans-serif",
            lineHeight: 1.3,
            margin: 0
          }}
        >
          {question}
        </h2>

        {/* Voice Input */}
        <VoiceInput onTranscript={handleVoiceTranscript} />

        {/* Or divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            color: '#555555',
            fontSize: 12,
            fontFamily: "'Outfit', sans-serif"
          }}
        >
          <div style={{ flex: 1, height: 1, backgroundColor: '#4B5563' }} />
          <span>or</span>
          <div style={{ flex: 1, height: 1, backgroundColor: '#4B5563' }} />
        </div>

        {/* Text Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setInputMethod('text')
            }}
            placeholder="Type your answer here..."
            disabled={loading}
            style={{
              padding: '16px',
              borderRadius: 8,
              border: '1px solid #4B5563',
              backgroundColor: 'transparent',
              color: '#FFFFFF',
              fontSize: 16,
              fontFamily: "'Outfit', sans-serif",
              minHeight: 100,
              resize: 'vertical',
              outline: 'none',
              transition: 'border-color 0.2s ease',
              borderColor: text.length > 0 ? '#059669' : '#4B5563'
            } as any}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#059669'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = text.length > 0 ? '#059669' : '#4B5563'
            }}
          />
          <div
            style={{
              fontSize: 12,
              color: characterCount < 10 ? '#FF6B6B' : '#8B8B8B',
              fontFamily: "'Outfit', sans-serif"
            }}
          >
            {characterCount} characters
          </div>
        </div>

        <AnimatePresence>
          {characterCount >= 10 && (
            <motion.button
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              onClick={handleSubmit}
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                padding: '14px 28px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: '#059669',
                color: '#FFFFFF',
                fontSize: 14,
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                alignSelf: 'flex-start'
              }}
            >
              Next →
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  )
}
