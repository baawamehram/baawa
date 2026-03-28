import { useState, useEffect, useCallback, useRef } from 'react'
import { API_URL, authFetch } from '../../lib/api'

interface KnowledgeSource {
  source_name: string
  is_active: boolean
  chunk_count: number
  created_at: string
}

interface IngestSource {
  source_name: string
  count: string
  last_ingested: string
}

interface IngestStatus {
  running: boolean
  lastRun: string | null
  lastError: string | null
  totalActiveChunks: number
  sources: IngestSource[]
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

  // Ingestion state
  const [ingestStatus, setIngestStatus] = useState<IngestStatus | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const pollRef = useRef<number | null>(null)

  const fetchSources = useCallback(async () => {
    try {
      const res = await authFetch(`${API_URL}/api/knowledge`, token, on401)
      if (!res) return
      if (!res.ok) { setError('Failed to load knowledge sources.'); return }
      const data = await res.json()
      setSources(data)
    } catch {
      setError('Network error.')
    } finally {
      setLoading(false)
    }
  }, [token, on401])

  const fetchIngestStatus = useCallback(async () => {
    try {
      const res = await authFetch(`${API_URL}/api/admin/ingest/status`, token, on401)
      if (!res || !res.ok) return
      const data = await res.json() as IngestStatus
      setIngestStatus(data)
      // If it was running and now stopped, refresh sources table too
      if (!data.running) {
        setSyncing(false)
        if (pollRef.current) {
          clearInterval(pollRef.current)
          pollRef.current = null
        }
        fetchSources()
      }
    } catch {
      // silent
    }
  }, [token, on401, fetchSources])

