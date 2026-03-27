import { useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from '../../hooks/useSession'
import { QuestionCard } from './QuestionCard'
import { IntakeData } from '../OnboardingIntro'

interface AssessmentShellProps {
  intakeData: IntakeData | null
  onComplete: (sessionId: string) => void
}

const MAX_QUESTIONS = 25

export function AssessmentShell({ intakeData, onComplete }: AssessmentShellProps) {
  const { state, startSession, submitAnswer, setIntakeData } = useSession()

  useEffect(() => {
    if (intakeData) {
      setIntakeData(intakeData)
    }
  }, [intakeData, setIntakeData])

  useEffect(() => {
    if (!state.sessionId && !state.loading && intakeData) {
      void startSession()
    }
  }, [state.sessionId, state.loading, startSession, intakeData])

  useEffect(() => {
    if (state.done && state.sessionId) {
      onComplete(state.sessionId)
    }
  }, [state.done, state.sessionId, onComplete])

  const handleRecordingChange = useCallback(() => {
    // Left open for any future recording side effects
  }, [])

  const handleSubmit = async (answer: string) => {
    await submitAnswer(answer)
  }

  const progress = Math.min(state.questionCount / MAX_QUESTIONS, 1)

  return (
    <div
      style={{
        background: '#040404',
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
      {/* Precision grid overlay */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.1, pointerEvents: 'none',
        background: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />

      {/* Progress bar line */}
      <AnimatePresence>
        {state.questionCount > 0 && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 2, background: 'rgba(255,255,255,0.05)', zIndex: 100 }}
          >
            <motion.div
              animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.6, ease: 'easeOut' }}
              style={{ height: '100%', background: '#FFFFFF' }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        <motion.div
          key="assessment"
          initial={{ opacity: 0, filter: 'blur(8px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, filter: 'blur(8px)' }}
          transition={{ duration: 0.6 }}
          style={{
            width: '100%',
            maxWidth: 680,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 40,
            zIndex: 10
          }}
        >
          {/* Status Header */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 24, width: '100%'
          }}>
            <span style={{
              fontFamily: 'Outfit, sans-serif', fontSize: 10, color: '#666',
              letterSpacing: '0.2em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6
            }}>
              <span style={{ display: 'inline-block', width: 4, height: 4, background: state.loading ? '#FFFFFF' : '#4ade80', borderRadius: '50%' }} />
              {state.loading ? 'ANALYZING RESPONSE...' : 'DIAGNOSTIC ENGAGED'}
            </span>
            <span style={{
              fontFamily: 'Outfit, sans-serif', fontSize: 13, color: '#FFF',
              letterSpacing: '0.05em', fontWeight: 600
            }}>
              {state.questionCount > 0 ? `QUERY 0${state.questionCount}` : "INITIALIZING"}
            </span>
          </div>

          {/* Loading / Error / Question */}
          {state.error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, color: '#ef4444' }}>{state.error}</p>
              <button 
                onClick={() => void startSession()}
                style={{
                  marginTop: 16, background: 'transparent', border: '1px solid #ef4444', color: '#ef4444',
                  padding: '6px 16px', fontSize: 12, fontFamily: 'Outfit, sans-serif', cursor: 'pointer', letterSpacing: '0.1em'
                }}
              >REBOOT</button>
            </motion.div>
          )}

          {!state.error && !state.question && state.loading && (
            <motion.div
              animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}
            >
              <div style={{ width: 1, height: 40, borderLeft: '1px dashed rgba(255,255,255,0.4)' }} />
              <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, color: '#888', letterSpacing: '0.1em' }}>PROCESSING INPUT</span>
            </motion.div>
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
      </AnimatePresence>
    </div>
  )
}
