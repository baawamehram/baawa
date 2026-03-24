import { useState, useEffect, useCallback } from 'react'
import { ClientProfile } from './ClientProfile'
import { DeliverablesTracker } from './DeliverablesTracker'
import { ClientNotes } from './ClientNotes'
import { ActivityFeed } from './ActivityFeed'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

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

  const fetchClient = useCallback(() => {
    fetch(`${API_URL}/api/clients/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.status === 401) { on401(); return null }
        return res.json()
      })
      .then((data) => {
        if (data) setClient(data)
      })
      .finally(() => setLoading(false))
  }, [id, token, on401])

  useEffect(() => { fetchClient() }, [fetchClient])

  if (loading) return <p className="text-gray-400 font-body">Loading...</p>
  if (!client) return <p className="text-gray-400 font-body">Client not found.</p>

  return (
    <div>
      <button onClick={onBack} className="text-brand-indigo hover:text-brand-violet font-body text-sm mb-6 inline-block">
        &larr; Back to pipeline
      </button>

      <h2 className="text-2xl font-heading text-white mb-1">{client.founder_name}</h2>
      <p className="text-gray-400 font-body text-sm mb-6">{client.company_name} &middot; {client.stage}</p>

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
