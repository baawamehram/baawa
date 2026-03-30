import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStructuredSession } from '../../hooks/useStructuredSession'
import { MCQQuestion } from './QuestionTypes/MCQQuestion'
import { SliderQuestion } from './QuestionTypes/SliderQuestion'
import { RankingQuestion } from './QuestionTypes/RankingQuestion'
import { OpenTextQuestion } from './QuestionTypes/OpenTextQuestion'

interface QuestionShellProps {
  onComplete: (sessionId: string) => void
}

export function QuestionShell({ onComplete }: QuestionShellProps) {
  const session = useStructuredSession()
  const [celebrationShown, setCelebrationShown] = useState(false)

  useEffect(() => {
    session.startSession()
  }, [])

  useEffect(() => {
    if (session.done && !celebrationShown) {
      setCelebrationShown(true)
      // Trigger celebration animation
      setTimeout(() => {
        session.sessionId && onComplete(session.sessionId)
      }, 1500)
    }
  }, [session.done, session.sessionId, onComplete, celebrationShown])

  if (!session.currentQuestion) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: '#111827'
        }}
      >
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
          style={{ color: '#FFFFFF', fontSize: 14 }}
        >
          Loading...
        </motion.div>
      </div>
    )
  }

  const renderQuestion = () => {
    if (!session.currentQuestion) return null

    const { questionType, question, options, sliderConfig } = session.currentQuestion

    const handleSubmit = (value: string | number | string[], inputType?: 'voice' | 'text' | 'click' | 'drag') => {
      const displayText = Array.isArray(value) ? value.join(', ') : String(value)
      const type = questionType || 'open_text'
      const idx = session.questionIndex

      console.log('handleSubmit called with:', { idx, type, value, displayText, inputType })

      session.submitAnswer(idx, type as 'open_text' | 'mcq' | 'slider' | 'ranking', value, displayText, inputType)
    }

    switch (questionType) {
      case 'mcq':
        return (
          <MCQQuestion
            question={question}
            options={options || []}
            onSubmit={(val) => handleSubmit(val, 'click')}
            loading={session.loading}
          />
        )
      case 'slider':
        return (
          <SliderQuestion
            question={question}
            min={sliderConfig?.min || 0}
            max={sliderConfig?.max || 10}
            label={sliderConfig?.label || ''}
            onSubmit={(val) => handleSubmit(val, 'drag')}
            loading={session.loading}
          />
        )
      case 'ranking':
        return (
          <RankingQuestion
            question={question}
            options={options || []}
            onSubmit={(val) => handleSubmit(val, 'click')}
            loading={session.loading}
          />
        )
      default:
        return (
          <OpenTextQuestion
            question={question}
            onSubmit={(val, inputType) => handleSubmit(val, inputType)}
            loading={session.loading}
          />
        )
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#111827',
        padding: 24,
        gap: 40,
        position: 'relative'
      }}
    >
      {/* Header */}
      <div
        style={{
          width: '100%',
          maxWidth: 500,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          alignItems: 'center'
        }}
      >
        {/* Progress bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            width: '100%'
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                height: 2,
                backgroundColor: '#4B5563',
                borderRadius: 1,
                overflow: 'hidden'
              }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${((session.questionIndex + 1) / 8) * 100}%` }}
                transition={{ duration: 0.4 }}
                style={{
                  height: '100%',
                  backgroundColor: '#059669'
                }}
              />
            </div>
          </div>
          <div
            style={{
              fontSize: 12,
              color: '#8B8B8B',
              fontFamily: "'Outfit', sans-serif",
              whiteSpace: 'nowrap'
            }}
          >
            Q{session.questionIndex + 1}/8
          </div>
        </div>

        {/* Real-time score display */}
        <motion.div
          animate={{ opacity: [0.6, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          style={{
            fontSize: 12,
            color: '#059669',
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase'
          }}
        >
          Score building...{' '}
          <motion.span
            key={Math.floor(session.partialScore)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {Math.floor(session.partialScore)}/100
          </motion.span>
        </motion.div>

        {/* Just 2 questions left message */}
        <AnimatePresence>
          {session.questionIndex >= 6 && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{
                fontSize: 12,
                color: '#8B8B8B',
                fontFamily: "'Outfit', sans-serif",
                margin: 0
              }}
            >
              Just {8 - session.questionIndex} question{8 - session.questionIndex !== 1 ? 's' : ''} left
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Question */}
      <div style={{ width: '100%', maxWidth: 500 }}>
        <AnimatePresence mode="wait">
          {renderQuestion()}
        </AnimatePresence>
      </div>

      {/* Celebration animation on completion */}
      <AnimatePresence>
        {celebrationShown && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              pointerEvents: 'none'
            }}
          >
            {/* Confetti burst */}
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  x: window.innerWidth / 2,
                  y: window.innerHeight / 2,
                  opacity: 1
                }}
                animate={{
                  x: window.innerWidth / 2 + (Math.random() - 0.5) * 400,
                  y: window.innerHeight / 2 + (Math.random() - 0.5) * 400,
                  opacity: 0,
                  rotate: Math.random() * 360
                }}
                transition={{
                  duration: 1.5,
                  ease: 'easeOut'
                }}
                style={{
                  position: 'absolute',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: ['#059669', '#FFD700', '#FF6B35'][Math.floor(Math.random() * 3)]
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error message */}
      <AnimatePresence>
        {session.error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              position: 'fixed',
              bottom: 24,
              left: 24,
              right: 24,
              maxWidth: 400,
              padding: 16,
              borderRadius: 8,
              backgroundColor: 'rgba(255, 107, 107, 0.1)',
              border: '1px solid #f87171',
              color: '#f87171',
              fontSize: 14,
              fontFamily: "'Outfit', sans-serif"
            }}
          >
            {session.error}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
