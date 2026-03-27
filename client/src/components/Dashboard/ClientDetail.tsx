import { useState, useEffect, useCallback } from 'react'
import { ClientProfile } from './ClientProfile'
import { DeliverablesTracker } from './DeliverablesTracker'
import { ClientNotes } from './ClientNotes'
import { ActivityFeed } from './ActivityFeed'
import { API_URL, authFetch } from '../../lib/api'

interface ClientFull {
  id: number
  assessment_id: number
  founder_name: string
  company_name: string
  email: string
  phone: string
  website: string
  stage: 'phase1' | 'phase2' | 'churned'
  phase1_fee: number
  phase2_monthly_fee: number
  phase2_revenue_pct: number
  start_date: string
  created_at: string
  score: number
  deliverables: Array<{ id: number; title: string; description: string; status: 'pending' | 'in_progress' | 'completed'; due_date: string; completed_at: string | null }>
  notes: Array<{ id: number; content: string; created_at: string }>
  activities: Array<{ id: number; type: string; description: string; created_at: string }>
}

interface Props {
  id: number
  token: string
  on401: () => void
  onBack: () => void
}

export function ClientDetail({ id, token, on401, onBack }: Props) {
  const [client, setClient] = useState<ClientFull | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchClient = useCallback(async () => {
    try {
      const res = await authFetch(`${API_URL}/api/clients/${id}`, token, on401)
      if (!res) return
      if (!res.ok) {
        setError('Failed to load client.')
        return
      }
      const data = await res.json()
      setClient(data)
    } catch {
      setError('Network error. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }, [id, token, on401])

  useEffect(() => { fetchClient() }, [fetchClient])

  if (loading) return <p style={{ color: '#aaaaaa', fontFamily: "'Outfit', sans-serif" }}>Loading...</p>
  if (!client) return (
    <div style={{ fontFamily: "'Outfit', sans-serif" }}>
      {error && (
        <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', padding: '12px 16px', borderRadius: '6px', marginBottom: '24px', fontSize: '14px' }}>
          {error}
        </div>
      )}
      <p style={{ color: '#aaaaaa' }}>Client not found.</p>
    </div>
  )

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif" }}>
      <button onClick={onBack} style={{ color: '#aaaaaa', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', marginBottom: '24px', display: 'inline-block', padding: 0 }}>
        &larr; Back to pipeline
      </button>

      <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#ffffff', margin: '0 0 4px 0' }}>{client.founder_name}</h2>
      <p style={{ color: '#aaaaaa', fontSize: '14px', margin: '0 0 24px 0' }}>{client.company_name} &middot; {client.stage}</p>

      {error && (
        <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', padding: '12px 16px', borderRadius: '6px', marginBottom: '24px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <ClientProfile client={client} token={token} on401={on401} onUpdate={fetchClient} />
        <DeliverablesTracker
          clientId={client.id}
          deliverables={client.deliverables || []}
          token={token}
          on401={on401}
          onUpdate={fetchClient}
        />
        <ClientNotes
          clientId={client.id}
          notes={client.notes || []}
          token={token}
          on401={on401}
          onUpdate={fetchClient}
        />
        <ActivityFeed activities={client.activities || []} />
      </div>
    </div>
  )
}
