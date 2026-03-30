import { useState } from 'react'
import { motion } from 'framer-motion'
import { trackAssessmentStarted } from '../../lib/analytics'

interface AssessmentSplashProps {
  onStart: () => void
}

export function AssessmentSplash({ onStart }: AssessmentSplashProps) {
  const [showButton, setShowButton] = useState(false)

  const handleStart = () => {
    trackAssessmentStarted('homepage')
    onStart()
  }

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
          maxWidth: 600,
          display: 'flex',
          flexDirection: 'column',
          gap: 24
        }}
      >
        {/* Label */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0 }}
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#059669',
            fontFamily: "'Outfit', sans-serif",
            letterSpacing: '0.15em',
            textTransform: 'uppercase'
          }}
        >
          ⚡ Limited Spots Available
        </motion.div>

        {/* Value */}
        <div>
          <motion.h1
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            style={{
              fontSize: 'clamp(32px, 8vw, 64px)',
              fontWeight: 700,
              color: '#FFFFFF',
              fontFamily: "'Outfit', sans-serif",
              margin: '0 0 12px 0',
              lineHeight: 1.2
            }}
          >
            Get your{' '}
            <span style={{ color: '#059669' }}>$5,000 strategic assessment</span>
            {' '}free
          </motion.h1>
        </div>

        {/* Sub */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.8 }}
          style={{
            fontSize: 'clamp(14px, 3vw, 18px)',
            color: '#AAAAAA',
            fontFamily: "'Outfit', sans-serif",
            margin: 0,
            lineHeight: 1.5
          }}
        >
          Complete this 5-minute discovery. If we're a fit, our team personally analyzes your business and invites you to a $5,000 strategic assessment worth thousands in consulting value.
        </motion.p>

        {/* Call-to-action text */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 1 }}
          style={{
            fontSize: 'clamp(14px, 3vw, 16px)',
            color: '#FFFFFF',
            fontFamily: "'Outfit', sans-serif",
            margin: 0,
            lineHeight: 1.5
          }}
        >
          5-10 minutes. Answer honestly so we can properly evaluate you.
        </motion.p>

        {/* Social Proof Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 1.3 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            padding: '16px 20px',
            borderRadius: 8,
            backgroundColor: 'rgba(5, 150, 105, 0.08)',
            border: '1px solid rgba(5, 150, 105, 0.2)'
          }}
        >
          <div style={{ fontSize: 12, color: '#8B8B8B', fontFamily: "'Outfit', sans-serif" }}>
            <span style={{ color: '#059669', fontWeight: 600 }}>287</span> founders assessed • <span style={{ color: '#059669', fontWeight: 600 }}>92%</span> completed assessment
          </div>
          <div style={{ fontSize: 12, color: '#8B8B8B', fontFamily: "'Outfit', sans-serif" }}>
            <span style={{ color: '#059669', fontWeight: 600 }}>16</span> discovered critical blind spots • <span style={{ color: '#059669', fontWeight: 600 }}>$340K+</span> in consulting matched
          </div>
        </motion.div>

        {/* Button */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 1.2 }}
            onAnimationComplete={() => setShowButton(true)}
            onClick={handleStart}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            style={{
              padding: '16px 36px',
              borderRadius: 10,
              border: 'none',
              backgroundColor: '#059669',
              color: '#FFFFFF',
              fontSize: 16,
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 600,
              cursor: 'pointer',
              animation: showButton
                ? 'pulse 2s ease-in-out infinite'
                : 'none'
            } as any}
          >
            Get Your Free Assessment →
          </motion.button>

          {/* Skip link */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 1.2 }}
            onClick={handleStart}
            style={{
              background: 'none',
              border: 'none',
              color: '#555555',
              fontSize: 12,
              fontFamily: "'Outfit', sans-serif",
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Not ready yet
          </motion.button>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </motion.div>
  )
}