  useEffect(() => {
    fetchSources()
    fetchIngestStatus()
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [fetchSources, fetchIngestStatus])

  const startSync = async () => {
    setSyncing(true)
    setSyncMsg('')
    setError('')
    try {
      const res = await authFetch(`${API_URL}/api/admin/ingest`, token, on401, { method: 'POST' })
      if (!res) return
      if (!res.ok) {
        setSyncing(false)
        setError('Failed to start ingestion.')
        return
      }
      setSyncMsg('Ingestion running in background (~10–15 min). This page auto-refreshes.')
      // Poll every 8 seconds while running
      pollRef.current = window.setInterval(() => {
        void fetchIngestStatus()
      }, 8000)
    } catch {
      setSyncing(false)
      setError('Network error starting sync.')
    }
  }

  const toggleActive = async (sourceName: string, isActive: boolean) => {
    setError('')
    try {
      const res = await authFetch(`${API_URL}/api/knowledge/${encodeURIComponent(sourceName)}`, token, on401, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !isActive }),
      })
      if (!res || !res.ok) { setError('Something went wrong.'); return }
      fetchSources()
    } catch {
      setError('Network error.')
    }
  }

  const deleteSource = async (sourceName: string) => {
    if (!window.confirm('Delete this knowledge source? This cannot be undone.')) return
    setError('')
    try {
      const res = await authFetch(`${API_URL}/api/knowledge/${encodeURIComponent(sourceName)}`, token, on401, { method: 'DELETE' })
      if (!res || !res.ok) { setError('Something went wrong.'); return }
      fetchSources()
    } catch {
      setError('Network error.')
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
      const res = await authFetch(`${API_URL}/api/knowledge`, token, on401, { method: 'POST', body: formData })
      if (!res || !res.ok) { setError('Something went wrong.'); return }
      setUploadName('')
      setUploadFile(null)
      fetchSources()
    } catch {
      setError('Network error.')
    } finally {
      setUploading(false)
    }
  }

  if (loading) return <p style={{ color: '#aaaaaa', fontFamily: "'Outfit', sans-serif" }}>Loading...</p>

  const cardStyle = {
    background: '#111111',
    border: '1px solid #333333',
    borderRadius: '8px',
    padding: '24px',
    marginBottom: '20px',
  }

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif" }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#ffffff', margin: '0 0 24px 0' }}>Knowledge Base</h2>

      {error && (
        <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', padding: '12px 16px', borderRadius: '6px', marginBottom: '20px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* ── Sync Knowledge Base ── */}
      <div style={{ ...cardStyle, border: syncing ? '1px solid rgba(255,107,53,0.4)' : '1px solid #333333' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                Sync Knowledge Base
              </h3>
              {syncing && (
                <span style={{ fontSize: '11px', color: '#FF6B35', background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.25)', borderRadius: 4, padding: '2px 8px', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
                  ● Running
                </span>
              )}
            </div>
            <p style={{ fontSize: '13px', color: '#888888', margin: '0 0 12px', lineHeight: 1.6 }}>
              Scrapes public white papers from HBR, McKinsey, BCG, Bain, Deloitte, Strategy+Business, MIT Sloan, and Accenture. Embeds and stores chunks into the RAG knowledge base.
            </p>
            {ingestStatus && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px' }}>
                <span style={{ fontSize: 12, color: '#555' }}>
                  Total active chunks: <span style={{ color: '#ffffff', fontWeight: 600 }}>{ingestStatus.totalActiveChunks.toLocaleString()}</span>
                </span>
                {ingestStatus.lastRun && (
                  <span style={{ fontSize: 12, color: '#555' }}>
                    Last sync: <span style={{ color: '#aaa' }}>{new Date(ingestStatus.lastRun).toLocaleString()}</span>
                  </span>
                )}
                {ingestStatus.lastError && (
                  <span style={{ fontSize: 12, color: '#f87171' }}>Last error: {ingestStatus.lastError}</span>
                )}
              </div>
            )}
            {syncMsg && (
              <p style={{ fontSize: 12, color: '#FF6B35', margin: '8px 0 0', lineHeight: 1.5 }}>{syncMsg}</p>
            )}
          </div>

          <button
            onClick={() => { void startSync() }}
            disabled={syncing}
            style={{
              background: syncing ? 'transparent' : '#FF6B35',
              color: syncing ? '#FF6B35' : '#000',
              border: syncing ? '1px solid rgba(255,107,53,0.4)' : 'none',
              borderRadius: '6px',
              padding: '10px 20px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: syncing ? 'default' : 'pointer',
              fontFamily: "'Outfit', sans-serif",
              letterSpacing: '0.04em',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {syncing ? '⟳ Syncing...' : '↻ Sync Now'}
          </button>
        </div>

        {/* Per-source status table */}
        {ingestStatus && ingestStatus.sources.length > 0 && (
          <div style={{ marginTop: 20, borderTop: '1px solid #222', paddingTop: 16 }}>
            <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Ingested Sources</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
              {ingestStatus.sources.map(s => (
                <div key={s.source_name} style={{ background: '#0d0d0d', border: '1px solid #222', borderRadius: 6, padding: '10px 12px' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.source_name}</div>
                  <div style={{ fontSize: 11, color: '#555' }}>
                    <span style={{ color: '#FF6B35', fontWeight: 700 }}>{parseInt(s.count).toLocaleString()}</span> chunks
                    {s.last_ingested && (
                      <span style={{ marginLeft: 6 }}>· {new Date(s.last_ingested).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Upload ── */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff', margin: '0 0 16px 0' }}>Upload Custom Source</h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 140 }}>
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
            onClick={() => { void handleUpload() }}
            disabled={uploading || !uploadFile || !uploadName.trim()}
            style={{ background: '#ffffff', color: '#000000', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '14px', fontWeight: 600, cursor: (uploading || !uploadFile || !uploadName.trim()) ? 'default' : 'pointer', opacity: (uploading || !uploadFile || !uploadName.trim()) ? 0.5 : 1, fontFamily: "'Outfit', sans-serif" }}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>

      {/* ── Sources List ── */}
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
                      onClick={() => { void toggleActive(s.source_name, s.is_active) }}
                      style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '4px', background: '#333333', color: '#ffffff', border: 'none', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}
                    >
                      {s.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => { void deleteSource(s.source_name) }}
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
                  No knowledge sources yet. Run a sync or upload a file above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
