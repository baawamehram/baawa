import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { API_URL } from '../../lib/api'

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

interface Props {
  token: string
  on401: () => void
}

const CORAL = '#FF6B35'
const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` })

function fmt(n: number | null, suffix = '') {
  return n === null ? '—' : `${n}${suffix}`
}

function ScoreBar({ label, pct }: { label: string; pct: number }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{label}</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{pct}</span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(pct * 2, 100)}%` }}
          transition={{ duration: 0.6 }}
          style={{ height: '100%', background: CORAL, borderRadius: 2 }}
        />
      </div>
    </div>
  )
}

export function Intelligence({ token, on401 }: Props) {
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null)
  const [configs, setConfigs] = useState<ConfigVersion[]>([])
  const [selectedConfig, setSelectedConfig] = useState<ConfigDetail | null>(null)
  const [window, setWindow] = useState<'30d' | '60d' | '90d'>('30d')
  const [optimizing, setOptimizing] = useState(false)
  const [optimizeResult, setOptimizeResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      const [metricsRes, configsRes] = await Promise.all([
        fetch(`${API_URL}/api/journey/metrics`, { headers: authHeaders(token) }),
        fetch(`${API_URL}/api/journey/config`, { headers: authHeaders(token) }),
      ])
      if (metricsRes.status === 401 || configsRes.status === 401) { on401(); return }
      setMetrics(await metricsRes.json())
      setConfigs(await configsRes.json())
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
      <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
        Loading intelligence data…
      </div>
    )
  }

  return (
    <div style={{ padding: '24px 0', maxWidth: 900 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ color: 'white', fontSize: 20, fontWeight: 600, margin: 0 }}>Journey Intelligence</h2>
          {activeConfig && (
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: '4px 0 0' }}>
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
          style={{
            background: optimizing ? 'rgba(255,107,53,0.3)' : CORAL,
            color: 'white',
            border: 'none',
            borderRadius: 8,
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 600,
            cursor: optimizing ? 'default' : 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {optimizing ? 'Running…' : 'Run Optimizer'}
        </button>
      </div>

      {optimizeResult && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'rgba(255,107,53,0.12)',
            border: '1px solid rgba(255,107,53,0.3)',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 20,
            color: 'rgba(255,176,154,0.9)',
            fontSize: 13,
          }}
        >
          {optimizeResult}
        </motion.div>
      )}

      {/* Metrics strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Completion Rate', value: fmt(w?.completion_rate ?? null, '%') },
          { label: 'Avg Answer Depth', value: fmt(w?.avg_answer_words ?? null, ' words') },
          { label: 'Score Mean', value: fmt(w?.score_mean ?? null, '/100') },
          { label: 'Score Std Dev', value: fmt(w?.score_std ?? null, '') },
        ].map(({ label, value }) => (
          <div key={label} style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10,
            padding: '14px 16px',
          }}>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
            <p style={{ color: 'white', fontSize: 22, fontWeight: 700, margin: 0 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Window selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['30d', '60d', '90d'] as const).map((d) => (
          <button
            key={d}
            onClick={() => setWindow(d)}
            style={{
              background: window === d ? 'rgba(255,107,53,0.2)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${window === d ? 'rgba(255,107,53,0.5)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 6,
              padding: '4px 12px',
              color: window === d ? CORAL : 'rgba(255,255,255,0.5)',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Score distribution */}
      {w?.score_distribution && (
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10,
          padding: 16,
          marginBottom: 20,
        }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>Score Distribution</p>
          {Object.entries(w.score_distribution).map(([bucket, count]) => (
            <ScoreBar key={bucket} label={bucket} pct={count} />
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
            style={{
              background: 'rgba(255,107,53,0.06)',
              border: '1px solid rgba(255,107,53,0.25)',
              borderRadius: 12,
              padding: 20,
              marginBottom: 20,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <span style={{ background: 'rgba(255,107,53,0.2)', color: CORAL, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Awaiting Approval · High-Risk
                </span>
                <p style={{ color: 'white', fontSize: 16, fontWeight: 600, margin: '8px 0 4px' }}>
                  Config v{pendingConfig.version}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, margin: 0 }}>
                  {pendingConfig.change_summary}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => void loadConfigDetail(pendingConfig.id)}
                style={{ background: 'rgba(255,255,255,0.08)', color: 'white', border: 'none', borderRadius: 6, padding: '7px 14px', fontSize: 13, cursor: 'pointer' }}
              >
                Review Details
              </button>
              <button
                onClick={() => void handleActivate(pendingConfig.id)}
                style={{ background: CORAL, color: 'white', border: 'none', borderRadius: 6, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Activate
              </button>
              <button
                onClick={() => void handleDismiss(pendingConfig.id)}
                style={{ background: 'transparent', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '7px 14px', fontSize: 13, cursor: 'pointer' }}
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
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 100, padding: 20,
            }}
            onClick={() => setSelectedConfig(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#111', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 14, padding: 28, maxWidth: 700, width: '100%',
                maxHeight: '80vh', overflowY: 'auto',
              }}
            >
              <h3 style={{ color: 'white', fontSize: 18, margin: '0 0 4px' }}>Config v{selectedConfig.version}</h3>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: '0 0 20px' }}>{selectedConfig.change_summary}</p>

              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>Scoring Weights</p>
              <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                {Object.entries(selectedConfig.scoring_weights).map(([k, v]) => (
                  <span key={k} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 6, padding: '4px 10px', fontSize: 13, color: 'white' }}>
                    {k}: <strong>{v}</strong>
                  </span>
                ))}
              </div>

              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>Reasoning</p>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>{selectedConfig.reasoning}</p>

              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>System Prompt</p>
              <pre style={{
                background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 14,
                fontSize: 11, color: 'rgba(255,255,255,0.7)', overflowX: 'auto',
                whiteSpace: 'pre-wrap', marginBottom: 20,
              }}>{selectedConfig.system_prompt}</pre>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setSelectedConfig(null)} style={{ background: 'rgba(255,255,255,0.08)', color: 'white', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer' }}>Close</button>
                {selectedConfig.status === 'proposed' && (
                  <>
                    <button onClick={() => void handleActivate(selectedConfig.id)} style={{ background: CORAL, color: 'white', border: 'none', borderRadius: 6, padding: '8px 16px', fontWeight: 600, cursor: 'pointer' }}>Activate</button>
                    <button onClick={() => void handleDismiss(selectedConfig.id)} style={{ background: 'transparent', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '8px 16px', cursor: 'pointer' }}>Dismiss</button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Version history */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10,
        overflow: 'hidden',
      }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Version History</p>
        </div>
        {configs.length === 0 && (
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, padding: '16px', margin: 0 }}>No config versions yet.</p>
        )}
        {configs.map((c) => {
          const statusColor: Record<string, string> = {
            active: '#4ADE80', proposed: CORAL, archived: 'rgba(255,255,255,0.3)', dismissed: '#F87171',
          }
          return (
            <div
              key={c.id}
              onClick={() => void loadConfigDetail(c.id)}
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, minWidth: 40 }}>v{c.version}</span>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  background: `${statusColor[c.status]}20`,
                  color: statusColor[c.status],
                }}>
                  {c.status}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>{c.change_summary}</span>
              </div>
              <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>
                {new Date(c.created_at).toLocaleDateString()}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
