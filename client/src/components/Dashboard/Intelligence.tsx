import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { API_URL } from '../../lib/api'
import { useDashboardTheme } from './ThemeContext'
import { FunnelAnalytics } from './FunnelAnalytics'

interface FunnelStep {
  step: number
  count: number
  avg_latency: number
  voice_ratio: number
  avg_words: number
}

interface MetricsWindow {
  completion_rate: number | null
  avg_answer_words: number | null
  score_mean: number | null
  score_std: number | null
  score_distribution: Record<string, number>
}

interface MetricsResponse {
  windows: { '30d': MetricsWindow; '60d': MetricsWindow; '90d': MetricsWindow }
  active_config_version: number | null
  active_config_activated_at: string | null
}

interface ConfigVersion {
  id: number
  version: number
  status: 'active' | 'proposed' | 'archived' | 'dismissed'
  change_summary: string
  risk_level: 'low' | 'high'
  metrics_snapshot: Record<string, number> | null
  activated_at: string | null
  created_at: string
}

interface ConfigDetail extends ConfigVersion {
  system_prompt: string
  intro_messages: string[]
  scoring_weights: Record<string, number>
  reasoning: string
}

interface SentinelProposal {
  id: number
  session_id: string
  founder_email: string
  type: 'friction' | 'optimization' | 'anomaly'
  observation: string
  proposal: string
  behavioral_frame: string
  status: 'open' | 'applied' | 'dismissed'
  created_at: string
}

interface Props {
  token: string
  on401: () => void
}

const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` })

function fmt(n: number | string | null, suffix = '') {
  return n === null ? '—' : `${n}${suffix}`
}

function ScoreBar({ label, pct, theme }: { label: string; pct: number, theme: any }) {
  return (
    <div style={{ marginBottom: '6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
        <span style={{ fontSize: '11px', color: theme.textMuted }}>{label}</span>
        <span style={{ fontSize: '11px', color: theme.textMuted }}>{pct}</span>
      </div>
      <div style={{ height: '4px', background: theme.border, borderRadius: '2px', overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(pct * 2, 100)}%` }}
          transition={{ duration: 0.6 }}
          style={{ height: '100%', background: theme.text, borderRadius: '2px' }}
        />
      </div>
    </div>
  )
}

