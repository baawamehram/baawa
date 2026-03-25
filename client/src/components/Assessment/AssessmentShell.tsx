import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from '../../hooks/useSession'
import { GoldenOrb } from './GoldenOrb'
import { QuestionCard } from './QuestionCard'

interface AssessmentShellProps {
  onComplete: (sessionId: string) => void
}

type Phase = 'intro' | 'assessment'

const MAX_QUESTIONS = 25

export function AssessmentShell({ onComplete }: AssessmentShellProps) {
  const { state, startSession, submitAnswer } = useSession()
  const [phase, setPhase] = useState<Phase>('intro')
  const [isRecording, setIsRecording] = useState(false)
  const [impressed, setImpressed] = useState(false)

  // Auto-advance intro after 6s (or user taps to skip)
  useEffect(() => {
    const timer = setTimeout(() => {
      setPhase('assessment')
    }, 6000)
    return () => clearTimeout(timer)
  }, [])

  // Start session once intro is done
  useEffect(() => {
    if (phase === 'assessment' && !state.sessionId && !state.loading) {
      void startSession()
    }
  }, [phase, state.sessionId, state.loading, startSession])

  // Watch for done flag
  useEffect(() => {
    if (state.done && state.sessionId) {
      onComplete(state.sessionId)
    }
  }, [state.done, state.sessionId, onComplete])

  const handleRecordingChange = useCallback((recording: boolean) => {
    setIsRecording(recording)
  }, [])

  const handleSubmit = async (answer: string) => {
    if (answer.length > 100) {
      setImpressed(true)
      setTimeout(() => setImpressed(false), 1500)
    }
    await submitAnswer(answer)
  }

  const orbState = isRecording
    ? 'listening'
    : state.loading
      ? 'processing'
      : impressed
        ? 'settled'
        : 'idle'
  const progress = Math.min(state.questionCount / MAX_QUESTIONS, 1)

  return (
    <div
      style={{
        background: 'linear-gradient(180deg, #0A0A0A 0%, #110805 50%, #1A0808 100%)',
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
      {/* Radial golden glow behind where orb sits */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -60%)',
        width: '500px', height: '500px',
        background: 'radial-gradient(ellipse at center, rgba(255,107,53,0.07) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />
      {/* Corner glows */}
      <div style={{
        position: 'absolute', top: '-20%', left: '-10%',
        width: '50vw', height: '50vw', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,107,53,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-15%', right: '-10%',
        width: '40vw', height: '40vw', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(232,85,32,0.05) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      {/* Floating particles */}
      {Array.from({ length: 24 }).map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: i % 3 === 0 ? 2 : 1,
          height: i % 3 === 0 ? 2 : 1,
          borderRadius: '50%',
          background: i % 4 === 0 ? 'rgba(255,107,53,0.4)' : 'rgba(253,252,250,0.2)',
          left: `${(i * 37 + 11) % 95}%`,
          top: `${(i * 53 + 7) % 90}%`,
          animation: `float${i % 3} ${8 + (i % 5) * 2}s ease-in-out infinite`,
          animationDelay: `${i * 0.4}s`,
          pointerEvents: 'none',
        }} />
      ))}
      <style>{`
        @keyframes float0 { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-12px)} }
        @keyframes float1 { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-18px)} }
        @keyframes float2 { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-8px)} }
      `}</style>

      {/* Progress bar */}
      <AnimatePresence>
        {phase === 'assessment' && state.questionCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              background: 'rgba(255,107,53,0.15)',
            }}
          >
            <motion.div
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #FF6B35, #E85520)',
                borderRadius: '0 2px 2px 0',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Intro screen */}
      <AnimatePresence mode="wait">
        {phase === 'intro' ? (
          <motion.div
            key="intro"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.5 }}
            onClick={() => setPhase('assessment')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setPhase('assessment')
              }
            }}
            role="button"
            tabIndex={0}
            style={{
              textAlign: 'center',
              cursor: 'pointer',
              maxWidth: 520,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 20,
            }}
          >
            <GoldenOrb state="idle" />
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              style={{
                fontFamily: 'Outfit, sans-serif',
                fontSize: 'clamp(22px, 4vw, 32px)',
                color: '#FDFCFA',
                margin: 0,
                lineHeight: 1.3,
              }}
            >
              This is not a form.
              <br />
              This is a conversation.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              style={{
                fontFamily: 'Outfit, sans-serif',
                fontSize: 15,
                color: 'rgba(255,176,154,0.7)',
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              Answer honestly. There are no wrong answers.
              <br />
              The more you share, the better we can help.
            </motion.p>

            {/* Voice prompt */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: 'rgba(255,107,53,0.08)',
                border: '1px solid rgba(255,107,53,0.3)',
                borderRadius: 12,
                padding: '12px 18px',
                maxWidth: 420,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                <rect x="9" y="2" width="6" height="11" rx="3" fill="#FFB09A" />
                <path d="M5 11a7 7 0 0 0 14 0" stroke="#FFB09A" strokeWidth="2" strokeLinecap="round" />
                <line x1="12" y1="18" x2="12" y2="22" stroke="#FFB09A" strokeWidth="2" strokeLinecap="round" />
                <line x1="9" y1="22" x2="15" y2="22" stroke="#FFB09A" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: 'rgba(255,176,154,0.85)', lineHeight: 1.5 }}>
                <strong style={{ color: '#FFB09A' }}>Speak your answers</strong> — it's faster and captures more.
                Hit the mic button below each question.
              </span>
            </motion.div>

            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ delay: 1.2, duration: 1.5, repeat: Infinity }}
              style={{
                fontFamily: 'Outfit, sans-serif',
                fontSize: 12,
                color: 'rgba(255,176,154,0.4)',
                letterSpacing: '0.08em',
              }}
            >
              tap anywhere to begin
            </motion.span>
          </motion.div>
        ) : (
          <motion.div
            key="assessment"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{
              width: '100%',
              maxWidth: 680,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 32,
            }}
          >
            {/* Golden Orb */}
            <GoldenOrb state={orbState} />

            {/* Question counter */}
            {state.questionCount > 0 && (
              <motion.span
                key={state.questionCount}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  fontFamily: 'Outfit, sans-serif',
                  fontSize: 12,
                  color: 'rgba(255,176,154,0.45)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                Question {state.questionCount}
              </motion.span>
            )}

            {/* Loading / Error / Question */}
            {state.error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  fontFamily: 'Outfit, sans-serif',
                  fontSize: 14,
                  color: '#f87171',
                  textAlign: 'center',
                  margin: 0,
                }}
              >
                {state.error}
                <br />
                <button
                  onClick={() => void startSession()}
                  style={{
                    marginTop: 8,
                    background: 'none',
                    border: '1px solid #f87171',
                    color: '#f87171',
                    borderRadius: 6,
                    padding: '4px 12px',
                    cursor: 'pointer',
                    fontFamily: 'Outfit, sans-serif',
                    fontSize: 13,
                  }}
                >
                  Retry
                </button>
              </motion.p>
            )}

            {!state.error && !state.question && state.loading && (
              <motion.p
                animate={{ opacity: [0.4, 0.9, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                style={{
                  fontFamily: 'Outfit, sans-serif',
                  fontSize: 18,
                  color: 'rgba(255,176,154,0.6)',
                  margin: 0,
                }}
              >
                Thinking…
              </motion.p>
            )}

            {!state.error && state.question && (
              <QuestionCard
                question={state.question}
                questionKey={state.questionCount}
                loading={state.loading}
                onSubmit={(answer) => void handleSubmit(answer)}
                onRecordingChange={handleRecordingChange}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
