import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface MCQQuestionProps {
  question: string
  options: string[]
  onSubmit: (value: string) => void
  loading?: boolean
}

export function MCQQuestion({ question, options, onSubmit, loading = false }: MCQQuestionProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const handleSelect = (option: string) => {
    setSelected(option)
    setSubmitted(true)
    onSubmit(option)
  }

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
          gap: 16,
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
            margin: '0 0 12px 0'
          }}
        >
          {question}
        </h2>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}
        >
          {options.map((option, idx) => (
            <motion.button
              key={option}
              onClick={() => {
                console.log('MCQ button clicked:', option, 'submitted:', submitted)
                handleSelect(option)
              }}
              disabled={loading}
              whileTap={{ scale: 0.97 }}
              whileHover={{ scale: 1.02 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              style={{
                padding: '16px 20px',
                borderRadius: 8,
                border: selected === option ? '2px solid #059669' : '1px solid #4B5563',
                backgroundColor: selected === option ? 'rgba(5, 150, 105, 0.1)' : 'transparent',
                color: '#FFFFFF',
                fontSize: 16,
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                opacity: submitted && selected !== option ? 0.5 : 1
              }}
            >
              <span>{option}</span>
              {selected === option && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  style={{ fontSize: 20 }}
                >
                  ✓
                </motion.span>
              )}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