export function Intelligence({ token, on401 }: Props) {
  const { theme, isDark } = useDashboardTheme()
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null)
  const [configs, setConfigs] = useState<ConfigVersion[]>([])
  const [selectedConfig, setSelectedConfig] = useState<ConfigDetail | null>(null)
  const [window, setWindow] = useState<'30d' | '60d' | '90d'>('30d')
  const [optimizing, setOptimizing] = useState(false)
  const [optimizeResult, setOptimizeResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [proposals, setProposals] = useState<SentinelProposal[]>([])
  const [funnelData, setFunnelData] = useState<FunnelStep[]>([])
  const [totalStarted, setTotalStarted] = useState(0)

  const fetchData = async () => {
    try {
      const [metricsRes, configsRes, proposalsRes, funnelRes] = await Promise.all([
        fetch(`${API_URL}/api/journey/metrics`, { headers: authHeaders(token) }),
        fetch(`${API_URL}/api/journey/config`, { headers: authHeaders(token) }),
        fetch(`${API_URL}/api/assessments/sentinel/proposals`, { headers: authHeaders(token) }),
        fetch(`${API_URL}/api/journey/funnel`, { headers: authHeaders(token) }),
      ])
      if (metricsRes.status === 401 || configsRes.status === 401 || proposalsRes.status === 401 || funnelRes.status === 401) { on401(); return }
      setMetrics(await metricsRes.json())
      setConfigs(await configsRes.json())
      setProposals(await proposalsRes.json())
      const funnel = await funnelRes.json()
      setFunnelData(funnel.steps)
      setTotalStarted(funnel.totalStarted)
    } catch (e) {
      console.error('Intelligence fetch error:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void fetchData() }, [])

  const loadConfigDetail = async (id: number) => {
    const res = await fetch(`${API_URL}/api/journey/config/${id}`, { headers: authHeaders(token) })
    if (res.status === 401) { on401(); return }
    setSelectedConfig(await res.json())
  }

  const handleActivate = async (id: number) => {
    const res = await fetch(`${API_URL}/api/journey/config/${id}/activate`, {
      method: 'POST',
      headers: authHeaders(token),
    })
    if (res.status === 401) { on401(); return }
    setSelectedConfig(null)
    void fetchData()
  }

  const handleDismiss = async (id: number) => {
    await fetch(`${API_URL}/api/journey/config/${id}/dismiss`, {
      method: 'POST',
      headers: authHeaders(token),
    })
    setSelectedConfig(null)
    void fetchData()
  }

  const handleUpdateProposal = async (id: number, status: 'applied' | 'dismissed') => {
    await fetch(`${API_URL}/api/assessments/sentinel/${id}/status`, {
      method: 'PATCH',
      headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
    void fetchData()
  }

  const handleOptimize = async () => {
    setOptimizing(true)
    setOptimizeResult(null)
    try {
      const res = await fetch(`${API_URL}/api/journey/optimize`, {
        method: 'POST',
        headers: authHeaders(token),
      })
      if (res.status === 401) { on401(); return }
      const data = await res.json() as { skipped?: boolean; reason?: string; activated?: boolean; proposed?: boolean }
      if (data.skipped) setOptimizeResult(`Skipped: ${data.reason}`)
      else if (data.activated) setOptimizeResult('New config auto-activated (low-risk change)')
      else if (data.proposed) setOptimizeResult('New config proposed — check pending card below')
      void fetchData()
    } catch {
      setOptimizeResult('Optimizer run failed — check server logs')
    } finally {
      setOptimizing(false)
    }
  }

  const w = metrics?.windows[window]
  const pendingConfig = configs.find((c) => c.status === 'proposed')
  const activeConfig = configs.find((c) => c.status === 'active')

  if (loading) {
    return (
      <div style={{ padding: '32px 0', textAlign: 'center', color: theme.textMuted, fontFamily: "'Outfit', sans-serif" }}>
        Loading intelligence data…
      </div>
    )
  }

  // Zero State: No metrics yet
  if (!metrics || (!metrics.windows['30d'].completion_rate && configs.length <= 1)) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', maxWidth: '600px', margin: '0 auto', fontFamily: "'Outfit', sans-serif" }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>👁️</div>
        <h2 style={{ color: theme.text, fontSize: '24px', fontWeight: 600, marginBottom: '12px' }}>Awaiting First Journey</h2>
        <p style={{ color: theme.textMuted, fontSize: '15px', lineHeight: 1.6, marginBottom: '32px' }}>
          The Intelligence engine needs data from completed assessments to generate insights and optimize your funnel. Start a "Cosmic Journey" on your landing page to see the stats appear here!
        </p>
        <button
          onClick={() => void fetchData()}
          style={{ background: theme.primary, color: theme.primaryText, border: 'none', borderRadius: '6px', padding: '10px 20px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
        >
          Refresh Data
        </button>
      </div>
    )
  }

  return (
    <div style={{ paddingTop: '24px', paddingBottom: '24px', maxWidth: '900px', fontFamily: "'Outfit', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ color: theme.text, fontSize: '20px', fontWeight: 600, margin: 0 }}>Journey Intelligence</h2>
          {activeConfig && (
            <p style={{ color: theme.textMuted, fontSize: '12px', margin: '4px 0 0 0' }}>
              Config v{activeConfig.version} active
              {metrics?.active_config_activated_at
                ? ` · activated ${new Date(metrics.active_config_activated_at).toLocaleDateString()}`
                : ''}
            </p>
          )}
        </div>
        <button
          onClick={() => void handleOptimize()}
          disabled={optimizing}
          style={{ background: optimizing ? theme.border : theme.text, color: theme.bg, border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', fontWeight: 700, cursor: optimizing ? 'default' : 'pointer', fontFamily: "'Outfit', sans-serif" }}
        >
          {optimizing ? 'Running…' : 'Run Optimizer'}
        </button>
      </div>

      {optimizeResult && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ background: theme.input, border: `1px solid ${theme.border}`, borderRadius: '6px', padding: '10px 14px', marginBottom: '20px', color: theme.textMuted, fontSize: '13px' }}
        >
          {optimizeResult}
        </motion.div>
      )}

      {/* Metrics strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Completion Rate', value: fmt(w?.completion_rate ? (w.completion_rate * 100).toFixed(1) : null, '%') },
          { label: 'Avg Answer Depth', value: fmt(w?.avg_answer_words ? Math.round(w.avg_answer_words) : null, ' words') },
          { label: 'Score Mean', value: fmt(w?.score_mean ? Math.round(w.score_mean) : null, '/100') },
          { label: 'Score Std Dev', value: fmt(w?.score_std ? Math.round(w.score_std) : null, '') },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '14px 16px' }}>
            <p style={{ color: theme.textMuted, fontSize: '11px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px 0' }}>{label}</p>
            <p style={{ color: theme.text, fontSize: '22px', fontWeight: 700, margin: 0 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Window selector */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {(['30d', '60d', '90d'] as const).map((d) => (
          <button
            key={d}
            onClick={() => setWindow(d)}
            style={{
              background: window === d ? theme.text : theme.input,
              color: window === d ? theme.bg : theme.textMuted,
              border: `1px solid ${window === d ? theme.text : theme.border}`,
              borderRadius: '6px',
              padding: '4px 12px',
              fontSize: '12px',
              cursor: 'pointer',
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Funnel Analytics Section */}
      <FunnelAnalytics data={funnelData} totalStarted={totalStarted} />

      {/* Sentinel Findings Inbox */}
      {proposals.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '18px' }}>🛰️</span>
            <h3 style={{ color: theme.text, fontSize: '16px', fontWeight: 600, margin: 0 }}>Cosmic Sentinel Insights</h3>
          </div>
          <div style={{ display: 'grid', gap: '12px' }}>
            {proposals.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: '10px', padding: '16px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: p.type === 'friction' ? '#FF6B3520' : '#4ade8020', color: p.type === 'friction' ? '#FF6B35' : '#4ade80', textTransform: 'uppercase', marginRight: '8px' }}>
                      {p.type}
                    </span>
                    <span style={{ fontSize: '10px', border: `1px solid ${theme.border}`, color: theme.textMuted, padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                      {p.behavioral_frame}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: theme.textMuted }}>{p.founder_email}</span>
                </div>
                <p style={{ color: theme.text, fontSize: '14px', margin: '0 0 8px 0', lineHeight: 1.5 }}>{p.observation}</p>
                <div style={{ background: theme.input, borderRadius: '6px', padding: '10px', marginBottom: '12px' }}>
                  <p style={{ color: '#FF6B35', fontSize: '12px', fontWeight: 700, margin: '0 0 4px 0', textTransform: 'uppercase' }}>Proposal</p>
                  <p style={{ color: theme.text, fontSize: '13px', margin: 0 }}>{p.proposal}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => void handleUpdateProposal(p.id, 'applied')} style={{ background: theme.text, color: theme.bg, border: 'none', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Apply</button>
                  <button onClick={() => void handleUpdateProposal(p.id, 'dismissed')} style={{ background: 'transparent', color: theme.textMuted, border: `1px solid ${theme.border}`, borderRadius: '6px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer' }}>Dismiss</button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Score distribution */}
      {w?.score_distribution && (
        <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
          <p style={{ color: theme.textMuted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px', margin: '0 0 12px 0' }}>Score Distribution</p>
          {Object.entries(w.score_distribution).map(([bucket, count]) => (
            <ScoreBar key={bucket} label={bucket} pct={count} theme={theme} />
          ))}
        </div>
      )}

      {/* Pending approval card */}
      <AnimatePresence>
        {pendingConfig && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '20px', marginBottom: '20px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <span style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', color: theme.text, fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Awaiting Approval · High-Risk
                </span>
                <p style={{ color: theme.text, fontSize: '16px', fontWeight: 600, margin: '8px 0 4px 0' }}>
                  Config v{pendingConfig.version}
                </p>
                <p style={{ color: theme.textMuted, fontSize: '14px', margin: 0 }}>
                  {pendingConfig.change_summary}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => void loadConfigDetail(pendingConfig.id)}
                style={{ background: theme.input, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: '6px', padding: '7px 14px', fontSize: '13px', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}
              >
                Review Details
              </button>
              <button
                onClick={() => void handleActivate(pendingConfig.id)}
                style={{ background: theme.text, color: theme.bg, border: 'none', borderRadius: '6px', padding: '7px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}
              >
                Activate
              </button>
              <button
                onClick={() => void handleDismiss(pendingConfig.id)}
                style={{ background: 'transparent', color: theme.textMuted, border: `1px solid ${theme.border}`, borderRadius: '6px', padding: '7px 14px', fontSize: '13px', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Config detail modal */}
      <AnimatePresence>
        {selectedConfig && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}
            onClick={() => setSelectedConfig(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '28px', maxWidth: '700px', width: '100%', maxHeight: '80vh', overflowY: 'auto' }}
            >
              <h3 style={{ color: theme.text, fontSize: '18px', fontWeight: 600, margin: '0 0 4px 0' }}>Config v{selectedConfig.version}</h3>
              <p style={{ color: theme.textMuted, fontSize: '13px', margin: '0 0 20px 0' }}>{selectedConfig.change_summary}</p>

              <p style={{ color: theme.textMuted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px 0' }}>Scoring Weights</p>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                {Object.entries(selectedConfig.scoring_weights).map(([k, v]) => (
                  <span key={k} style={{ background: theme.input, borderRadius: '6px', padding: '4px 10px', fontSize: '13px', color: theme.text }}>
                    {k}: <strong>{v}</strong>
                  </span>
                ))}
              </div>

              <p style={{ color: theme.textMuted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px 0' }}>Reasoning</p>
              <p style={{ color: theme.textMuted, fontSize: '13px', lineHeight: 1.6, margin: '0 0 20px 0' }}>{selectedConfig.reasoning}</p>

              <p style={{ color: theme.textMuted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px 0' }}>System Prompt</p>
              <pre style={{ background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: '6px', padding: '14px', fontSize: '11px', color: theme.textMuted, overflowX: 'auto', whiteSpace: 'pre-wrap', margin: '0 0 20px 0' }}>
                {selectedConfig.system_prompt}
              </pre>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setSelectedConfig(null)}
                  style={{ background: theme.input, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: '6px', padding: '8px 16px', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}
                >
                  Close
                </button>
                {selectedConfig.status === 'proposed' && (
                  <>
                    <button
                      onClick={() => void handleActivate(selectedConfig.id)}
                      style={{ background: theme.text, color: theme.bg, border: 'none', borderRadius: '6px', padding: '8px 16px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}
                    >
                      Activate
                    </button>
                    <button
                      onClick={() => void handleDismiss(selectedConfig.id)}
                      style={{ background: 'transparent', color: theme.textMuted, border: `1px solid ${theme.border}`, borderRadius: '6px', padding: '8px 16px', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}
                    >
                      Dismiss
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Version history */}
      <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${theme.border}` }}>
          <p style={{ color: theme.textMuted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Version History</p>
        </div>
        {configs.length === 0 && (
          <p style={{ color: theme.textMuted, fontSize: '13px', padding: '16px', margin: 0 }}>No config versions yet.</p>
        )}
        {configs.map((c) => {
          const statusColor: Record<string, string> = {
            active: '#4ade80',
            proposed: theme.text,
            archived: theme.textMuted,
            dismissed: '#f87171',
          }
          return (
            <div
              key={c.id}
              onClick={() => void loadConfigDetail(c.id)}
              style={{ padding: '12px 16px', borderBottom: `1px solid ${isDark ? '#222222' : '#f0f0f0'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'background 0.2s' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: theme.textMuted, fontSize: '12px', minWidth: '40px' }}>v{c.version}</span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    background: `${statusColor[c.status]}20`,
                    color: statusColor[c.status],
                  }}
                >
                  {c.status}
                </span>
                <span style={{ color: theme.text, fontSize: '13px' }}>{c.change_summary}</span>
              </div>
              <span style={{ color: theme.textMuted, fontSize: '11px' }}>
                {new Date(c.created_at).toLocaleDateString()}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
