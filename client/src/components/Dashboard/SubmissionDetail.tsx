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
  results_unlocked?: boolean
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
  const [messages, setMessages] = useState<Array<{ id: number; sender: string; body: string; created_at: string }>>([])
  const [messageBody, setMessageBody] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)
  const [msgError, setMsgError] = useState('')
  const [unlocking, setUnlocking] = useState(false)

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
        try {
          const msgsRes = await authFetch(`${API_URL}/api/assessments/${id}/messages`, token, on401)
          if (msgsRes?.ok) {
            const msgsData = await msgsRes.json()
            setMessages(msgsData)
          }
        } catch { /* non-critical */ }
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

  if (loading) return <p style={{ color: '#aaaaaa', fontFamily: "'Outfit', sans-serif" }}>Loading...</p>
  if (!assessment) return <p style={{ color: '#aaaaaa', fontFamily: "'Outfit', sans-serif" }}>Assessment not found.</p>

  const breakdown = assessment.score_breakdown || {}

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif" }}>
      <button onClick={onBack} style={{ color: '#aaaaaa', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', marginBottom: '24px', display: 'inline-block', padding: 0 }}>
        &larr; Back to list
      </button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#ffffff', margin: '0 0 4px 0' }}>{assessment.email}</h2>
          <p style={{ color: '#aaaaaa', fontSize: '14px', margin: 0 }}>
            Score: <span style={{ color: '#ffffff', fontWeight: 600 }}>{assessment.score}</span> &middot; Status:{' '}
            <span style={{ color: '#ffffff' }}>{assessment.status}</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {!assessment.results_unlocked && (
            <button
              onClick={async () => {
                setUnlocking(true)
                try {
                  const res = await authFetch(`${API_URL}/api/assessments/${id}/unlock-results`, token, on401, { method: 'POST' })
                  if (res?.ok) {
                    setAssessment((prev) => prev ? { ...prev, results_unlocked: true } : prev)
                    setActionMsg('Results unlocked — the prospect can now see their score.')
                  }
                } catch { setError('Failed to unlock results.') }
                finally { setUnlocking(false) }
              }}
              disabled={unlocking}
              style={{ background: '#ffffff', color: '#000000', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '14px', fontWeight: 600, cursor: unlocking ? 'default' : 'pointer', opacity: unlocking ? 0.5 : 1, fontFamily: "'Outfit', sans-serif" }}
            >
              {unlocking ? 'Unlocking…' : 'Unlock Results'}
            </button>
          )}
          <button
            onClick={() => handleAction('onboard')}
            style={{ background: '#ffffff', color: '#000000', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}
          >
            Onboard
          </button>
          <button
            onClick={() => handleAction('defer')}
            style={{ background: '#333333', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}
          >
            Defer
          </button>
        </div>
      </div>

      {actionMsg && (
        <div style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80', padding: '12px 16px', borderRadius: '6px', marginBottom: '24px', fontSize: '14px' }}>
          {actionMsg}
        </div>
      )}

      {error && (
        <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', padding: '12px 16px', borderRadius: '6px', marginBottom: '24px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* Score Breakdown */}
      <div style={{ background: '#111111', border: '1px solid #333333', borderRadius: '8px', padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff', margin: '0 0 16px 0' }}>Score Breakdown</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {Object.entries(breakdown).map(([key, value]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ color: '#aaaaaa', fontSize: '14px', width: '144px', flexShrink: 0 }}>{DIMENSION_LABELS[key] || key}</span>
              <div style={{ flex: 1, background: '#1a1a1a', borderRadius: '999px', height: '12px', overflow: 'hidden' }}>
                <div
                  style={{ height: '100%', background: '#ffffff', borderRadius: '999px', width: `${value}%`, transition: 'width 0.3s' }}
                />
              </div>
              <span style={{ color: '#ffffff', fontSize: '14px', fontWeight: 600, width: '32px', textAlign: 'right' }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Opportunity & Risk */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#111111', border: '1px solid #333333', borderRadius: '8px', padding: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#4ade80', margin: '0 0 8px 0' }}>Biggest Opportunity</h3>
          <p style={{ color: '#aaaaaa', fontSize: '14px', margin: 0 }}>{assessment.biggest_opportunity || 'N/A'}</p>
        </div>
        <div style={{ background: '#111111', border: '1px solid #333333', borderRadius: '8px', padding: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#f87171', margin: '0 0 8px 0' }}>Biggest Risk</h3>
          <p style={{ color: '#aaaaaa', fontSize: '14px', margin: 0 }}>{assessment.biggest_risk || 'N/A'}</p>
        </div>
      </div>

      {/* Notes */}
      <div style={{ background: '#111111', border: '1px solid #333333', borderRadius: '8px', padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff', margin: '0 0 16px 0' }}>Founder Notes</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={{ width: '100%', background: '#1a1a1a', border: '1px solid #333333', borderRadius: '6px', padding: '12px 16px', color: '#ffffff', fontSize: '14px', outline: 'none', minHeight: '100px', resize: 'vertical', boxSizing: 'border-box', fontFamily: "'Outfit', sans-serif" }}
          placeholder="Add notes about this assessment..."
        />
        <button
          onClick={saveNotes}
          disabled={saving}
          style={{ marginTop: '12px', background: '#ffffff', color: '#000000', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '14px', fontWeight: 600, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.5 : 1, fontFamily: "'Outfit', sans-serif" }}
        >
          {saving ? 'Saving...' : 'Save Notes'}
        </button>
      </div>

      {/* Conversation Transcript */}
      <div style={{ background: '#111111', border: '1px solid #333333', borderRadius: '8px', padding: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff', margin: '0 0 16px 0' }}>Conversation</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '500px', overflowY: 'auto', paddingRight: '8px' }}>
          {(assessment.conversation || []).map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div
                style={{
                  maxWidth: '75%',
                  padding: '12px 16px',
                  borderRadius: '16px',
                  fontSize: '14px',
                  background: msg.role === 'user' ? '#333333' : '#1a1a1a',
                  color: msg.role === 'user' ? '#ffffff' : '#aaaaaa',
                  borderBottomRightRadius: msg.role === 'user' ? '4px' : '16px',
                  borderBottomLeftRadius: msg.role === 'user' ? '16px' : '4px',
                }}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {(!assessment.conversation || assessment.conversation.length === 0) && (
            <p style={{ color: '#aaaaaa', fontSize: '14px', margin: 0 }}>No conversation data.</p>
          )}
        </div>
      </div>

      {/* Portal Messages */}
      <div style={{ background: '#111111', border: '1px solid #333333', borderRadius: '8px', padding: '24px', marginTop: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff', margin: '0 0 16px 0' }}>Portal Messages</h3>

        {/* Thread */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
          {messages.length === 0 && (
            <p style={{ color: '#aaaaaa', fontSize: '14px', margin: 0 }}>No messages yet.</p>
          )}
          {messages.map((msg) => (
            <div key={msg.id} style={{ display: 'flex', justifyContent: msg.sender === 'prospect' ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '75%', padding: '8px 12px', borderRadius: '12px', fontSize: '14px', background: msg.sender === 'team' ? '#1a1a1a' : '#333333', color: '#aaaaaa' }}>
                <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '4px' }}>{msg.sender === 'team' ? 'You' : 'Prospect'}</div>
                {msg.body}
              </div>
            </div>
          ))}
        </div>

        {/* Send form */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <textarea
            value={messageBody}
            onChange={(e) => setMessageBody(e.target.value)}
            placeholder="Write a message to this prospect…"
            rows={2}
            style={{ flex: 1, background: '#1a1a1a', border: '1px solid #333333', borderRadius: '6px', padding: '8px 12px', color: '#ffffff', fontSize: '14px', outline: 'none', resize: 'none', fontFamily: "'Outfit', sans-serif" }}
          />
          <button
            onClick={async () => {
              if (!messageBody.trim()) return
              setSendingMsg(true)
              setMsgError('')
              try {
                const res = await authFetch(`${API_URL}/api/assessments/${id}/message`, token, on401, {
                  method: 'POST',
                  body: JSON.stringify({ body: messageBody.trim() }),
                })
                if (res?.ok) {
                  setMessages((prev) => [...prev, { id: Date.now(), sender: 'team', body: messageBody.trim(), created_at: new Date().toISOString() }])
                  setMessageBody('')
                } else {
                  setMsgError('Failed to send. Try again.')
                }
              } catch { setMsgError('Network error.') }
              finally { setSendingMsg(false) }
            }}
            disabled={sendingMsg || !messageBody.trim()}
            style={{ background: '#ffffff', color: '#000000', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '14px', fontWeight: 600, cursor: (sendingMsg || !messageBody.trim()) ? 'default' : 'pointer', opacity: (sendingMsg || !messageBody.trim()) ? 0.5 : 1, alignSelf: 'flex-end', fontFamily: "'Outfit', sans-serif" }}
          >
            {sendingMsg ? '…' : 'Send'}
          </button>
        </div>
        {msgError && <p style={{ color: '#f87171', fontSize: '12px', marginTop: '8px' }}>{msgError}</p>}
      </div>
    </div>
  )
}
