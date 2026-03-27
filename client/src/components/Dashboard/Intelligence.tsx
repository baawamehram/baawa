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

const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` })

function fmt(n: number | null, suffix = '') {
  return n === null ? '—' : `${n}${suffix}`
}

function ScoreBar({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="mb-1.5">
      <div className="flex justify-between mb-0.5">
        <span className="text-[11px] text-slate-500">{label}</span>
        <span className="text-[11px] text-slate-500">{pct}</span>
      </div>
      <div className="h-1 bg-slate-700 rounded-sm">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(pct * 2, 100)}%` }}
          transition={{ duration: 0.6 }}
          className="h-full bg-orange-500 rounded-sm"
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
      <div className="py-8 text-center text-slate-500">
        Loading intelligence data…
      </div>
    )
  }

  return (
    <div className="py-6 max-w-[900px]">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-white text-xl font-semibold">Journey Intelligence</h2>
          {activeConfig && (
            <p className="text-slate-500 text-xs mt-1">
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
          className={`${optimizing ? 'bg-orange-500/30' : 'bg-orange-500'} text-white border-0 rounded-lg px-4 py-2 text-[13px] font-semibold cursor-pointer transition-colors disabled:cursor-default`}
        >
          {optimizing ? 'Running…' : 'Run Optimizer'}
        </button>
      </div>

      {optimizeResult && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-orange-500/10 border border-orange-500/20 rounded-lg px-3.5 py-2.5 mb-5 text-orange-300 text-[13px]"
        >
          {optimizeResult}
        </motion.div>
      )}

      {/* Metrics strip */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Completion Rate', value: fmt(w?.completion_rate ?? null, '%') },
          { label: 'Avg Answer Depth', value: fmt(w?.avg_answer_words ?? null, ' words') },
          { label: 'Score Mean', value: fmt(w?.score_mean ?? null, '/100') },
          { label: 'Score Std Dev', value: fmt(w?.score_std ?? null, '') },
        ].map(({ label, value }) => (
          <div key={label} className="bg-slate-900 border border-slate-700 rounded-[10px] px-4 py-3.5">
            <p className="text-slate-500 text-[11px] mb-1.5 uppercase tracking-[0.06em]">{label}</p>
            <p className="text-white text-[22px] font-bold">{value}</p>
          </div>
        ))}
      </div>

      {/* Window selector */}
      <div className="flex gap-2 mb-5">
        {(['30d', '60d', '90d'] as const).map((d) => (
          <button
            key={d}
            onClick={() => setWindow(d)}
            className={`${
              window === d
                ? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
                : 'bg-white/5 border-white/10 text-slate-500'
            } border rounded-md px-3 py-1 text-xs cursor-pointer transition-colors`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Score distribution */}
      {w?.score_distribution && (
        <div className="bg-slate-900 border border-slate-700 rounded-[10px] p-4 mb-5">
          <p className="text-slate-500 text-xs uppercase tracking-[0.06em] mb-3">Score Distribution</p>
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
            className="bg-orange-500/[0.06] border border-orange-500/25 rounded-xl p-5 mb-5"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="bg-orange-500/20 text-orange-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-[0.08em]">
                  Awaiting Approval · High-Risk
                </span>
                <p className="text-white text-base font-semibold mt-2 mb-1">
                  Config v{pendingConfig.version}
                </p>
                <p className="text-slate-400 text-sm">
                  {pendingConfig.change_summary}
                </p>
              </div>
            </div>
            <div className="flex gap-2.5">
              <button
                onClick={() => void loadConfigDetail(pendingConfig.id)}
                className="bg-white/[0.08] text-white border-0 rounded-md px-3.5 py-[7px] text-[13px] cursor-pointer transition-colors hover:bg-white/10"
              >
                Review Details
              </button>
              <button
                onClick={() => void handleActivate(pendingConfig.id)}
                className="bg-orange-500 text-white border-0 rounded-md px-3.5 py-[7px] text-[13px] font-semibold cursor-pointer transition-colors hover:bg-orange-600"
              >
                Activate
              </button>
              <button
                onClick={() => void handleDismiss(pendingConfig.id)}
                className="bg-transparent text-slate-500 border border-white/15 rounded-md px-3.5 py-[7px] text-[13px] cursor-pointer transition-colors hover:text-slate-300"
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
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-5"
            onClick={() => setSelectedConfig(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-700 rounded-[14px] p-7 max-w-[700px] w-full max-h-[80vh] overflow-y-auto"
            >
              <h3 className="text-white text-lg mb-1">Config v{selectedConfig.version}</h3>
              <p className="text-slate-500 text-[13px] mb-5">{selectedConfig.change_summary}</p>

              <p className="text-slate-500 text-[11px] uppercase tracking-[0.06em] mb-2">Scoring Weights</p>
              <div className="flex gap-2.5 mb-5 flex-wrap">
                {Object.entries(selectedConfig.scoring_weights).map(([k, v]) => (
                  <span key={k} className="bg-white/[0.07] rounded-md px-2.5 py-1 text-[13px] text-white">
                    {k}: <strong>{v}</strong>
                  </span>
                ))}
              </div>

              <p className="text-slate-500 text-[11px] uppercase tracking-[0.06em] mb-2">Reasoning</p>
              <p className="text-slate-300 text-[13px] leading-relaxed mb-5">{selectedConfig.reasoning}</p>

              <p className="text-slate-500 text-[11px] uppercase tracking-[0.06em] mb-2">System Prompt</p>
              <pre className="bg-slate-900 border border-slate-700 rounded-lg p-3.5 text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap mb-5">
                {selectedConfig.system_prompt}
              </pre>

              <div className="flex gap-2.5 justify-end">
                <button
                  onClick={() => setSelectedConfig(null)}
                  className="bg-white/[0.08] text-white border-0 rounded-md px-4 py-2 cursor-pointer hover:bg-white/10 transition-colors"
                >
                  Close
                </button>
                {selectedConfig.status === 'proposed' && (
                  <>
                    <button
                      onClick={() => void handleActivate(selectedConfig.id)}
                      className="bg-orange-500 text-white border-0 rounded-md px-4 py-2 font-semibold cursor-pointer hover:bg-orange-600 transition-colors"
                    >
                      Activate
                    </button>
                    <button
                      onClick={() => void handleDismiss(selectedConfig.id)}
                      className="bg-transparent text-slate-500 border border-white/15 rounded-md px-4 py-2 cursor-pointer hover:text-slate-300 transition-colors"
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
      <div className="bg-slate-900 border border-slate-700 rounded-[10px] overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700">
          <p className="text-slate-500 text-xs uppercase tracking-[0.06em]">Version History</p>
        </div>
        {configs.length === 0 && (
          <p className="text-slate-500/60 text-[13px] px-4 py-4">No config versions yet.</p>
        )}
        {configs.map((c) => {
          const statusColor: Record<string, string> = {
            active: '#4ADE80',
            proposed: '#FF6B35',
            archived: 'rgba(255,255,255,0.3)',
            dismissed: '#F87171',
          }
          return (
            <div
              key={c.id}
              onClick={() => void loadConfigDetail(c.id)}
              className="px-4 py-3 border-b border-slate-700/50 cursor-pointer flex items-center justify-between transition-colors hover:bg-white/[0.03]"
            >
              <div className="flex items-center gap-3">
                <span className="text-slate-500/60 text-xs min-w-[40px]">v{c.version}</span>
                <span
                  className="text-[10px] font-bold px-[7px] py-0.5 rounded uppercase tracking-[0.06em]"
                  style={{
                    background: `${statusColor[c.status]}20`,
                    color: statusColor[c.status],
                  }}
                >
                  {c.status}
                </span>
                <span className="text-slate-400 text-[13px]">{c.change_summary}</span>
              </div>
              <span className="text-slate-500/40 text-[11px]">
                {new Date(c.created_at).toLocaleDateString()}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
