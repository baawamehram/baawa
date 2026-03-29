import { useState, useEffect } from 'react'
import { API_URL, authFetch } from '../../lib/api'
import { useDashboardTheme } from './ThemeContext'

interface Assessment {
  id: number
  email: string
  score: number
  status: 'pending' | 'reviewing' | 'onboarded' | 'deferred'
  created_at: string
  problem_domains: Array<{ domain: string; subCategory: string }> | null
  founder_name?: string
  company_name?: string
}

interface Props {
  token: string
  on401: () => void
  onSelect: (id: number) => void
}

export function SubmissionList({ token, on401, onSelect }: Props) {
  const { theme, isDark } = useDashboardTheme()
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const STATUS_COLORS: Record<string, string> = {
    pending: theme.accent,
    reviewing: '#60a5fa',
    onboarded: '#4ade80',
    deferred: theme.textMuted,
  }

  useEffect(() => {
    const load = async () => {
      try {
        const res = await authFetch(`${API_URL}/api/assessments`, token, on401)
        if (!res) return
        if (!res.ok) {
          setError('Failed to load assessments.')
          return
        }
        const data = await res.json()
        setAssessments(data)
      } catch {
        setError('Network error. Please check your connection.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token, on401])

  const filtered = assessments
    .filter((a) => statusFilter === 'all' || a.status === statusFilter)
    .filter((a) => (a.email + (a.founder_name || '') + (a.company_name || '')).toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.score - a.score)

  if (loading) return <p style={{ color: theme.textMuted, fontFamily: "'Outfit', sans-serif" }}>Loading...</p>

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif" }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: theme.text, margin: '0 0 24px 0' }}>Assessments</h2>

      {error && (
        <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', padding: '12px 16px', borderRadius: '6px', marginBottom: '24px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or company..."
          style={{ background: theme.input, border: `1px solid ${theme.border}`, borderRadius: '6px', padding: '8px 16px', color: theme.text, fontSize: '14px', outline: 'none', flex: 1, maxWidth: '400px', fontFamily: "'Outfit', sans-serif" }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ background: theme.input, border: `1px solid ${theme.border}`, borderRadius: '6px', padding: '8px 16px', color: theme.text, fontSize: '14px', outline: 'none', fontFamily: "'Outfit', sans-serif" }}
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="reviewing">Reviewing</option>
          <option value="onboarded">Onboarded</option>
          <option value="deferred">Deferred</option>
        </select>
      </div>

      <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${theme.border}`, textAlign: 'left', background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
              <th style={{ padding: '12px 24px', color: theme.textMuted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Identity</th>
              <th style={{ padding: '12px 24px', color: theme.textMuted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Domain</th>
              <th style={{ padding: '12px 24px', color: theme.textMuted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Score</th>
              <th style={{ padding: '12px 24px', color: theme.textMuted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Status</th>
              <th style={{ padding: '12px 24px', color: theme.textMuted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr
                key={a.id}
                onClick={() => onSelect(a.id)}
                style={{ borderBottom: `1px solid ${theme.border}`, cursor: 'pointer', transition: 'background 0.2s' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
              >
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ color: theme.text, fontSize: '14px', fontWeight: 600 }}>{a.founder_name || a.email}</div>
                    {assessments.filter(x => x.email === a.email).length > 1 && (
                      <span style={{ fontSize: '9px', padding: '2px 5px', borderRadius: 4, background: isDark ? 'rgba(96,165,250,0.15)' : 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Returning</span>
                    )}
                  </div>
                  <div style={{ color: theme.textMuted, fontSize: '12px' }}>{a.company_name || a.email}</div>
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {(a.problem_domains ?? []).map(d => (
                      <span key={d.domain} style={{ fontSize: '10px', padding: '2px 6px', borderRadius: 4, background: isDark ? 'rgba(52,211,153,0.12)' : 'rgba(52,211,153,0.08)', color: theme.accentMid, border: `1px solid ${isDark ? 'rgba(52,211,153,0.3)' : 'rgba(52,211,153,0.2)'}`, fontWeight: 600, whiteSpace: 'nowrap' }}>{d.domain}</span>
                    ))}
                    {!a.problem_domains?.length && <span style={{ fontSize: '11px', color: theme.textMuted }}>—</span>}
                  </div>
                </td>
                <td style={{ padding: '16px 24px', color: theme.text, fontSize: '14px', fontWeight: 600 }}>{a.score}</td>
                <td style={{ padding: '16px 24px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 500, color: STATUS_COLORS[a.status] || theme.textMuted }}>{a.status}</span>
                </td>
                <td style={{ padding: '16px 24px', color: theme.textMuted, fontSize: '14px' }}>
                  {new Date(a.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '32px 24px', textAlign: 'center', color: theme.textMuted, fontSize: '14px' }}>
                  No assessments found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
