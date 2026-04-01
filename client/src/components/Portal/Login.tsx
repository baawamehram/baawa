import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { API_URL } from '../../lib/api'
import { usePortalTheme, t } from './usePortalTheme'

export function PortalLogin() {
  const { theme, toggleTheme } = usePortalTheme()
  const tk = t(theme)
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [health, setHealth] = useState<'checking' | 'ok' | 'error'>('checking')

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${API_URL}/health`)
        if (res.ok) setHealth('ok')
        else setHealth('error')
      } catch {
        setHealth('error')
      }
    }
    void checkHealth()
  }, [])

  // If already authenticated, skip login
  useEffect(() => {
    fetch(`${API_URL}/api/portal/me`, { credentials: 'include' })
      .then((res) => { if (res.ok) navigate('/portal/results', { replace: true }) })
      .catch(() => { /* not logged in, stay on login */ })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('[LOGIN] handleSendCode called with email:', email)
    setError('')
    setLoading(true)
    try {
      const url = `${API_URL}/api/portal/login`
      const body = { email: email.toLowerCase().trim() }
      console.log('[LOGIN] Fetching:', url, 'with body:', body)
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      console.log('[LOGIN] Response status:', res.status)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        console.log('[LOGIN] Error response:', data)
        setError((data as { error?: string }).error ?? 'Failed to send code.')
        return
      }
      console.log('[LOGIN] Code sent successfully, moving to OTP step')
      setStep('otp')
    } catch (err) {
      console.error('[LOGIN] Catch block error:', err)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('[LOGIN] handleVerifyCode called with email:', email, 'code:', code)
    setError('')
    setLoading(true)
    try {
      const url = `${API_URL}/api/portal/verify`
      const body = { email: email.toLowerCase().trim(), token: code }
      console.log('[LOGIN] Fetching:', url, 'with body:', body)
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      console.log('[LOGIN] Response status:', res.status)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        console.log('[LOGIN] Error response:', data)
        setError((data as { error?: string }).error ?? 'Incorrect or expired code.')
        return
      }
      console.log('[LOGIN] Verification successful, navigating to /portal/results')
      navigate('/portal/results', { replace: true })
    } catch (err) {
      console.error('[LOGIN] Catch block error:', err)
      setError('Verification failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background: tk.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 20px', position: 'relative' }}>
      {/* Top-right controls */}
      <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          onClick={() => window.location.href = '/'}
          aria-label="Back to home"
          title="Back to home"
          style={{ background: 'none', border: `1px solid ${tk.border}`, borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: tk.textMuted, fontSize: 14, fontFamily: 'Outfit, sans-serif' }}
        >
          ← Home
        </button>
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          style={{ background: 'none', border: `1px solid ${tk.border}`, borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: tk.textMuted, fontSize: 16 }}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ width: '100%', maxWidth: 400 }}
      >
        <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 11, color: tk.accent, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
          Baawa Portal
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 'clamp(22px, 4vw, 28px)', color: tk.text, margin: 0, lineHeight: 1.3 }}>
            Client Login
          </h1>
          <div 
            title={health === 'ok' ? 'Connected to Baawa Intelligence' : 'Connecting to Baawa Intelligence...'}
            style={{ width: 8, height: 8, borderRadius: '50%', background: health === 'ok' ? '#10b981' : '#f59e0b', marginTop: 4 }} 
          />
        </div>

        {step === 'email' ? (
          <>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, color: tk.textMuted, margin: '0 0 24px', lineHeight: 1.6 }}>
              Enter your email to receive a 6-digit access code.
            </p>

            <form onSubmit={(e) => void handleSendCode(e)} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label htmlFor="portal-email" style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, color: tk.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Email address
                </label>
                <input
                  id="portal-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  disabled={loading}
                  style={{ background: tk.inputBg, border: `1.5px solid ${tk.accentBorder}`, borderRadius: 10, padding: '12px 16px', fontFamily: 'Outfit, sans-serif', fontSize: 15, color: tk.text, outline: 'none', width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              {error && (
                <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: '#ef4444', margin: 0 }}>{error}</p>
              )}

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={loading ? undefined : { scale: 1.02 }}
                whileTap={loading ? undefined : { scale: 0.98 }}
                style={{ padding: '13px 24px', borderRadius: 10, border: 'none', background: loading ? tk.accentLight : `linear-gradient(135deg, #064E3B, #059669)`, color: '#fff', fontFamily: 'Outfit, sans-serif', fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}
              >
                {loading ? 'Sending…' : 'Get access code →'}
              </motion.button>

              {health === 'error' && (
                <button 
                  type="button"
                  onClick={() => navigate('/portal/results', { replace: true })}
                  style={{ background: 'none', border: 'none', color: tk.accent, fontSize: 11, cursor: 'pointer', textAlign: 'center', marginTop: 8 }}
                >
                  Can't connect? View Strategic Preview
                </button>
              )}
            </form>
          </>
        ) : (
          <>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, color: tk.textMuted, margin: '0 0 24px', lineHeight: 1.6 }}>
              Enter the 6-digit code sent to <strong style={{ color: tk.text }}>{email}</strong>.
            </p>

            <form onSubmit={(e) => void handleVerifyCode(e)} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label htmlFor="portal-code" style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, color: tk.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Verification Code
                </label>
                <input
                  id="portal-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000 000"
                  required
                  disabled={loading}
                  style={{ background: tk.inputBg, border: `1.5px solid ${tk.accentBorder}`, borderRadius: 10, padding: '12px 16px', fontFamily: 'Outfit, sans-serif', fontSize: 24, fontWeight: 'bold', letterSpacing: '8px', textAlign: 'center', color: tk.text, outline: 'none', width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              {error && (
                <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: '#ef4444', margin: 0 }}>{error}</p>
              )}

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={loading ? undefined : { scale: 1.02 }}
                whileTap={loading ? undefined : { scale: 0.98 }}
                style={{ padding: '13px 24px', borderRadius: 10, border: 'none', background: loading ? tk.accentLight : `linear-gradient(135deg, #064E3B, #059669)`, color: '#fff', fontFamily: 'Outfit, sans-serif', fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}
              >
                {loading ? 'Verifying…' : 'Verify & Enter Portal →'}
              </motion.button>

              <button
                type="button"
                onClick={() => { setStep('email'); setError(''); setCode('') }}
                style={{ background: 'none', border: 'none', color: tk.accent, fontFamily: 'Outfit, sans-serif', fontSize: 13, cursor: 'pointer', textDecoration: 'underline', marginTop: 8 }}
              >
                Back to email
              </button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  )
}
