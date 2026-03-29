import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { portalFetch } from '../../lib/portalApi'
import { API_URL } from '../../lib/api'
import { usePortalTheme, t } from './usePortalTheme'
import { MessagesPanel, type PortalMessage } from './MessagesPanel'
import { PortalCall } from './PortalCall'
import { PortalProposal } from './PortalProposal'
import { PortalDeliverables } from './PortalDeliverables'
import { PortalInsights } from './PortalInsights'

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
  problem_domains: Array<{ domain: string; subCategory: string; confidence: number }> | null
}

const DIMENSION_LABELS: Record<string, string> = {
  pmf: 'Product-Market Fit',
  validation: 'Validation',
  growth: 'Growth',
  mindset: 'Mindset',
  revenue: 'Revenue',
}

const DOMAIN_COLORS: Record<string, string> = {
  Marketing: '#FF6B35',
  Sales: '#E85520',
  Engineering: '#3B82F6',
  Operations: '#8B5CF6',
  Strategy: '#F59E0B',
  Finance: '#10B981',
  Research: '#EC4899',
  Product: '#06B6D4',
}

type Tab = 'results' | 'call' | 'proposal' | 'work' | 'insights' | 'messages'

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'results', label: 'Results', emoji: '📊' },
  { id: 'call', label: 'Book Call', emoji: '📅' },
  { id: 'proposal', label: 'Proposal', emoji: '📋' },
  { id: 'work', label: 'Work', emoji: '📦' },
  { id: 'insights', label: 'Insights', emoji: '💡' },
  { id: 'messages', label: 'Messages', emoji: '💬' },
]

