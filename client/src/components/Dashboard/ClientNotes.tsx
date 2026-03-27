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
    <div style={{ background: '#111111', border: '1px solid #333333', borderRadius: '8px', padding: '24px', fontFamily: "'Outfit', sans-serif" }}>
      <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff', margin: '0 0 16px 0' }}>Notes</h3>

      {error && (
        <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', padding: '12px 16px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px', maxHeight: '300px', overflowY: 'auto' }}>
        {notes.map((note) => (
          <div key={note.id} style={{ background: '#1a1a1a', borderRadius: '6px', padding: '12px 16px' }}>
            <p style={{ color: '#aaaaaa', fontSize: '14px', whiteSpace: 'pre-wrap', margin: '0 0 8px 0' }}>{note.content}</p>
            <p style={{ color: '#666666', fontSize: '12px', margin: 0 }}>
              {new Date(note.created_at).toLocaleString()}
            </p>
          </div>
        ))}
        {notes.length === 0 && (
          <p style={{ color: '#666666', fontSize: '14px', margin: 0 }}>No notes yet.</p>
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a note..."
          style={{ flex: 1, background: '#1a1a1a', border: '1px solid #333333', borderRadius: '6px', padding: '8px 12px', color: '#ffffff', fontSize: '14px', resize: 'none', outline: 'none', fontFamily: "'Outfit', sans-serif" }}
          rows={2}
        />
        <button
          onClick={addNote}
          disabled={adding}
          style={{ background: '#ffffff', color: '#000000', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '14px', fontWeight: 600, cursor: adding ? 'default' : 'pointer', opacity: adding ? 0.5 : 1, alignSelf: 'flex-end', fontFamily: "'Outfit', sans-serif" }}
        >
          Add
        </button>
      </div>
    </div>
  )
}
