import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from '../../hooks/useSession'
import { GenieCharacter } from './GenieCharacter'
import { QuestionCard } from './QuestionCard'
import type { GenieState } from './GenieCharacter'

interface AssessmentShellProps {
  onComplete: () => void
}

type Phase = 'intro' | 'assessment'

const MAX_QUESTIONS = 25

export function AssessmentShell({ onComplete }: AssessmentShellProps) {
  const { state, startSession, submitAnswer } = useSession()
  const [phase, setPhase] = useState<Phase>('intro')
  const [isRecording, setIsRecording] = useState(false)
  const [impressed, setImpressed] = useState(false)

  // Auto-advance intro after 2s
  useEffect(() => {
    const timer = setTimeout(() => {
      setPhase('assessment')
    }, 2000)
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
    if (state.done) {
      onComplete()
    }
  }, [state.done, onComplete])

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

  const genieState: GenieState = isRecording
    ? 'listening'
    : impressed
      ? 'impressed'
      : state.loading
        ? 'thinking'
        : 'idle'
  const progress = Math.min(state.questionCount / MAX_QUESTIONS, 1)

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
          width: '50vw',
          height: '50vw',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-15%',
          right: '-10%',
          width: '40vw',
          height: '40vw',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

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
              background: 'rgba(99,102,241,0.15)',
            }}
          >
            <motion.div
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
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
            <GenieCharacter state="idle" />
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              style={{
                fontFamily: 'Space Grotesk, sans-serif',
                fontSize: 'clamp(22px, 4vw, 32px)',
                color: '#e0e7ff',
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
                fontFamily: 'Inter, sans-serif',
                fontSize: 15,
                color: 'rgba(165,180,252,0.7)',
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              Answer honestly. There are no wrong answers.
              <br />
              The more you share, the better we can help.
            </motion.p>
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ delay: 1, duration: 1.5, repeat: Infinity }}
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 12,
                color: 'rgba(165,180,252,0.4)',
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
            {/* Genie */}
            <GenieCharacter state={genieState} />

            {/* Question counter */}
            {state.questionCount > 0 && (
              <motion.span
                key={state.questionCount}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 12,
                  color: 'rgba(165,180,252,0.45)',
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
                  fontFamily: 'Inter, sans-serif',
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
                    fontFamily: 'Inter, sans-serif',
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
                  fontFamily: 'Space Grotesk, sans-serif',
                  fontSize: 18,
                  color: 'rgba(165,180,252,0.6)',
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
