import { useState, useEffect } from 'react'
import { API_URL, authFetch } from '../../lib/api'

interface Assessment {
  id: number
  email: string
  score: number
  status: 'pending' | 'reviewing' | 'onboarded' | 'deferred'
  created_at: string
}

interface Props {
  token: string
  on401: () => void
  onSelect: (id: number) => void
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#facc15',
  reviewing: '#60a5fa',
  onboarded: '#4ade80',
  deferred: '#aaaaaa',
}

export function SubmissionList({ token, on401, onSelect }: Props) {
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

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
    .filter((a) => a.email.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.score - a.score)

  if (loading) return <p style={{ color: '#aaaaaa', fontFamily: "'Outfit', sans-serif" }}>Loading...</p>

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif" }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#ffffff', margin: '0 0 24px 0' }}>Assessments</h2>

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
          placeholder="Search by email..."
          style={{ background: '#1a1a1a', border: '1px solid #333333', borderRadius: '6px', padding: '8px 16px', color: '#ffffff', fontSize: '14px', outline: 'none', flex: 1, maxWidth: '300px', fontFamily: "'Outfit', sans-serif" }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ background: '#1a1a1a', border: '1px solid #333333', borderRadius: '6px', padding: '8px 16px', color: '#ffffff', fontSize: '14px', outline: 'none', fontFamily: "'Outfit', sans-serif" }}
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="reviewing">Reviewing</option>
          <option value="onboarded">Onboarded</option>
          <option value="deferred">Deferred</option>
        </select>
      </div>

      <div style={{ background: '#111111', border: '1px solid #333333', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #333333', textAlign: 'left' }}>
              <th style={{ padding: '12px 24px', color: '#aaaaaa', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>Name</th>
              <th style={{ padding: '12px 24px', color: '#aaaaaa', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>Score</th>
              <th style={{ padding: '12px 24px', color: '#aaaaaa', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>Status</th>
              <th style={{ padding: '12px 24px', color: '#aaaaaa', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr
                key={a.id}
                onClick={() => onSelect(a.id)}
                style={{ borderBottom: '1px solid #222222', cursor: 'pointer' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = '#1a1a1a' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
              >
                <td style={{ padding: '16px 24px', color: '#ffffff', fontSize: '14px' }}>{a.email}</td>
                <td style={{ padding: '16px 24px', color: '#ffffff', fontSize: '14px', fontWeight: 600 }}>{a.score}</td>
                <td style={{ padding: '16px 24px' }}>
                  <span style={{ fontSize: '12px', color: STATUS_COLORS[a.status] || '#aaaaaa' }}>
                    {a.status}
                  </span>
                </td>
                <td style={{ padding: '16px 24px', color: '#aaaaaa', fontSize: '14px' }}>
                  {new Date(a.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: '32px 24px', textAlign: 'center', color: '#aaaaaa', fontSize: '14px' }}>
                  No assessments found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
