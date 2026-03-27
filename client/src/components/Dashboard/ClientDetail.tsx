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

  if (loading) return <p className="text-slate-400 font-body">Loading...</p>
  if (!client) return (
    <div>
      {error && (
        <div className="bg-red-900/30 border border-red-700/50 text-red-400 px-4 py-3 rounded-lg mb-6 font-body text-sm">
          {error}
        </div>
      )}
      <p className="text-slate-400 font-body">Client not found.</p>
    </div>
  )

  return (
    <div>
      <button onClick={onBack} className="text-orange-400 hover:text-orange-400 font-body text-sm mb-6 inline-block">
        &larr; Back to pipeline
      </button>

      <h2 className="text-2xl font-heading text-white mb-1">{client.founder_name}</h2>
      <p className="text-slate-400 font-body text-sm mb-6">{client.company_name} &middot; {client.stage}</p>

      {error && (
        <div className="bg-red-900/30 border border-red-700/50 text-red-400 px-4 py-3 rounded-lg mb-6 font-body text-sm">
          {error}
        </div>
      )}

      <div className="space-y-6">
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
