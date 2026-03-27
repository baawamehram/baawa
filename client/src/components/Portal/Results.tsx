import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { portalFetch } from '../../lib/portalApi'
import { usePortalTheme, t } from './usePortalTheme'
import { MessagesPanel, type PortalMessage } from './MessagesPanel'

interface Assessment {
  id: number
  email: string
  created_at: string
  conversation: Array<{ role: 'user' | 'assistant'; content: string }>
  results_unlocked: boolean
  score: number | null
  score_breakdown: Record<string, number> | null
  score_summary: string | null
  biggest_opportunity: string | null
  biggest_risk: string | null
}

const DIMENSION_LABELS: Record<string, string> = {
  pmf: 'Product-Market Fit',
  validation: 'Validation',
  growth: 'Growth',
  mindset: 'Mindset',
  revenue: 'Revenue',
}

export function PortalResults() {
  const { theme, toggleTheme } = usePortalTheme()
  const tk = t(theme)
  const navigate = useNavigate()
  const location = useLocation()
  const sessionExpiredMsg = (location.state as { message?: string } | null)?.message ?? ''

  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [messages, setMessages] = useState<PortalMessage[]>([])
  const [loadError, setLoadError] = useState('')
  const [sendError, setSendError] = useState('')
  const [transcriptOpen, setTranscriptOpen] = useState(false)

  const prefersNoMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const on401 = useCallback(() => {
    navigate('/portal/login', { replace: true, state: { message: 'Your session expired — log in again.' } })
  }, [navigate])

  useEffect(() => {
    const load = async () => {
      const [meRes, msgsRes] = await Promise.all([
        portalFetch('/api/portal/me', on401),
        portalFetch('/api/portal/messages', on401),
      ])
      if (!meRes || !msgsRes) return // 401 already handled
      if (!meRes.ok) { setLoadError('Failed to load your assessment.'); return }
      const [me, msgs] = await Promise.all([meRes.json(), msgsRes.json()])
      setAssessment(me as Assessment)
      setMessages(msgs as PortalMessage[])
    }
    void load()
  }, [on401])

  const handleSendMessage = async (body: string) => {
    setSendError('')
    const res = await portalFetch('/api/portal/messages', on401, {
      method: 'POST',
      body: JSON.stringify({ body }),
    })
    if (!res) return // 401 handled
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setSendError((data as { error?: string }).error ?? 'Failed to send. Try again.')
      return
    }
    // Optimistic update
    setMessages((prev) => [...prev, {
      id: Date.now(),
      sender: 'prospect',
      body,
      created_at: new Date().toISOString(),
    }])
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640

  if (loadError) {
    return (
      <div style={{ background: tk.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'Outfit, sans-serif', color: tk.textMuted }}>{loadError}</p>
      </div>
    )
  }

  if (!assessment) {
    return (
      <div style={{ background: tk.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div
          animate={prefersNoMotion ? {} : { opacity: [0.5, 1, 0.5] }}
          transition={prefersNoMotion ? {} : { duration: 1.4, repeat: Infinity }}
          style={{ fontFamily: 'Outfit, sans-serif', fontSize: 16, color: tk.textMuted }}>
          Loading your results…
        </motion.div>
      </div>
    )
  }

  const breakdown = assessment.score_breakdown ?? {}

  return (
    <div style={{ background: tk.bg, minHeight: '100vh', padding: '24px 20px', boxSizing: 'border-box' }}>
      {/* Theme toggle */}
      <button onClick={toggleTheme} aria-label="Toggle theme"
        style={{ position: 'fixed', top: 16, right: 16, zIndex: 10, background: 'none', border: `1px solid ${tk.border}`, borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: tk.textMuted, fontSize: 16 }}>
        {theme === 'light' ? '🌙' : '☀️'}
      </button>

      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          {sessionExpiredMsg && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontFamily: 'Outfit, sans-serif', fontSize: 13, color: '#ef4444' }}>
              {sessionExpiredMsg}
            </div>
          )}
          <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 11, color: tk.accent, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>Baawa Assessment</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 'clamp(20px, 3vw, 26px)', color: tk.text, margin: 0 }}>Your Results</h1>
            <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, color: tk.textMuted }}>
              Submitted {new Date(assessment.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Two-column layout */}
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 16, alignItems: 'flex-start' }}>

          {/* LEFT: Results (2/3) */}
          <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 12 }}>

            {assessment.results_unlocked ? (
              <>
                {/* Score + Summary row */}
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ background: tk.accentLight, border: `1.5px solid ${tk.accentBorder}`, borderRadius: 10, padding: '16px 20px', textAlign: 'center', minWidth: 88 }}>
                    <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 36, color: tk.accent, fontWeight: 700, lineHeight: 1 }}>{assessment.score}</div>
                    <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 10, color: tk.textMuted, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Score</div>
                  </div>
                  <div style={{ flex: 1, background: tk.bg2, border: `1px solid ${tk.border}`, borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 10, color: tk.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Summary</div>
                    <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: tk.text, lineHeight: 1.6 }}>{assessment.score_summary}</div>
                  </div>
                </div>

                {/* Opp + Risk */}
                <div style={{ display: 'flex', gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
                  <div style={{ flex: 1, background: tk.accentLight, border: `1px solid ${tk.accentBorder}`, borderRadius: 8, padding: 12 }}>
                    <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 10, color: tk.accent, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>✦ Biggest Opportunity</div>
                    <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: tk.text, lineHeight: 1.5 }}>{assessment.biggest_opportunity}</div>
                  </div>
                  <div style={{ flex: 1, background: tk.riskBg, border: `1px solid ${tk.riskBorder}`, borderRadius: 8, padding: 12 }}>
                    <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 10, color: tk.riskText, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>⚠ Biggest Risk</div>
                    <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: tk.text, lineHeight: 1.5 }}>{assessment.biggest_risk}</div>
                  </div>
                </div>

                {/* Score breakdown */}
                {Object.keys(breakdown).length > 0 && (
                  <div style={{ background: tk.bg2, border: `1px solid ${tk.border}`, borderRadius: 8, padding: '14px 16px' }}>
                    <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 10, color: tk.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Score Breakdown</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {Object.entries(breakdown).map(([key, value]) => (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, color: tk.textMuted, width: 140, flexShrink: 0 }}>{DIMENSION_LABELS[key] ?? key}</span>
                          <div style={{ flex: 1, height: 4, background: tk.border, borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ width: `${value}%`, height: '100%', background: `linear-gradient(90deg, #FF6B35, #E85520)`, borderRadius: 2 }} />
                          </div>
                          <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, color: tk.accent, minWidth: 24, textAlign: 'right' }}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Locked state */
              <div style={{ background: tk.bg2, border: `1px solid ${tk.border}`, borderRadius: 12, padding: 24, textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
                <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 18, color: tk.text, margin: '0 0 8px' }}>Under review</h2>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, color: tk.textMuted, margin: 0, lineHeight: 1.65 }}>
                  Our experts are reviewing your submission. You'll receive your results directly from us.
                </p>
              </div>
            )}

            {/* Transcript toggle */}
            <div
              onClick={() => setTranscriptOpen((o) => !o)}
              style={{ background: tk.bg2, border: `1px solid ${tk.border}`, borderRadius: 8, padding: '12px 16px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: tk.textMuted }}>Your answers</span>
                <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, color: tk.accent }}>{transcriptOpen ? '▲ Hide' : '▼ Show transcript'}</span>
              </div>
              <AnimatePresence>
                {transcriptOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{ overflow: 'hidden', marginTop: 12 }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 400, overflowY: 'auto' }}>
                      {(assessment.conversation ?? []).map((msg, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                          <div style={{
                            maxWidth: '80%',
                            padding: '10px 14px',
                            borderRadius: msg.role === 'user' ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
                            background: msg.role === 'user' ? tk.accentLight : tk.bg,
                            border: `1px solid ${tk.border}`,
                            fontFamily: 'Outfit, sans-serif',
                            fontSize: 13,
                            color: tk.text,
                            lineHeight: 1.55,
                          }}>
                            {msg.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Consultant CTA */}
            <div style={{ background: tk.accentLight, border: `1px solid ${tk.accentBorder}`, borderRadius: 8, padding: '14px 16px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: tk.textMuted, marginBottom: 4 }}>Want a deeper review with a consultant?</div>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: tk.accent }}>We'll reach out — stay tuned.</div>
            </div>
          </div>

          {/* RIGHT: Messages (1/3 on desktop, full width on mobile) */}
          <div style={{ flex: 1, width: isMobile ? '100%' : undefined, minWidth: 0 }}>
            <MessagesPanel
              messages={messages}
              theme={theme}
              onSend={handleSendMessage}
              sendError={sendError}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
