import { useState } from 'react'
import { API_URL, authFetch } from '../../lib/api'

interface Deliverable {
  id: number
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed'
  due_date: string
  completed_at: string | null
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
  const [error, setError] = useState('')

  const updateStatus = async (delId: number, status: Deliverable['status']) => {
    setError('')
    try {
      const res = await authFetch(`${API_URL}/api/deliverables/${delId}`, token, on401, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      })
      if (!res) return
      if (!res.ok) {
        setError('Something went wrong. Please try again.')
        return
      }
      onUpdate()
    } catch {
      setError('Network error. Please check your connection.')
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
      if (!res) return
      if (!res.ok) {
        setError('Something went wrong. Please try again.')
        return
      }
      setNewTitle('')
      setNewDueDate('')
      onUpdate()
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
          <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#1a1a1a', borderRadius: '6px', padding: '12px 16px' }}>
            <div>
              <p style={{ color: '#ffffff', fontSize: '14px', margin: '0 0 2px 0' }}>{d.title}</p>
              {d.due_date && (
                <p style={{ color: '#aaaaaa', fontSize: '12px', margin: 0 }}>
                  Due: {new Date(d.due_date).toLocaleDateString()}
                </p>
              )}
            </div>
            <select
              value={d.status}
              onChange={(e) => updateStatus(d.id, e.target.value as Deliverable['status'])}
              style={{ background: '#1a1a1a', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', color: STATUS_COLORS[d.status] || '#aaaaaa', outline: 'none', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
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
