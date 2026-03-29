import { useState, useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

import { API_URL } from '../../lib/api'

interface EmailCaptureProps {
  sessionId: string
  onComplete: () => void
}

type Phase = 'analyzing' | 'form'

export function EmailCapture({ sessionId, onComplete }: EmailCaptureProps) {
  const reducedMotion = useReducedMotion()
  const [phase, setPhase] = useState<Phase>('analyzing')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [emailError, setEmailError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState('')
  const [focused, setFocused] = useState<'email' | 'phone' | null>(null)

  // Advance from loader to form after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setPhase('form')
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  const validateEmail = (value: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailError('')
    setApiError('')

    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`${API_URL}/api/sessions/${sessionId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone: phone.trim() || undefined }),
      })


      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setApiError((data as { error?: string }).error || 'Something went wrong. Please try again.')
        setSubmitting(false)
        return
      }

      // success
      onComplete()
    } catch {
      setApiError('Network error. Please check your connection and try again.')
      setSubmitting(false)
    }
  }

  return (
    <div
      style={{
        background: '#0A0A0A',
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
          background: 'radial-gradient(circle, rgba(52,211,153,0.08) 0%, transparent 70%)',
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
          background: 'radial-gradient(circle, rgba(5,150,105,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <AnimatePresence mode="wait">
        {phase === 'analyzing' ? (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.5 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 28,
              textAlign: 'center',
              maxWidth: 480,
            }}
          >
            {/* Spinner */}
            <motion.div
              animate={reducedMotion ? {} : { rotate: 360 }}
              transition={reducedMotion ? {} : { duration: 1.4, repeat: Infinity, ease: 'linear' }}
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                border: '3px solid rgba(52,211,153,0.15)',
                borderTopColor: '#064E3B',
                borderRightColor: '#059669',
              }}
            />

            {/* Pulsing text */}
            <motion.p
              animate={reducedMotion ? {} : { opacity: [0.6, 1, 0.6] }}
              transition={reducedMotion ? {} : { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                fontFamily: 'Outfit, sans-serif',
                fontSize: 'clamp(16px, 3vw, 22px)',
                color: 'rgba(253,252,250,0.85)',
                margin: 0,
                lineHeight: 1.5,
                letterSpacing: '0.01em',
              }}
            >
              Our intelligence is analyzing your answers…
            </motion.p>

            {/* Subtle dots */}
            <div style={{ display: 'flex', gap: 8 }}>
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={reducedMotion ? {} : { opacity: [0.2, 0.7, 0.2], scale: [0.85, 1.15, 0.85] }}
                  transition={reducedMotion ? {} : {
                    duration: 1.2,
                    repeat: Infinity,
                    delay: i * 0.3,
                    ease: 'easeInOut',
                  }}
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #064E3B, #059669)',
                  }}
                />
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              maxWidth: 440,
            }}
          >
            <motion.h2
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              style={{
                fontFamily: 'Outfit, sans-serif',
                fontSize: 'clamp(20px, 4vw, 28px)',
                color: '#FDFCFA',
                margin: '0 0 4px',
                textAlign: 'center',
                lineHeight: 1.3,
              }}
            >
              Analysis complete.
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.5 }}
              style={{
                fontFamily: 'Outfit, sans-serif',
                fontSize: 15,
                color: 'rgba(255,176,154,0.65)',
                margin: '0 0 24px',
                textAlign: 'center',
                lineHeight: 1.6,
              }}
            >
              Where should we send your results?
            </motion.p>

            <motion.form
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              onSubmit={(e) => void handleSubmit(e)}
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label
                  htmlFor="email-input"
                  style={{
                    fontFamily: 'Outfit, sans-serif',
                    fontSize: 13,
                    color: 'rgba(255,176,154,0.6)',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                  }}
                >
                  Email address
                </label>
                <input
                  id="email-input"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (emailError) setEmailError('')
                    if (apiError) setApiError('')
                  }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={submitting}
                  style={{
                    background: 'rgba(52,211,153,0.07)',
                    border: emailError
                      ? '1.5px solid #ef4444'
                      : focused === 'email'
                      ? '1.5px solid #064E3B'
                      : '1.5px solid rgba(52,211,153,0.3)',
                    borderRadius: 10,
                    padding: '13px 16px',
                    fontFamily: 'Outfit, sans-serif',
                    fontSize: 16,
                    color: '#FDFCFA',
                    outline: 'none',
                    width: '100%',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                />
                {emailError && (
                  <motion.p
                    id="email-error"
                    role="alert"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      fontFamily: 'Outfit, sans-serif',
                      fontSize: 13,
                      color: '#f87171',
                      margin: 0,
                    }}
                  >
                    {emailError}
                  </motion.p>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label
                  htmlFor="phone-input"
                  style={{
                    fontFamily: 'Outfit, sans-serif',
                    fontSize: 13,
                    color: 'rgba(255,176,154,0.6)',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                  }}
                >
                  WhatsApp / Phone <span style={{ opacity: 0.5, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
                </label>
                <input
                  id="phone-input"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  autoComplete="tel"
                  disabled={submitting}
                  style={{
                    background: 'rgba(52,211,153,0.07)',
                    border: focused === 'phone'
                      ? '1.5px solid #064E3B'
                      : '1.5px solid rgba(52,211,153,0.3)',
                    borderRadius: 10,
                    padding: '13px 16px',
                    fontFamily: 'Outfit, sans-serif',
                    fontSize: 16,
                    color: '#FDFCFA',
                    outline: 'none',
                    width: '100%',
                    boxSizing: 'border-box' as const,
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={() => setFocused('phone')}
                  onBlur={() => setFocused(null)}
                />
              </div>

              {apiError && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    fontFamily: 'Outfit, sans-serif',
                    fontSize: 13,
                    color: '#f87171',
                    margin: 0,
                    textAlign: 'center',
                  }}
                >
                  {apiError}
                </motion.p>
              )}

              <motion.button
                type="submit"
                disabled={submitting}
                whileHover={submitting ? undefined : { scale: 1.02 }}
                whileTap={submitting ? undefined : { scale: 0.98 }}
                style={{
                  marginTop: 4,
                  padding: '14px 24px',
                  borderRadius: 10,
                  border: 'none',
                  background: submitting
                    ? 'rgba(52,211,153,0.4)'
                    : 'linear-gradient(135deg, #064E3B, #059669)',
                  color: '#fff',
                  fontFamily: 'Outfit, sans-serif',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  letterSpacing: '0.02em',
                  transition: 'background 0.2s',
                }}
              >
                {submitting ? 'Submitting…' : 'Unlock my insights'}
              </motion.button>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
