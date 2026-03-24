import { useEffect } from 'react'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'

export function ThankYou() {
  useEffect(() => {
    // Confetti burst on mount
    void confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.55 },
      colors: ['#6366f1', '#8b5cf6', '#a5b4fc', '#c4b5fd', '#e0e7ff', '#ffffff'],
      ticks: 200,
      gravity: 0.9,
      scalar: 1.1,
    })

    // Second smaller burst after a short delay for drama
    const timer = setTimeout(() => {
      void confetti({
        particleCount: 60,
        spread: 50,
        origin: { x: 0.25, y: 0.6 },
        colors: ['#6366f1', '#8b5cf6', '#a5b4fc'],
        ticks: 160,
        gravity: 1,
      })
      void confetti({
        particleCount: 60,
        spread: 50,
        origin: { x: 0.75, y: 0.6 },
        colors: ['#6366f1', '#8b5cf6', '#a5b4fc'],
        ticks: 160,
        gravity: 1,
      })
    }, 400)

    return () => {
      clearTimeout(timer)
      confetti.reset()
    }
  }, [])

  return (
    <div
      style={{
        background: '#0a0a0f',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background gradient blobs */}
      <div
        style={{
          position: 'absolute',
          top: '-20%',
          left: '-10%',
          width: '55vw',
          height: '55vw',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-15%',
          right: '-10%',
          width: '45vw',
          height: '45vw',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.09) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      {/* Subtle center glow */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '60vw',
          height: '60vw',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.04) 0%, transparent 65%)',
          pointerEvents: 'none',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
          textAlign: 'center',
          maxWidth: 560,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Star icon */}
        <motion.div
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.15, duration: 0.5, type: 'spring', stiffness: 200 }}
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.25))',
            border: '1.5px solid rgba(99,102,241,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            marginBottom: 4,
          }}
        >
          ✦
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.55 }}
          style={{
            fontFamily: 'Space Grotesk, sans-serif',
            fontSize: 'clamp(24px, 5vw, 38px)',
            color: '#e0e7ff',
            margin: 0,
            lineHeight: 1.25,
            letterSpacing: '-0.01em',
          }}
        >
          Our founder is reviewing your answers personally.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45, duration: 0.55 }}
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 'clamp(15px, 2.5vw, 18px)',
            color: 'rgba(165,180,252,0.7)',
            margin: 0,
            lineHeight: 1.65,
          }}
        >
          You'll hear from us within 48 hours.
        </motion.p>

        {/* Divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.65, duration: 0.5, ease: 'easeOut' }}
          style={{
            width: 48,
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.45), transparent)',
            margin: '8px 0',
          }}
        />

        {/* Brand quote */}
        <motion.blockquote
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75, duration: 0.55 }}
          style={{
            fontFamily: 'Space Grotesk, sans-serif',
            fontSize: 'clamp(14px, 2vw, 17px)',
            color: 'rgba(165,180,252,0.5)',
            margin: 0,
            fontStyle: 'italic',
            lineHeight: 1.6,
            maxWidth: 420,
            padding: '16px 20px',
            borderLeft: '2px solid rgba(99,102,241,0.3)',
            textAlign: 'left',
          }}
        >
          "The most important question isn't who you are. It's what you're ready to become."
        </motion.blockquote>
      </motion.div>
    </div>
  )
}
