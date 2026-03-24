import { useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

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

  const addNote = async () => {
    if (!newNote.trim()) return
    setAdding(true)
    const res = await fetch(`${API_URL}/api/clients/${clientId}/notes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newNote }),
    })
    if (res.status === 401) { on401(); return }
    setAdding(false)
    if (res.ok) {
      setNewNote('')
      onUpdate()
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <h3 className="text-lg font-heading text-white mb-4">Notes</h3>

      <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto">
        {notes.map((note) => (
          <div key={note.id} className="bg-gray-800 rounded-lg px-4 py-3">
            <p className="text-gray-300 font-body text-sm whitespace-pre-wrap">{note.content}</p>
            <p className="text-gray-600 font-body text-xs mt-2">
              {new Date(note.created_at).toLocaleString()}
            </p>
          </div>
        ))}
        {notes.length === 0 && (
          <p className="text-gray-600 font-body text-sm">No notes yet.</p>
        )}
      </div>

      <div className="flex gap-2">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a note..."
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white font-body text-sm focus:outline-none focus:border-brand-indigo resize-none"
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
