import { useState, useEffect, useCallback } from 'react'
import { API_URL, authFetch } from '../../lib/api'
import { useDashboardTheme } from './ThemeContext'

interface Lead {
  id: number
  email: string
  score: number
  status: 'pending' | 'reviewing'
  founder_archetype?: string
  created_at: string
  founder_name?: string
  company_name?: string
}

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
  onViewAssessment: (id: number) => void
}

const STAGES: { key: string; label: string }[] = [
  { key: 'leads', label: 'Leads' },
  { key: 'phase1', label: 'Phase 1' },
  { key: 'phase2', label: 'Phase 2' },
  { key: 'churned', label: 'Churned' },
]

export function Pipeline({ token, on401, onSelectClient, onViewAssessment }: Props) {
  const { theme } = useDashboardTheme()
  const [clients, setClients] = useState<Client[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchData = useCallback(async () => {
    try {
      const [clientsRes, assessmentsRes] = await Promise.all([
        authFetch(`${API_URL}/api/clients`, token, on401),
        authFetch(`${API_URL}/api/assessments`, token, on401)
      ])
      
      if (!clientsRes || !assessmentsRes) return
      
      const [clientsData, assessmentsData] = await Promise.all([
        clientsRes.json(),
        assessmentsRes.json()
      ])
      
      setClients(clientsData)
      setLeads(assessmentsData.filter((a: any) => ['pending', 'reviewing'].includes(a.status)))
    } catch {
      setError('Network error. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }, [token, on401])

  useEffect(() => { fetchData() }, [fetchData])

  const onboardLead = async (assessmentId: number) => {
    setError('')
    try {
      const res = await authFetch(`${API_URL}/api/assessments/${assessmentId}/onboard`, token, on401, {
        method: 'POST'
      })
      if (res?.ok) await fetchData()
      else setError('Failed to onboard lead.')
    } catch {
      setError('Failed to onboard lead.')
    }
  }

  const moveClient = async (clientId: number, newStage: Client['stage']) => {
    setError('')
    try {
      const res = await authFetch(`${API_URL}/api/clients/${clientId}`, token, on401, {
        method: 'PUT',
        body: JSON.stringify({ stage: newStage }),
      })
      if (res?.ok) await fetchData()
      else setError('Something went wrong. Please try again.')
    } catch {
      setError('Network error. Please check your connection.')
    }
  }

  const daysSince = (dateStr: string) => {
    const start = new Date(dateStr)
    const now = new Date()
    return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  }

  if (loading) return <p style={{ color: theme.textMuted, fontFamily: "'Outfit', sans-serif" }}>Loading...</p>

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif" }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: theme.text, margin: '0 0 24px 0' }}>Pipeline</h2>

      {error && (
        <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', padding: '12px 16px', borderRadius: '6px', marginBottom: '24px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {STAGES.map((stage) => {
          const isLeads = stage.key === 'leads'
          const stageItems = isLeads ? leads : clients.filter((c) => c.stage === stage.key)
          
          return (
            <div key={stage.key} style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '16px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: 600, color: isLeads ? theme.accent : theme.text, margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {stage.label} <span style={{ color: theme.textMuted }}>({stageItems.length})</span>
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {stageItems.map((item: any) => (
                  <div
                    key={item.id}
                    style={{ background: theme.input, border: `1px solid ${theme.border}`, borderRadius: '6px', padding: '16px' }}
                  >
                    <div
                      style={{ cursor: 'pointer' }}
                      onClick={() => isLeads ? onViewAssessment(item.id) : onSelectClient(item.id)}
                    >
                      <p style={{ color: theme.text, fontSize: '14px', fontWeight: 600, margin: '0 0 2px 0' }}>
                        {isLeads ? (item.founder_name || item.email) : item.founder_name}
                      </p>
                      <p style={{ color: theme.textMuted, fontSize: '12px', margin: '0 0 8px 0' }}>
                        {isLeads ? (item.company_name || item.score_summary || 'Submission under review') : item.company_name}
                      </p>
                      
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', fontSize: '12px', color: theme.textMuted }}>
                        <span style={{ color: item.score > 70 ? '#4ade80' : theme.textMuted }}>Score: {item.score ?? 'N/A'}</span>
                        <span>{daysSince(item.created_at || item.start_date)}d</span>
                        {item.founder_archetype && (
                          <span style={{ color: theme.accent, border: `1px solid ${theme.accent}`, padding: '1px 6px', borderRadius: '10px', fontSize: '10px' }}>
                            {item.founder_archetype}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      {isLeads ? (
                        <button
                          onClick={() => onboardLead(item.id)}
                          style={{ width: '100%', fontSize: '12px', padding: '6px 10px', borderRadius: '4px', background: theme.accent, color: '#ffffff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                        >
                          Onboard Client
                        </button>
                      ) : (
                        STAGES.filter((s) => s.key !== 'leads' && s.key !== item.stage).map((s) => (
                          <button
                            key={s.key}
                            onClick={() => moveClient(item.id, s.key as any)}
                            style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '4px', background: theme.border, color: theme.text, border: 'none', cursor: 'pointer' }}
                          >
                            → {s.label}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                ))}
                
                {stageItems.length === 0 && (
                  <p style={{ color: theme.textMuted, fontSize: '12px', textAlign: 'center', padding: '16px 0', margin: 0 }}>Empty</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
