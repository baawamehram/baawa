import { useState, useEffect } from 'react'
import { API_URL, authFetch } from '../../lib/api'
import { useDashboardTheme } from './ThemeContext'

interface Client {
  id: number
  founder_name: string
  company_name: string
  stage: 'phase1' | 'phase2' | 'churned'
  phase1_fee: number
  phase2_monthly_fee: number
}

interface Props {
  token: string
  on401: () => void
}

export function RevenueOverview({ token, on401 }: Props) {
  const { theme } = useDashboardTheme()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await authFetch(`${API_URL}/api/clients`, token, on401)
        if (!res) return
        if (!res.ok) {
          setError('Failed to load revenue data.')
          return
        }
        const data = await res.json()
        setClients(data)
      } catch {
        setError('Network error. Please check your connection.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token, on401])

  if (loading) return <p style={{ color: theme.textMuted, fontFamily: "'Outfit', sans-serif" }}>Loading...</p>

  const totalPhase1 = clients.reduce((sum, c) => sum + (c.phase1_fee || 0), 0)
  const activeMRR = clients
    .filter((c) => c.stage === 'phase2')
    .reduce((sum, c) => sum + (c.phase2_monthly_fee || 0), 0)
  const pipelineValue = clients
    .filter((c) => c.stage === 'phase1')
    .reduce((sum, c) => sum + (c.phase1_fee || 0), 0)

  const fmt = (n: number) => `$${n.toLocaleString()}`

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif" }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: theme.text, margin: '0 0 24px 0' }}>Revenue</h2>

      {error && (
        <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', padding: '12px 16px', borderRadius: '6px', marginBottom: '24px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
        <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '24px' }}>
          <p style={{ color: theme.textMuted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>Total Phase 1 Revenue</p>
          <p style={{ fontSize: '28px', fontWeight: 700, color: theme.text, margin: 0 }}>{fmt(totalPhase1)}</p>
        </div>
        <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '24px' }}>
          <p style={{ color: theme.textMuted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>Active MRR</p>
          <p style={{ fontSize: '28px', fontWeight: 700, color: theme.text, margin: 0 }}>{fmt(activeMRR)}</p>
        </div>
        <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '24px' }}>
          <p style={{ color: theme.textMuted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>Pipeline Value</p>
          <p style={{ fontSize: '28px', fontWeight: 700, color: theme.text, margin: 0 }}>{fmt(pipelineValue)}</p>
        </div>
      </div>

      <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${theme.border}`, textAlign: 'left', background: 'rgba(0,0,0,0.02)' }}>
              <th style={{ padding: '12px 24px', color: theme.textMuted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>Client</th>
              <th style={{ padding: '12px 24px', color: theme.textMuted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>Stage</th>
              <th style={{ padding: '12px 24px', color: theme.textMuted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>Phase 1 Fee</th>
              <th style={{ padding: '12px 24px', color: theme.textMuted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>Monthly Fee</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                <td style={{ padding: '16px 24px' }}>
                  <p style={{ color: theme.text, fontSize: '14px', margin: '0 0 2px 0' }}>{c.founder_name}</p>
                  <p style={{ color: theme.textMuted, fontSize: '12px', margin: 0 }}>{c.company_name}</p>
                </td>
                <td style={{ padding: '16px 24px', color: theme.textMuted, fontSize: '14px' }}>{c.stage}</td>
                <td style={{ padding: '16px 24px', color: theme.text, fontSize: '14px' }}>{fmt(c.phase1_fee || 0)}</td>
                <td style={{ padding: '16px 24px', color: theme.text, fontSize: '14px' }}>{fmt(c.phase2_monthly_fee || 0)}</td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: '32px 24px', textAlign: 'center', color: theme.textMuted, fontSize: '14px' }}>
                  No clients yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
