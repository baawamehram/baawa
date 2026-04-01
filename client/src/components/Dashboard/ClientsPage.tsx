import { useState, useEffect, useCallback } from 'react'
import { useDashboardTheme } from './ThemeContext'
import { API_URL, authFetch } from '../../lib/api'

interface Client {
  id: number
  founder_name: string
  company_name: string
  email: string
  stage: 'phase1' | 'phase2' | 'churned'
  created_at: string
  current_plan_status?: string
}

interface Props {
  token: string
  on401: () => void
  onSelectClient: (id: number) => void
}

export function ClientsPage({ token, on401, onSelectClient }: Props) {
  const { theme } = useDashboardTheme()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const fetchClients = useCallback(async () => {
    try {
      const res = await authFetch(`${API_URL}/api/clients`, token, on401)
      if (!res) return
      const data = await res.json()
      setClients(data)
    } catch {
      setError('Failed to load clients')
    } finally {
      setLoading(false)
    }
  }, [token, on401])

  useEffect(() => { fetchClients() }, [fetchClients])

  const filtered = clients.filter(c =>
    c.founder_name.toLowerCase().includes(search.toLowerCase()) ||
    c.company_name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <p style={{ color: theme.textMuted, fontFamily: "'Outfit', sans-serif" }}>Loading clients...</p>

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif" }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: theme.text, margin: '0 0 24px 0' }}>Clients</h2>

      {error && <div style={{ color: '#f87171', padding: '12px', marginBottom: '16px' }}>{error}</div>}

      <input
        type="text"
        placeholder="Search by name, company, or email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: '100%', maxWidth: '400px', padding: '10px 12px', marginBottom: '24px', background: theme.input, border: `1px solid ${theme.border}`, borderRadius: '6px', color: theme.text, fontFamily: "'Outfit', sans-serif" }}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {filtered.map((client) => (
          <div
            key={client.id}
            onClick={() => onSelectClient(client.id)}
            style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '20px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <p style={{ fontSize: '16px', fontWeight: 600, color: theme.text, margin: '0 0 4px 0' }}>{client.founder_name}</p>
            <p style={{ fontSize: '14px', color: theme.textMuted, margin: '0 0 12px 0' }}>{client.company_name}</p>
            <p style={{ fontSize: '12px', color: theme.textMuted, margin: '0 0 12px 0' }}>{client.email}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
              <span style={{ background: client.stage === 'phase1' ? 'rgba(52,211,153,0.2)' : 'rgba(59,130,246,0.2)', color: client.stage === 'phase1' ? '#10b981' : '#3b82f6', padding: '4px 8px', borderRadius: '4px' }}>
                {client.stage === 'phase1' ? 'Phase 1' : client.stage === 'phase2' ? 'Phase 2' : 'Churned'}
              </span>
              <span style={{ color: theme.textMuted }}>Plan: {client.current_plan_status || 'none'}</span>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: theme.textMuted }}>
          No clients found
        </div>
      )}
    </div>
  )
}
