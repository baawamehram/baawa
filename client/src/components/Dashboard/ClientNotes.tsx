import { useState } from 'react'
import { API_URL, authFetch } from '../../lib/api'

interface Note {
  id: number
  content: string
  created_at: string
}

interface Props {
  clientId: number
  notes: Note[]
  token: string
  on401: () => void
  onUpdate: () => void
}

export function ClientNotes({ clientId, notes, token, on401, onUpdate }: Props) {
  const [newNote, setNewNote] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  const addNote = async () => {
    if (!newNote.trim()) return
    setAdding(true)
    setError('')
    try {
      const res = await authFetch(`${API_URL}/api/clients/${clientId}/notes`, token, on401, {
        method: 'POST',
        body: JSON.stringify({ content: newNote }),
      })
      if (!res) return
      if (!res.ok) {
        setError('Something went wrong. Please try again.')
        return
      }
      setNewNote('')
      onUpdate()
    } catch {
      setError('Network error. Please check your connection.')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="bg-surface border border-border-subtle rounded-xl p-6">
      <h3 className="text-lg font-heading text-white mb-4">Notes</h3>

      {error && (
        <div className="bg-red-900/30 border border-red-700/50 text-red-400 px-4 py-3 rounded-lg mb-4 font-body text-sm">
          {error}
        </div>
      )}

      <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto">
        {notes.map((note) => (
          <div key={note.id} className="bg-surface-2 rounded-lg px-4 py-3">
            <p className="text-gray-300 font-body text-sm whitespace-pre-wrap">{note.content}</p>
            <p className="text-gray-500 font-body text-xs mt-2">
              {new Date(note.created_at).toLocaleString()}
            </p>
          </div>
        ))}
        {notes.length === 0 && (
          <p className="text-gray-500 font-body text-sm">No notes yet.</p>
        )}
      </div>

      <div className="flex gap-2">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a note..."
          className="flex-1 bg-surface-2 border border-border-subtle rounded-lg px-3 py-2 text-white font-body text-sm focus:outline-none focus:border-brand-indigo resize-none"
          rows={2}
        />
        <button
          onClick={addNote}
          disabled={adding}
          className="bg-brand-indigo hover:bg-brand-violet text-white font-heading text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50 self-end"
        >
          Add
        </button>
      </div>
    </div>
  )
}
