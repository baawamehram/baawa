import { useState, useEffect } from 'react'
import { API_URL, authFetch } from '../../lib/api'

interface Assessment {
  id: number
  email: string
  score: number
  status: 'pending' | 'reviewing' | 'onboarded' | 'deferred'
  score_breakdown: { pmf: number; validation: number; growth: number; mindset: number; revenue: number }
  score_summary: string
  biggest_opportunity: string
  biggest_risk: string
  founder_notes: string
  conversation: Array<{ role: 'user' | 'assistant'; content: string }>
  created_at: string
}

interface Props {
  id: number
  token: string
  on401: () => void
  onBack: () => void
}

const DIMENSION_LABELS: Record<string, string> = {
  pmf: 'Product-Market Fit',
  validation: 'Validation',
  growth: 'Growth',
  mindset: 'Mindset',
  revenue: 'Revenue',
}

export function SubmissionDetail({ id, token, on401, onBack }: Props) {
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [actionMsg, setActionMsg] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await authFetch(`${API_URL}/api/assessments/${id}`, token, on401)
        if (!res) return
        if (!res.ok) {
          setError('Failed to load assessment.')
          return
        }
        const data = await res.json()
        setAssessment(data)
        setNotes(data.founder_notes || '')
      } catch {
        setError('Network error. Please check your connection.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, token, on401])

  const saveNotes = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await authFetch(`${API_URL}/api/assessments/${id}/notes`, token, on401, {
        method: 'PUT',
        body: JSON.stringify({ notes }),
      })
      if (!res) return
      if (!res.ok) {
        setError('Something went wrong. Please try again.')
      }
    } catch {
      setError('Network error. Please check your connection.')
    } finally {
      setSaving(false)
    }
  }

  const handleAction = async (action: 'onboard' | 'defer') => {
    if (action === 'defer' && !window.confirm('Send defer email to this founder? This cannot be undone.')) return
    setError('')
    try {
      const res = await authFetch(`${API_URL}/api/assessments/${id}/${action}`, token, on401, {
        method: 'POST',
      })
      if (!res) return
      if (!res.ok) {
        setError('Something went wrong. Please try again.')
        return
      }
      setActionMsg(action === 'onboard' ? 'Client onboarded successfully!' : 'Assessment deferred. Email sent.')
      // refresh
      try {
        const updated = await authFetch(`${API_URL}/api/assessments/${id}`, token, on401)
        if (updated?.ok) {
          const data = await updated.json()
          setAssessment(data)
        }
      } catch {
        // Refresh failed but action succeeded — not critical
      }
    } catch {
      setError('Network error. Please check your connection.')
    }
  }

  if (loading) return <p className="text-gray-400 font-body">Loading...</p>
  if (!assessment) return <p className="text-gray-400 font-body">Assessment not found.</p>

  const breakdown = assessment.score_breakdown || {}

  return (
    <div>
      <button onClick={onBack} className="text-brand-indigo hover:text-brand-violet font-body text-sm mb-6 inline-block">
        &larr; Back to list
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-heading text-white">{assessment.email}</h2>
          <p className="text-gray-400 font-body text-sm mt-1">
            Score: <span className="text-white font-heading">{assessment.score}</span> &middot; Status:{' '}
            <span className="text-brand-indigo">{assessment.status}</span>
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => handleAction('onboard')}
            className="bg-green-600 hover:bg-green-500 text-white font-heading text-sm px-4 py-2 rounded-lg transition-colors"
          >
            Onboard
          </button>
          <button
            onClick={() => handleAction('defer')}
            className="bg-gray-700 hover:bg-gray-600 text-white font-heading text-sm px-4 py-2 rounded-lg transition-colors"
          >
            Defer
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className="bg-green-900/30 border border-green-700/50 text-green-400 px-4 py-3 rounded-lg mb-6 font-body text-sm">
          {actionMsg}
        </div>
      )}

      {error && (
        <div className="bg-red-900/30 border border-red-700/50 text-red-400 px-4 py-3 rounded-lg mb-6 font-body text-sm">
          {error}
        </div>
      )}

      {/* Score Breakdown */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <h3 className="text-lg font-heading text-white mb-4">Score Breakdown</h3>
        <div className="space-y-3">
          {Object.entries(breakdown).map(([key, value]) => (
            <div key={key} className="flex items-center gap-4">
              <span className="text-gray-400 font-body text-sm w-36">{DIMENSION_LABELS[key] || key}</span>
              <div className="flex-1 bg-gray-800 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-indigo to-brand-violet rounded-full transition-all"
                  style={{ width: `${value}%` }}
                />
              </div>
              <span className="text-white font-heading text-sm w-8 text-right">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Opportunity & Risk */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-sm font-heading text-green-400 mb-2">Biggest Opportunity</h3>
          <p className="text-gray-300 font-body text-sm">{assessment.biggest_opportunity || 'N/A'}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-sm font-heading text-red-400 mb-2">Biggest Risk</h3>
          <p className="text-gray-300 font-body text-sm">{assessment.biggest_risk || 'N/A'}</p>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <h3 className="text-lg font-heading text-white mb-4">Founder Notes</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white font-body text-sm focus:outline-none focus:border-brand-indigo min-h-[100px] resize-y"
          placeholder="Add notes about this assessment..."
        />
        <button
          onClick={saveNotes}
          disabled={saving}
          className="mt-3 bg-brand-indigo hover:bg-brand-violet text-white font-heading text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Notes'}
        </button>
      </div>

      {/* Conversation Transcript */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-heading text-white mb-4">Conversation</h3>
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
          {(assessment.conversation || []).map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] px-4 py-3 rounded-2xl font-body text-sm ${
                  msg.role === 'user'
                    ? 'bg-brand-indigo/20 text-white rounded-br-md'
                    : 'bg-gray-800 text-gray-300 rounded-bl-md'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {(!assessment.conversation || assessment.conversation.length === 0) && (
            <p className="text-gray-500 font-body text-sm">No conversation data.</p>
          )}
        </div>
      </div>
    </div>
  )
}
