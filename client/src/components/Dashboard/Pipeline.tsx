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

  if (loading) return <p style={{ color: '#aaaaaa', fontFamily: "'Outfit', sans-serif" }}>Loading...</p>

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif" }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#ffffff', margin: '0 0 24px 0' }}>Pipeline</h2>

      {error && (
        <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', padding: '12px 16px', borderRadius: '6px', marginBottom: '24px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {STAGES.map((stage) => {
          const stageClients = clients.filter((c) => c.stage === stage.key)
          return (
            <div key={stage.key} style={{ background: '#111111', border: '1px solid #333333', borderRadius: '8px', padding: '16px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {stage.label} <span style={{ color: '#666666' }}>({stageClients.length})</span>
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {stageClients.map((client) => (
                  <div
                    key={client.id}
                    style={{ background: '#1a1a1a', border: '1px solid #333333', borderRadius: '6px', padding: '16px' }}
                  >
                    <div
                      style={{ cursor: 'pointer' }}
                      onClick={() => onSelectClient(client.id)}
                    >
                      <p style={{ color: '#ffffff', fontSize: '14px', fontWeight: 600, margin: '0 0 2px 0' }}>{client.founder_name}</p>
                      <p style={{ color: '#aaaaaa', fontSize: '12px', margin: '0 0 8px 0' }}>{client.company_name}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#666666' }}>
                        <span>Score: {client.score ?? 'N/A'}</span>
                        <span>{daysSince(client.start_date)}d</span>
                        {client.phase2_monthly_fee > 0 && <span>${client.phase2_monthly_fee}/mo</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      {STAGES.filter((s) => s.key !== client.stage).map((s) => (
                        <button
                          key={s.key}
                          onClick={() => moveClient(client.id, s.key)}
                          style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '4px', background: '#333333', color: '#ffffff', border: 'none', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}
                        >
                          → {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {stageClients.length === 0 && (
                  <p style={{ color: '#666666', fontSize: '12px', textAlign: 'center', padding: '16px 0', margin: 0 }}>No clients</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
