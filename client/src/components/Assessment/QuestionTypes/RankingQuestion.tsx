import { useState } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'

interface RankingQuestionProps {
  question: string
  options: string[]
  onSubmit: (value: string[]) => void
  loading?: boolean
}

export function RankingQuestion({ question, options, onSubmit, loading = false }: RankingQuestionProps) {
  const [ranking, setRanking] = useState<string[]>([])

  const unranked = options.filter(opt => !ranking.includes(opt))

  const handleSelect = (option: string) => {
    if (!ranking.includes(option)) {
      setRanking([...ranking, option])
    }
  }

  const handleRemove = (option: string) => {
    setRanking(ranking.filter(r => r !== option))
  }

  const handleSubmit = () => {
    if (ranking.length === options.length) {
      onSubmit(ranking)
    }
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
          {/* Your Ranking */}
          {ranking.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#059669',
                  fontFamily: "'Outfit', sans-serif",
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em'
                }}
              >
                Your Ranking
              </div>
              <Reorder.Group
                axis="y"
                values={ranking}
                onReorder={setRanking}
                style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
              >
                {ranking.map((item, idx) => (
                  <Reorder.Item
                    key={item}
                    value={item}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 6,
                      backgroundColor: 'rgba(5, 150, 105, 0.15)',
                      border: '1px solid #059669',
                      color: '#FFFFFF',
                      fontSize: 14,
                      fontFamily: "'Outfit', sans-serif",
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'grab'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          backgroundColor: '#059669',
                          fontSize: 12,
                          fontWeight: 700
                        }}
                      >
                        {idx + 1}
                      </span>
                      <span>{item}</span>
                    </div>
                    <button
                      onClick={() => handleRemove(item)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#8B8B8B',
                        fontSize: 18,
                        cursor: 'pointer',
                        padding: 4
                      }}
                    >
                      ×
                    </button>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            </div>
          )}

          {/* Unranked Options */}
          {unranked.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#555555',
                  fontFamily: "'Outfit', sans-serif",
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em'
                }}
              >
                Tap to Add
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {unranked.map((option, idx) => (
                  <motion.button
                    key={option}
                    onClick={() => handleSelect(option)}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 6,
                      border: '1px solid #4B5563',
                      backgroundColor: 'transparent',
                      color: '#FFFFFF',
                      fontSize: 14,
                      fontFamily: "'Outfit', sans-serif",
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {option}
                  </motion.button>
                ))}
              </div>
            </div>
          )}
        </div>

        <AnimatePresence>
          {ranking.length === options.length && (
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
