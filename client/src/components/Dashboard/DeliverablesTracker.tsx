import { useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

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
  pending: 'text-yellow-400',
  in_progress: 'text-blue-400',
  completed: 'text-green-400',
}

export function DeliverablesTracker({ clientId, deliverables, token, on401, onUpdate }: Props) {
  const [newTitle, setNewTitle] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [adding, setAdding] = useState(false)

  const updateStatus = async (delId: number, status: Deliverable['status']) => {
    const res = await fetch(`${API_URL}/api/deliverables/${delId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.status === 401) { on401(); return }
    if (res.ok) onUpdate()
  }

  const addDeliverable = async () => {
    if (!newTitle.trim()) return
    setAdding(true)
    const res = await fetch(`${API_URL}/api/clients/${clientId}/deliverables`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle, due_date: newDueDate || null }),
    })
    if (res.status === 401) { on401(); return }
    setAdding(false)
    if (res.ok) {
      setNewTitle('')
      setNewDueDate('')
      onUpdate()
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <h3 className="text-lg font-heading text-white mb-4">Deliverables</h3>

      <div className="space-y-3 mb-4">
        {deliverables.map((d) => (
          <div key={d.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3">
            <div>
              <p className="text-white font-body text-sm">{d.title}</p>
              {d.due_date && (
                <p className="text-gray-500 font-body text-xs mt-0.5">
                  Due: {new Date(d.due_date).toLocaleDateString()}
                </p>
              )}
            </div>
            <select
              value={d.status}
              onChange={(e) => updateStatus(d.id, e.target.value as Deliverable['status'])}
              className={`bg-gray-700 border-0 rounded px-2 py-1 font-body text-xs focus:outline-none ${STATUS_COLORS[d.status] || 'text-gray-300'}`}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        ))}
        {deliverables.length === 0 && (
          <p className="text-gray-600 font-body text-sm">No deliverables yet.</p>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="New deliverable..."
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white font-body text-sm focus:outline-none focus:border-brand-indigo"
        />
        <input
          type="date"
          value={newDueDate}
          onChange={(e) => setNewDueDate(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white font-body text-sm focus:outline-none focus:border-brand-indigo"
        />
        <button
          onClick={addDeliverable}
          disabled={adding}
          className="bg-brand-indigo hover:bg-brand-violet text-white font-heading text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </div>
  )
}