export function PortalResults() {
  const { theme, toggleTheme } = usePortalTheme()
  const tk = t(theme)
  const navigate = useNavigate()
  const location = useLocation()
  const sessionExpiredMsg = (location.state as { message?: string } | null)?.message ?? ''

  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [allAssessments, setAllAssessments] = useState<Array<{ id: number; created_at: string; score: number | null }>>([])
  const [showHistory, setShowHistory] = useState(false)
  const [messages, setMessages] = useState<PortalMessage[]>([])
  const [loadError, setLoadError] = useState('')
  const [sendError, setSendError] = useState('')
  const [transcriptOpen, setTranscriptOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('results')
  const [switching, setSwitching] = useState(false)

  const prefersNoMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const on401 = useCallback(() => {
    navigate('/portal/login', { replace: true, state: { message: 'Your session expired — log in again.' } })
  }, [navigate])

  const [showDemoBypass, setShowDemoBypass] = useState(false)

  const load = useCallback(async () => {
    try {
      const [meRes, msgsRes, listRes] = await Promise.all([
        portalFetch(`${API_URL}/api/portal/me`, on401),
        portalFetch(`${API_URL}/api/portal/messages`, on401),
        portalFetch(`${API_URL}/api/portal/assessments`, on401),
      ])
      if (!meRes || !msgsRes || !listRes) return
      if (!meRes.ok) { setLoadError('Connecting to Baawa Intelligence...'); return }
      const [me, msgs, list] = await Promise.all([meRes.json(), msgsRes.json(), listRes.json()])
      setAssessment(me as Assessment)
      setMessages(msgs as PortalMessage[])
      setAllAssessments(list)
    } catch (err) {
      console.error('Portal load failed:', err)
      setLoadError('Connecting to Baawa Intelligence...')
    }
  }, [on401])

  useEffect(() => {
    void load()
    const timer = setTimeout(() => {
      if (!assessment) setShowDemoBypass(true)
    }, 5000)
    return () => clearTimeout(timer)
  }, [load, assessment])

  const MOCK_ASSESSMENT: Assessment = {
    id: 999,
    email: 'hello@baawa.co',
    created_at: new Date().toISOString(),
    conversation: [
      { role: 'assistant', content: "Let's look at your PMF score. How's the retention?" },
      { role: 'user', content: "It's around 40% month over month." }
    ],
    results_unlocked: true,
    score: 84,
    score_breakdown: { pmf: 82, validation: 75, growth: 90, mindset: 88, revenue: 85 },
    score_summary: "Strategic Baseline: Your business has a strong core but is hitting a 'Scaling Wall'. We recommend focus on Operations normalization before the next growth spurt.",
    biggest_opportunity: "Automating customer onboarding could save 15h/week for the ops team.",
    biggest_risk: "Single-channel acquisition dependency (Google Ads).",
    problem_domains: [
      { domain: 'Marketing', subCategory: 'Acquisition', confidence: 0.95 },
      { domain: 'Strategy', subCategory: 'Scaling', confidence: 0.88 }
    ]
  }

  const activateDemo = () => {
    setAssessment(MOCK_ASSESSMENT)
    setAllAssessments([{ id: 999, created_at: new Date().toISOString(), score: 84 }])
  }

  const handleSwitch = async (id: number) => {
    if (id === assessment?.id) return
    setSwitching(true)
    setShowHistory(false)
    const res = await portalFetch('/api/portal/switch', on401, {
      method: 'POST',
      body: JSON.stringify({ assessmentId: id }),
    })
    if (res?.ok) {
      await load()
    }
    setSwitching(false)
  }

  const handleSendMessage = async (body: string) => {
    setSendError('')
    const res = await portalFetch('/api/portal/messages', on401, {
      method: 'POST',
      body: JSON.stringify({ body }),
    })
    if (!res) return
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setSendError((data as { error?: string }).error ?? 'Failed to send. Try again.')
      return
    }
    setMessages((prev) => [...prev, { id: Date.now(), sender: 'prospect', body, created_at: new Date().toISOString() }])
  }

  if (loadError && !assessment) {
    return (
      <div style={{ background: tk.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
        <p style={{ fontFamily: 'Outfit, sans-serif', color: tk.textMuted }}>{loadError}</p>
        <button 
          onClick={activateDemo}
          style={{ background: tk.accent, color: '#000', border: 'none', borderRadius: 8, padding: '12px 24px', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}
        >
          View Strategic Preview
        </button>
      </div>
    )
  }

  if (!assessment) {
    return (
      <div style={{ background: tk.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
        <motion.div
          animate={prefersNoMotion ? {} : { opacity: [0.5, 1, 0.5] }}
          transition={prefersNoMotion ? {} : { duration: 1.4, repeat: Infinity }}
          style={{ fontFamily: 'Outfit, sans-serif', fontSize: 16, color: tk.textMuted }}
        >
          Connecting to Baawa Intelligence…
        </motion.div>
        {showDemoBypass && (
          <button 
            onClick={activateDemo}
            style={{ background: 'none', border: `1px solid ${tk.border}`, color: tk.accent, borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: 12 }}
          >
            Force-load Strategic Preview
          </button>
        )}
      </div>
    )
  }

  const breakdown = assessment.score_breakdown ?? {}
  const domains = assessment.problem_domains ?? []

  return (
    <div style={{ background: tk.bg, minHeight: '100vh', boxSizing: 'border-box' }}>
      {/* Theme toggle */}
      <button onClick={toggleTheme} aria-label="Toggle theme"
        style={{ position: 'fixed', top: 16, right: 16, zIndex: 100, background: 'none', border: `1px solid ${tk.border}`, borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: tk.textMuted, fontSize: 16 }}>
        {theme === 'light' ? '🌙' : '☀️'}
      </button>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          {sessionExpiredMsg && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontFamily: 'Outfit, sans-serif', fontSize: 13, color: '#ef4444' }}>
              {sessionExpiredMsg}
            </div>
          )}
          <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 11, color: tk.accent, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>Baawa Portal</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 'clamp(20px, 3vw, 26px)', color: tk.text, margin: 0 }}>Your Dashboard</h1>
              {allAssessments.length > 1 && (
                <div style={{ position: 'relative' }}>
                  <button 
                    onClick={() => setShowHistory(!showHistory)}
                    style={{ background: tk.bg2, border: `1px solid ${tk.border}`, borderRadius: 6, padding: '4px 8px', fontFamily: 'Outfit, sans-serif', fontSize: 11, color: tk.accent, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    {new Date(assessment.created_at).toLocaleDateString()} {showHistory ? '▲' : '▼'}
                  </button>
                  <AnimatePresence>
                    {showHistory && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: tk.bg2, border: `1px solid ${tk.border}`, borderRadius: 8, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)', zIndex: 50, minWidth: 160, padding: 4 }}
                      >
                        <div style={{ padding: '6px 10px', fontSize: 10, color: tk.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Submission History</div>
                        {allAssessments.map(a => (
                          <button 
                            key={a.id}
                            onClick={() => handleSwitch(a.id)}
                            style={{ width: '100%', textAlign: 'left', background: a.id === assessment.id ? tk.accentLight : 'none', border: 'none', borderRadius: 6, padding: '8px 10px', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: 12, color: a.id === assessment.id ? tk.accent : tk.text, transition: 'background 0.2s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                          >
                            <span>{new Date(a.created_at).toLocaleDateString()}</span>
                            {a.score !== null && <span style={{ fontSize: 10, opacity: 0.7 }}>Score: {a.score}</span>}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
            <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, color: tk.textMuted }}>
              {assessment.email}
            </span>
          </div>
          {switching && <div style={{ fontSize: 10, color: tk.accent, marginTop: 4 }}>Switching submission…</div>}

          {/* Domain pills */}
          {domains.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {domains.map(d => (
                <span key={d.domain} style={{
                  fontFamily: 'Outfit, sans-serif', fontSize: 11, borderRadius: 4, padding: '3px 8px', fontWeight: 600, letterSpacing: '0.04em',
                  background: `${DOMAIN_COLORS[d.domain] ?? '#FF6B35'}18`,
                  color: DOMAIN_COLORS[d.domain] ?? '#FF6B35',
                  border: `1px solid ${DOMAIN_COLORS[d.domain] ?? '#FF6B35'}40`,
                }}>
                  {d.domain} · {d.subCategory}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Tab nav */}
        <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${tk.border}`, marginBottom: 24, overflowX: 'auto', paddingBottom: 1 }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                padding: '8px 14px', fontFamily: 'Outfit, sans-serif', fontSize: 13,
                color: activeTab === tab.id ? tk.accent : tk.textMuted,
                borderBottom: `2px solid ${activeTab === tab.id ? tk.accent : 'transparent'}`,
                fontWeight: activeTab === tab.id ? 700 : 400,
                transition: 'all 0.15s',
              }}
            >
              {tab.emoji} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'results' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {assessment.results_unlocked ? (
                  <>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ background: tk.accentLight, border: `1.5px solid ${tk.accentBorder}`, borderRadius: 10, padding: '16px 20px', textAlign: 'center', minWidth: 88 }}>
                        <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 36, color: tk.accent, fontWeight: 700, lineHeight: 1 }}>{assessment.score}</div>
                        <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 10, color: tk.textMuted, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Score</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 200, background: tk.bg2, border: `1px solid ${tk.border}`, borderRadius: 10, padding: '12px 14px' }}>
                        <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 10, color: tk.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Summary</div>
                        <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: tk.text, lineHeight: 1.6 }}>{assessment.score_summary}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 180, background: tk.accentLight, border: `1px solid ${tk.accentBorder}`, borderRadius: 8, padding: 12 }}>
                        <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 10, color: tk.accent, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>✦ Biggest Opportunity</div>
                        <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: tk.text, lineHeight: 1.5 }}>{assessment.biggest_opportunity}</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 180, background: tk.riskBg, border: `1px solid ${tk.riskBorder}`, borderRadius: 8, padding: 12 }}>
                        <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 10, color: tk.riskText, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>⚠ Biggest Risk</div>
                        <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: tk.text, lineHeight: 1.5 }}>{assessment.biggest_risk}</div>
                      </div>
                    </div>
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
                  <div style={{ background: tk.bg2, border: `1px solid ${tk.border}`, borderRadius: 12, padding: 28, textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
                    <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 18, color: tk.text, margin: '0 0 8px' }}>Under review</h2>
                    <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, color: tk.textMuted, margin: 0, lineHeight: 1.65 }}>
                      Our experts are reviewing your submission. You'll receive your results shortly.
                    </p>
                  </div>
                )}
                {/* Transcript */}
                <div onClick={() => setTranscriptOpen(o => !o)} style={{ background: tk.bg2, border: `1px solid ${tk.border}`, borderRadius: 8, padding: '12px 16px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: tk.textMuted }}>Your answers</span>
                    <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, color: tk.accent }}>{transcriptOpen ? '▲ Hide' : '▼ Show transcript'}</span>
                  </div>
                  <AnimatePresence>
                    {transcriptOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} style={{ overflow: 'hidden', marginTop: 12 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 400, overflowY: 'auto' }}>
                          {(assessment.conversation ?? []).map((msg, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                              <div style={{ maxWidth: '80%', padding: '10px 14px', borderRadius: msg.role === 'user' ? '10px 10px 2px 10px' : '10px 10px 10px 2px', background: msg.role === 'user' ? tk.accentLight : tk.bg, border: `1px solid ${tk.border}`, fontFamily: 'Outfit, sans-serif', fontSize: 13, color: tk.text, lineHeight: 1.55 }}>
                                {msg.content}
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {activeTab === 'call' && <PortalCall theme={theme} on401={on401} />}
            {activeTab === 'proposal' && <PortalProposal theme={theme} on401={on401} />}
            {activeTab === 'work' && <PortalDeliverables theme={theme} on401={on401} />}
            {activeTab === 'insights' && <PortalInsights theme={theme} on401={on401} problemDomains={domains} />}
            {activeTab === 'messages' && (
              <MessagesPanel messages={messages} theme={theme} onSend={handleSendMessage} sendError={sendError} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
