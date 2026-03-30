import { motion } from 'framer-motion'

interface AssessmentSubmittedProps {
  onContinue: () => void
}

export function AssessmentSubmitted({ onContinue }: AssessmentSubmittedProps) {
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
        padding: 24,
        zIndex: 100
      }}
    >
      <div
        style={{
          textAlign: 'center',
          maxWidth: 500,
          display: 'flex',
          flexDirection: 'column',
          gap: 24
        }}
      >
        {/* Icon animation */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          style={{
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
          transition={{ duration: 0.4, delay: 0.1 }}
          style={{
            fontSize: 'clamp(24px, 5vw, 32px)',
            fontWeight: 700,
            color: '#FFFFFF',
            fontFamily: "'Outfit', sans-serif",
            margin: 0
          }}
        >
          Thank you.
        </motion.h2>

        {/* Body */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}
        >
          <p
            style={{
              fontSize: 16,
              color: '#FFFFFF',
              fontFamily: "'Outfit', sans-serif",
              margin: 0,
              lineHeight: 1.6
            }}
          >
            Your assessment has been received.
          </p>
          <p
            style={{
              fontSize: 14,
              color: '#AAAAAA',
              fontFamily: "'Outfit', sans-serif",
              margin: 0,
              lineHeight: 1.6
            }}
          >
            Our team is reviewing your insights. Expect our reach-out within 24 hours.
          </p>
        </motion.div>

        {/* CTA */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          onClick={onContinue}
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
            cursor: 'pointer',
            alignSelf: 'center'
          }}
        >
          See you soon →
        </motion.button>
      </div>
    </motion.div>
  )
}
