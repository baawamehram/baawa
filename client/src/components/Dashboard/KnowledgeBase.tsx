import { useState, useEffect, useCallback } from 'react'
import { API_URL, authFetch } from '../../lib/api'

interface KnowledgeSource {
  source_name: string
  is_active: boolean
  chunk_count: number
  created_at: string
}

interface Props {
  token: string
  on401: () => void
}

export function KnowledgeBase({ token, on401 }: Props) {
  const [sources, setSources] = useState<KnowledgeSource[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadName, setUploadName] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const fetchSources = useCallback(async () => {
    try {
      const res = await authFetch(`${API_URL}/api/knowledge`, token, on401)
      if (!res) return
      if (!res.ok) {
        setError('Failed to load knowledge sources.')
        return
      }
      const data = await res.json()
      setSources(data)
    } catch {
      setError('Network error. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }, [token, on401])

  useEffect(() => { fetchSources() }, [fetchSources])

  const toggleActive = async (sourceName: string, isActive: boolean) => {
    setError('')
    try {
      const res = await authFetch(`${API_URL}/api/knowledge/${encodeURIComponent(sourceName)}`, token, on401, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !isActive }),
      })
      if (!res) return
      if (!res.ok) {
        setError('Something went wrong. Please try again.')
        return
      }
      fetchSources()
    } catch {
      setError('Network error. Please check your connection.')
    }
  }

  const deleteSource = async (sourceName: string) => {
    if (!window.confirm('Delete this knowledge source? This cannot be undone.')) return
    setError('')
    try {
      const res = await authFetch(`${API_URL}/api/knowledge/${encodeURIComponent(sourceName)}`, token, on401, {
        method: 'DELETE',
      })
      if (!res) return
      if (!res.ok) {
        setError('Something went wrong. Please try again.')
        return
      }
      fetchSources()
    } catch {
      setError('Network error. Please check your connection.')
    }
  }

  const handleUpload = async () => {
    if (!uploadFile || !uploadName.trim()) return
    setUploading(true)
    setError('')
    const formData = new FormData()
    formData.append('file', uploadFile)
    formData.append('source_name', uploadName)
    try {
      const res = await authFetch(`${API_URL}/api/knowledge`, token, on401, {
        method: 'POST',
        body: formData,
      })
      if (!res) return
      if (!res.ok) {
        setError('Something went wrong. Please try again.')
        return
      }
      setUploadName('')
      setUploadFile(null)
      fetchSources()
    } catch {
      setError('Network error. Please check your connection.')
    } finally {
      setUploading(false)
    }
  }

  if (loading) return <p style={{ color: '#aaaaaa', fontFamily: "'Outfit', sans-serif" }}>Loading...</p>

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif" }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#ffffff', margin: '0 0 24px 0' }}>Knowledge Base</h2>

      {error && (
        <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', padding: '12px 16px', borderRadius: '6px', marginBottom: '24px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* Upload */}
      <div style={{ background: '#111111', border: '1px solid #333333', borderRadius: '8px', padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff', margin: '0 0 16px 0' }}>Upload Source</h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ color: '#aaaaaa', fontSize: '12px', marginBottom: '4px', display: 'block' }}>Source Name</label>
            <input
              type="text"
              value={uploadName}
              onChange={(e) => setUploadName(e.target.value)}
              placeholder="e.g. pricing-guide"
              style={{ width: '100%', background: '#1a1a1a', border: '1px solid #333333', borderRadius: '6px', padding: '8px 12px', color: '#ffffff', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: "'Outfit', sans-serif" }}
            />
          </div>
          <div>
            <label style={{ color: '#aaaaaa', fontSize: '12px', marginBottom: '4px', display: 'block' }}>File (.md)</label>
            <input
              type="file"
              accept=".md"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              style={{ color: '#aaaaaa', fontSize: '14px', fontFamily: "'Outfit', sans-serif" }}
            />
          </div>
          <button
            onClick={handleUpload}
            disabled={uploading || !uploadFile || !uploadName.trim()}
            style={{ background: '#ffffff', color: '#000000', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '14px', fontWeight: 600, cursor: (uploading || !uploadFile || !uploadName.trim()) ? 'default' : 'pointer', opacity: (uploading || !uploadFile || !uploadName.trim()) ? 0.5 : 1, fontFamily: "'Outfit', sans-serif" }}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>

      {/* Sources List */}
      <div style={{ background: '#111111', border: '1px solid #333333', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #333333', textAlign: 'left' }}>
              <th style={{ padding: '12px 24px', color: '#aaaaaa', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>Source</th>
              <th style={{ padding: '12px 24px', color: '#aaaaaa', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>Chunks</th>
              <th style={{ padding: '12px 24px', color: '#aaaaaa', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>Status</th>
              <th style={{ padding: '12px 24px', color: '#aaaaaa', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.source_name} style={{ borderBottom: '1px solid #222222' }}>
                <td style={{ padding: '16px 24px', color: '#ffffff', fontSize: '14px' }}>{s.source_name}</td>
                <td style={{ padding: '16px 24px', color: '#aaaaaa', fontSize: '14px' }}>{s.chunk_count}</td>
                <td style={{ padding: '16px 24px' }}>
                  <span style={{ fontSize: '12px', color: s.is_active ? '#4ade80' : '#aaaaaa' }}>
                    {s.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => toggleActive(s.source_name, s.is_active)}
                      style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '4px', background: '#333333', color: '#ffffff', border: 'none', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}
                    >
                      {s.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => deleteSource(s.source_name)}
                      style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '4px', background: 'rgba(248,113,113,0.1)', color: '#f87171', border: 'none', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {sources.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: '32px 24px', textAlign: 'center', color: '#aaaaaa', fontSize: '14px' }}>
                  No knowledge sources yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
