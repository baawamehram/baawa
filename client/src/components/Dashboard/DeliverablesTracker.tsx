import { useState } from 'react'
import { API_URL, authFetch } from '../../lib/api'

interface Deliverable {
  id: number
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed'
  due_date: string
  completed_at: string | null
  research_context?: string
}

interface Props {
  clientId: number
  deliverables: Deliverable[]
  token: string
  on401: () => void
  onUpdate: () => void
}

const STATUS_OPTIONS: { value: Deliverable['status']; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
]

const STATUS_COLORS: Record<string, string> = {
  pending: '#facc15',
  in_progress: '#60a5fa',
  completed: '#4ade80',
}

export function DeliverablesTracker({ clientId, deliverables, token, on401, onUpdate }: Props) {
  const [newTitle, setNewTitle] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [adding, setAdding] = useState(false)
  const [draftingId, setDraftingId] = useState<number | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [error, setError] = useState('')

  const updateStatus = async (delId: number, status: Deliverable['status']) => {
    setError('')
    try {
      const res = await authFetch(`${API_URL}/api/deliverables/${delId}`, token, on401, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      })
      if (res?.ok) onUpdate()
      else setError('Failed to update status.')
    } catch {
      setError('Network error. Please check your connection.')
    }
  }

  const draftWithAI = async (delId: number) => {
    setDraftingId(delId)
    setError('')
    try {
      const res = await authFetch(`${API_URL}/api/deliverables/${delId}/draft`, token, on401, {
        method: 'POST'
      })
      if (res?.ok) {
        onUpdate()
        setExpandedId(delId)
      } else setError('Failed to generate AI draft.')
    } catch {
      setError('Failed to generate AI draft.')
    } finally {
      setDraftingId(null)
    }
  }

  const addDeliverable = async () => {
    if (!newTitle.trim()) return
    setAdding(true)
    setError('')
    try {
      const res = await authFetch(`${API_URL}/api/clients/${clientId}/deliverables`, token, on401, {
        method: 'POST',
        body: JSON.stringify({ title: newTitle, due_date: newDueDate || null }),
      })
      if (res?.ok) {
        setNewTitle('')
        setNewDueDate('')
        onUpdate()
      } else setError('Failed to add deliverable.')
    } catch {
      setError('Network error. Please check your connection.')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div style={{ background: '#111111', border: '1px solid #333333', borderRadius: '8px', padding: '24px', fontFamily: "'Outfit', sans-serif" }}>
      <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff', margin: '0 0 16px 0' }}>Deliverables</h3>

      {error && (
        <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', padding: '12px 16px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
        {deliverables.map((d) => (
          <div key={d.id} style={{ display: 'flex', flexDirection: 'column', background: '#1a1a1a', borderRadius: '6px', overflow: 'hidden', border: '1px solid #333333' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
              <div style={{ cursor: 'pointer' }} onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}>
                <p style={{ color: '#ffffff', fontSize: '14px', margin: '0 0 2px 0', fontWeight: 600 }}>{d.title}</p>
                {d.due_date && (
                  <p style={{ color: '#aaaaaa', fontSize: '10px', margin: 0, textTransform: 'uppercase' }}>
                    Due: {new Date(d.due_date).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  onClick={() => draftWithAI(d.id)}
                  disabled={draftingId !== null}
                  style={{ background: 'none', border: 'none', color: '#FF6B35', fontSize: '12px', cursor: 'pointer', fontWeight: 600, opacity: draftingId === d.id ? 0.5 : 1 }}
                >
                  {draftingId === d.id ? 'Drafting...' : '🪄 AI Draft'}
                </button>
                <select
                  value={d.status}
                  onChange={(e) => updateStatus(d.id, e.target.value as Deliverable['status'])}
                  style={{ background: '#000000', border: '1px solid #333333', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', color: STATUS_COLORS[d.status] || '#aaaaaa', outline: 'none', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
            {expandedId === d.id && (
              <div style={{ padding: '0 16px 16px 16px', borderTop: '1px solid #222222' }}>
                <p style={{ color: '#888888', fontSize: '13px', whiteSpace: 'pre-wrap', lineHeight: '1.6', margin: '16px 0 0 0' }}>
                  {d.research_context || 'No strategy draft yet. Click "AI Draft" to generate one.'}
                </p>
                <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                  <a 
                    href={`${API_URL}/api/deliverables/${d.id}/file`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ background: '#1a1a1a', border: '1px solid #333333', borderRadius: '4px', padding: '6px 12px', fontSize: '12px', color: '#ffffff', textDecoration: 'none', display: 'inline-block' }}
                  >
                    📎 Download
                  </a>
                  <label style={{ background: '#ffffff', color: '#000000', borderRadius: '4px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                    ↑ Upload
                    <input 
                      type="file" 
                      style={{ display: 'none' }} 
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        const formData = new FormData()
                        formData.append('file', file)
                        const res = await fetch(`${API_URL}/api/deliverables/${d.id}/upload`, {
                          method: 'POST',
                          headers: { 'Authorization': `Bearer ${token}` },
                          body: formData
                        })
                        if (res.ok) onUpdate()
                      }}
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        ))}
        {deliverables.length === 0 && (
          <p style={{ color: '#aaaaaa', fontSize: '14px', margin: 0 }}>No deliverables yet.</p>
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="New deliverable..."
          style={{ flex: 1, background: '#1a1a1a', border: '1px solid #333333', borderRadius: '6px', padding: '8px 12px', color: '#ffffff', fontSize: '14px', outline: 'none', fontFamily: "'Outfit', sans-serif" }}
        />
        <input
          type="date"
          value={newDueDate}
          onChange={(e) => setNewDueDate(e.target.value)}
          style={{ background: '#1a1a1a', border: '1px solid #333333', borderRadius: '6px', padding: '8px 12px', color: '#ffffff', fontSize: '14px', outline: 'none', fontFamily: "'Outfit', sans-serif" }}
        />
        <button
          onClick={addDeliverable}
          disabled={adding}
          style={{ background: '#ffffff', color: '#000000', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '14px', fontWeight: 600, cursor: adding ? 'default' : 'pointer', opacity: adding ? 0.5 : 1, fontFamily: "'Outfit', sans-serif" }}
        >
          Add
        </button>
      </div>
    </div>
  )
}
