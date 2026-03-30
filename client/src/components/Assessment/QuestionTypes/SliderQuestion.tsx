import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface SliderQuestionProps {
  question: string
  min: number
  max: number
  label: string
  onSubmit: (value: number) => void
  loading?: boolean
}

export function SliderQuestion({ question, min, max, label, onSubmit, loading = false }: SliderQuestionProps) {
  const [value, setValue] = useState(min)
  const [moved, setMoved] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(Number(e.target.value))
    if (!moved) setMoved(true)
  }

  const handleSubmit = () => {
    setSubmitted(true)
    onSubmit(value)
  }

  // Color gradient: orange at low values, green at high
  const percentage = (value - min) / (max - min)
  const hue = percentage * 120 // 0 (red) → 120 (green)
  const color = `hsl(${hue}, 80%, 45%)`

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
          gap: 24,
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              fontSize: 48,
              fontWeight: 700,
              color,
              fontFamily: "'Outfit', sans-serif",
              transition: 'color 0.1s ease'
            }}
          >
            {value} / {max}
          </div>

          <input
            type="range"
            min={min}
            max={max}
            value={value}
            onChange={handleChange}
            disabled={loading}
            style={{
              width: '100%',
              height: 8,
              borderRadius: 4,
              background: `linear-gradient(to right, #FF6B35 0%, #FFA500 25%, #FFD700 50%, #90EE90 75%, #059669 100%)`,
              outline: 'none',
              WebkitAppearance: 'none',
              appearance: 'none',
              cursor: 'pointer',
              accentColor: color
            } as any}
          />

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 12,
              color: '#8B8B8B',
              fontFamily: "'Outfit', sans-serif"
            }}
          >
            <span>{label.split('←')[0]?.trim() || 'No'}</span>
            <span>{label.split('→')[1]?.trim() || 'Yes'}</span>
          </div>
        </div>

        <AnimatePresence>
          {moved && (
            <motion.button
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              onClick={handleSubmit}
              disabled={submitted || loading}
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
                alignSelf: 'flex-start',
                opacity: submitted ? 0.5 : 1
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
