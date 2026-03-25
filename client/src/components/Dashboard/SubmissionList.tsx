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
  pending: 'bg-yellow-500/20 text-yellow-400',
  reviewing: 'bg-blue-500/20 text-blue-400',
  onboarded: 'bg-green-500/20 text-green-400',
  deferred: 'bg-gray-500/20 text-gray-400',
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

  if (loading) return <p className="text-gray-400 font-body">Loading...</p>

  return (
    <div>
      <h2 className="text-2xl font-heading text-white mb-6">Assessments</h2>

      {error && (
        <div className="bg-red-900/30 border border-red-700/50 text-red-400 px-4 py-3 rounded-lg mb-6 font-body text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-4 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email..."
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white font-body text-sm focus:outline-none focus:border-brand-indigo flex-1 max-w-xs"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white font-body text-sm focus:outline-none focus:border-brand-indigo"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="reviewing">Reviewing</option>
          <option value="onboarded">Onboarded</option>
          <option value="deferred">Deferred</option>
        </select>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800 text-left">
              <th className="px-6 py-3 text-gray-400 font-body text-xs uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-gray-400 font-body text-xs uppercase tracking-wider">Score</th>
              <th className="px-6 py-3 text-gray-400 font-body text-xs uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-gray-400 font-body text-xs uppercase tracking-wider">Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr
                key={a.id}
                onClick={() => onSelect(a.id)}
                className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer transition-colors"
              >
                <td className="px-6 py-4 text-white font-body text-sm">{a.email}</td>
                <td className="px-6 py-4 text-white font-heading text-sm">{a.score}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-body ${STATUS_COLORS[a.status] || ''}`}>
                    {a.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-400 font-body text-sm">
                  {new Date(a.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500 font-body text-sm">
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
