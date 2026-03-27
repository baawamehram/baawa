import { useState, useEffect, useCallback } from 'react'
import { API_URL, authFetch } from '../../lib/api'

interface Client {
  id: number
  founder_name: string
  company_name: string
  email: string
  stage: 'phase1' | 'phase2' | 'churned'
  phase1_fee: number
  phase2_monthly_fee: number
  start_date: string
  score: number
}

interface Props {
  token: string
  on401: () => void
  onSelectClient: (id: number) => void
}

const STAGES: { key: Client['stage']; label: string }[] = [
  { key: 'phase1', label: 'Phase 1' },
  { key: 'phase2', label: 'Phase 2' },
  { key: 'churned', label: 'Churned' },
]

export function Pipeline({ token, on401, onSelectClient }: Props) {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchClients = useCallback(async () => {
    try {
      const res = await authFetch(`${API_URL}/api/clients`, token, on401)
      if (!res) return
      if (!res.ok) {
        setError('Failed to load clients.')
        return
      }
      const data = await res.json()
      setClients(data)
    } catch {
      setError('Network error. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }, [token, on401])

  useEffect(() => { fetchClients() }, [fetchClients])

  const moveClient = async (clientId: number, newStage: Client['stage']) => {
    setError('')
    try {
      const res = await authFetch(`${API_URL}/api/clients/${clientId}`, token, on401, {
        method: 'PUT',
        body: JSON.stringify({ stage: newStage }),
      })
      if (!res) return
      if (!res.ok) {
        setError('Something went wrong. Please try again.')
        return
      }
      fetchClients()
    } catch {
      setError('Network error. Please check your connection.')
    }
  }

  const daysSince = (dateStr: string) => {
    const start = new Date(dateStr)
    const now = new Date()
    return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  }

  if (loading) return <p className="text-gray-400 font-body">Loading...</p>

  return (
    <div>
      <h2 className="text-2xl font-heading text-white mb-6">Pipeline</h2>

      {error && (
        <div className="bg-red-900/30 border border-red-700/50 text-red-400 px-4 py-3 rounded-lg mb-6 font-body text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {STAGES.map((stage) => {
          const stageClients = clients.filter((c) => c.stage === stage.key)
          return (
            <div key={stage.key} className="bg-surface/50 border border-border-subtle rounded-xl p-4">
              <h3 className="text-sm font-heading text-brand-indigo mb-4 uppercase tracking-wider">
                {stage.label} <span className="text-gray-400">({stageClients.length})</span>
              </h3>
              <div className="space-y-3">
                {stageClients.map((client) => (
                  <div
                    key={client.id}
                    className="bg-surface-2 border border-border-subtle/50 rounded-lg p-4 hover:border-brand-indigo/30 transition-colors"
                  >
                    <div
                      className="cursor-pointer"
                      onClick={() => onSelectClient(client.id)}
                    >
                      <p className="text-white font-heading text-sm">{client.founder_name}</p>
                      <p className="text-gray-400 font-body text-xs mt-0.5">{client.company_name}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs font-body text-gray-400">
                        <span>Score: {client.score ?? 'N/A'}</span>
                        <span>{daysSince(client.start_date)}d</span>
                        {client.phase2_monthly_fee > 0 && <span>${client.phase2_monthly_fee}/mo</span>}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      {STAGES.filter((s) => s.key !== client.stage).map((s) => (
                        <button
                          key={s.key}
                          onClick={() => moveClient(client.id, s.key)}
                          className="text-xs font-body px-2.5 py-1 rounded bg-surface-2 hover:bg-brand-indigo/30 text-gray-300 hover:text-white transition-colors"
                        >
                          → {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {stageClients.length === 0 && (
                  <p className="text-gray-500 font-body text-xs text-center py-4">No clients</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
