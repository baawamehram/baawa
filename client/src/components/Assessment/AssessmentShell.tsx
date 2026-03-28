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
    if (!state.sessionId && !state.loading && !state.error && intakeData) {
      void startSession()
    }
  }, [state.sessionId, state.loading, state.error, startSession, intakeData])

  useEffect(() => {
    if (state.done && state.sessionId) {
      onComplete(state.sessionId)
    }
  }, [state.done, state.sessionId, onComplete])

  const handleRecordingChange = useCallback(() => {
    // Left open for any future recording side effects
  }, [])

  const handleSubmit = async (answer: string, meta: { inputType: 'voice' | 'text', latency: number }) => {
    await submitAnswer(answer, meta)
  }

  const progress = Math.min(state.questionCount / MAX_QUESTIONS, 1)

  return (
    <div
      style={{
        background: '#040404',
        minHeight: '100svh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'max(32px, env(safe-area-inset-top)) 20px max(32px, env(safe-area-inset-bottom))',
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
              {state.questionCount > 0 ? `DIAGNOSTIC ENGINE // QUERY 0${state.questionCount}` : "STRATEGIC INITIALIZATION"}
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10, width: '100%', maxWidth: 420, fontFamily: 'monospace', fontSize: 12, color: '#555' }}
            >
              {[
                { t: '[ 0.001s ]', msg: 'KICKING OFF INTELLIGENCE SERVERS...', d: 0.1 },
                { t: '[ 0.452s ]', msg: 'CALIBRATING BEHAVIORAL MODELS...', d: 0.6 },
                { t: '[ 1.120s ]', msg: 'INITIALIZING ADAPTIVE QUESTIONING NODE...', d: 1.2 },
                { t: '[ 1.890s ]', msg: 'LOADING RORY SUTHERLAND FRAMEWORK...', d: 1.8 },
                { t: '[ 2.310s ]', msg: 'SYSTEMS READY. PREPARING FIRST QUERY.', d: 2.4 },
              ].map(({ t, msg, d }, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: d, duration: 0.2 }} style={{ display: 'flex', gap: 12 }}>
                  <span style={{ color: '#ff6b35', flexShrink: 0 }}>{t}</span>
                  <span style={{ color: '#888' }}>{msg}</span>
                </motion.div>
              ))}
              <motion.div
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 0.7, repeat: Infinity }}
                style={{ width: 9, height: 16, background: '#ff6b35', marginTop: 4, borderRadius: 1 }}
              />
            </motion.div>
          )}

          {!state.error && state.question && (
            <QuestionCard
              question={state.question}
              questionKey={state.questionCount}
              loading={state.loading}
              onSubmit={(ans, meta) => void handleSubmit(ans, meta)}
              onRecordingChange={handleRecordingChange}
            />
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  )
}
