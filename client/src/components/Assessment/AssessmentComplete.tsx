import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface AssessmentCompleteProps {
  onContinue: () => void
}

export function AssessmentComplete({ onContinue }: AssessmentCompleteProps) {
  const [canSkip, setCanSkip] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      onContinue()
    }, 1500)

    return () => clearTimeout(timer)
  }, [onContinue])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0A0A0A',
        zIndex: 100
      }}
    >
      <div
        style={{
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          alignItems: 'center'
        }}
      >
        {/* Checkmark */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            backgroundColor: 'rgba(5, 150, 105, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 48,
            color: '#059669'
          }}
        >
          ✓
        </motion.div>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: '#FFFFFF',
            fontFamily: "'Outfit', sans-serif",
            margin: 0
          }}
        >
          Assessment Complete
        </motion.h2>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          style={{
            fontSize: 14,
            color: '#AAAAAA',
            fontFamily: "'Outfit', sans-serif",
            margin: 0
          }}
        >
          Your answers have been reviewed.
        </motion.p>

        {/* Confetti particles */}
        {[...Array(10)].map((_, i) => (
          <motion.div
            key={i}
            initial={{
              y: -100,
              x: Math.random() * 200 - 100,
              opacity: 1
            }}
            animate={{
              y: 400,
              opacity: 0
            }}
            transition={{
              duration: 2,
              delay: Math.random() * 0.3,
              ease: 'easeIn'
            }}
            style={{
              position: 'absolute',
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: '#059669',
              pointerEvents: 'none'
            }}
          />
        ))}

        {/* Skip button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 1 }}
          onAnimationComplete={() => setCanSkip(true)}
          onClick={onContinue}
          style={{
            background: 'none',
            border: 'none',
            color: '#555555',
            fontSize: 12,
            fontFamily: "'Outfit', sans-serif",
            cursor: 'pointer',
            textDecoration: 'underline',
            marginTop: 12
          }}
        >
          Continue →
        </motion.button>
      </div>
    </motion.div>
  )
}
