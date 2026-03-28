import { useState, useEffect, useCallback, useRef } from 'react'
import { API_URL, authFetch } from '../../lib/api'
import { useDashboardTheme } from './ThemeContext'

interface KnowledgeSource {
  source_name: string
  is_active: boolean
  chunk_count: number
  created_at: string
  category?: string
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
  const { theme } = useDashboardTheme()
  const [sources, setSources] = useState<KnowledgeSource[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadName, setUploadName] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  // URL Ingestion
  const [urlIngest, setUrlIngest] = useState('')
  const [ingestCategory, setIngestCategory] = useState('general')
  const [ingesting, setIngesting] = useState(false)

  // Ingestion status (Full Sync)
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
      setSyncMsg('Ingestion running in background. This page auto-refreshes.')
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

  const handleUrlIngest = async () => {
    if (!urlIngest.trim()) return
    setIngesting(true)
    setError('')
    try {
      const res = await authFetch(`${API_URL}/api/knowledge/url`, token, on401, {
        method: 'POST',
        body: JSON.stringify({ url: urlIngest, category: ingestCategory }),
      })
      if (!res || !res.ok) { setError('Failed to ingest URL.'); return }
      setUrlIngest('')
      fetchSources()
    } catch {
      setError('Network error.')
    } finally {
      setIngesting(false)
    }
  }

  const handleUpload = async () => {
    if (!uploadFile || !uploadName.trim()) return
    setUploading(true)
    setError('')
    const formData = new FormData()
    formData.append('file', uploadFile)
    formData.append('source_name', uploadName)
    formData.append('category', ingestCategory)
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

  if (loading) return <p style={{ color: theme.textMuted, fontFamily: "'Outfit', sans-serif" }}>Loading...</p>

  const cardStyle = {
    background: theme.card,
    border: `1px solid ${theme.border}`,
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '20px',
  }

  const inputStyle = {
    flex: 1, minWidth: 200, 
    background: theme.bg, 
    border: `1px solid ${theme.border}`, 
    borderRadius: '8px', 
    padding: '10px 14px', 
    color: theme.text, 
    fontSize: '14px', 
    outline: 'none', 
    fontFamily: "'Outfit', sans-serif"
  }

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", maxWidth: 1200, margin: '0 auto', paddingBottom: 60 }}>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: '28px', fontWeight: 800, color: theme.text, marginBottom: 8 }}>Intelligence Vault</h2>
        <p style={{ color: theme.textMuted, fontSize: '14px' }}>Manage the institutional memory of the Baawa diagnostic engine.</p>
      </div>

      {error && (
        <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171', padding: '14px 20px', borderRadius: '8px', marginBottom: '24px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        {/* ── Full Sync Control ── */}
        <div style={{ ...cardStyle, gridColumn: 'span 2', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: 4 }}>🔄 Full Intelligence Sync</h3>
            <p style={{ color: theme.textMuted, fontSize: '12px', margin: 0 }}>
              {ingestStatus?.running 
                ? `Currently indexing ${ingestStatus.totalActiveChunks} chunks...` 
                : syncMsg || (ingestStatus?.lastRun ? `Last sync: ${new Date(ingestStatus.lastRun).toLocaleString()}` : 'No recent sync history.')
              }
            </p>
          </div>
          <button
            onClick={() => void startSync()}
            disabled={syncing || ingestStatus?.running}
            style={{ 
              background: (syncing || ingestStatus?.running) ? 'transparent' : theme.text, 
              color: (syncing || ingestStatus?.running) ? theme.textMuted : theme.bg, 
              border: (syncing || ingestStatus?.running) ? `1px solid ${theme.border}` : 'none',
              borderRadius: '8px', padding: '10px 24px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' 
            }}
          >
            {syncing || ingestStatus?.running ? 'Syncing...' : 'Start Global Sync'}
          </button>
        </div>

        {/* ── URL Ingestion ── */}
        <div style={cardStyle}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: 12 }}>🌐 Ingest from URL</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="url"
              value={urlIngest}
              onChange={(e) => setUrlIngest(e.target.value)}
              placeholder="https://hbr.org/article-title"
              style={inputStyle}
            />
            <div style={{ display: 'flex', gap: 12 }}>
               <select 
                value={ingestCategory} 
                onChange={(e) => setIngestCategory(e.target.value)}
                style={{ ...inputStyle, flex: 0, minWidth: 140 }}
               >
                 <option value="general">General</option>
                 <option value="article">Article</option>
                 <option value="case-study">Case Study</option>
                 <option value="benchmark">Benchmark</option>
                 <option value="mental-model">Mental Model</option>
               </select>
               <button
                onClick={() => void handleUrlIngest()}
                disabled={ingesting || !urlIngest.trim()}
                style={{ background: '#FF6B35', color: '#000', border: 'none', borderRadius: '8px', padding: '0 20px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', opacity: (ingesting || !urlIngest.trim()) ? 0.5 : 1 }}
              >
                {ingesting ? 'Scanning...' : 'Ingest URL'}
              </button>
            </div>
          </div>
        </div>

        {/* ── File Upload ── */}
        <div style={cardStyle}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: 12 }}>📄 Upload Document</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <input
                type="text"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="Internal Playbook V1"
                style={inputStyle}
              />
              <input
                type="file"
                accept=".md,.pdf"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                id="vault-file-upload"
              />
              <label htmlFor="vault-file-upload" style={{ ...inputStyle, flex: 0, minWidth: 120, cursor: 'pointer', textAlign: 'center', borderColor: uploadFile ? '#FF6B35' : theme.border, color: uploadFile ? '#FF6B35' : theme.text }}>
                {uploadFile ? 'File Selected' : 'Choose File'}
              </label>
            </div>
            <button
              onClick={() => void handleUpload()}
              disabled={uploading || !uploadFile || !uploadName.trim()}
              style={{ background: theme.text, color: theme.bg, border: 'none', borderRadius: '8px', padding: '12px 20px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', opacity: (uploading || !uploadFile || !uploadName.trim()) ? 0.5 : 1 }}
            >
              {uploading ? 'Parsing...' : 'Upload to Vault'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: `1px solid ${theme.border}` }}>
              <th style={{ padding: '16px 24px', textAlign: 'left', color: theme.textMuted, fontSize: '11px', textTransform: 'uppercase' }}>Source Name</th>
              <th style={{ padding: '16px 24px', textAlign: 'left', color: theme.textMuted, fontSize: '11px', textTransform: 'uppercase' }}>Type</th>
              <th style={{ padding: '16px 24px', textAlign: 'left', color: theme.textMuted, fontSize: '11px', textTransform: 'uppercase' }}>Chunks</th>
              <th style={{ padding: '16px 24px', textAlign: 'left', color: theme.textMuted, fontSize: '11px', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '16px 24px', textAlign: 'right', color: theme.textMuted, fontSize: '11px', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.source_name} style={{ borderBottom: `1px solid ${theme.border}` }}>
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: theme.text }}>{s.source_name}</div>
                  <div style={{ fontSize: '11px', color: theme.textMuted }}>{s.created_at ? new Date(s.created_at).toLocaleDateString() : 'Historical'}</div>
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <span style={{ fontSize: '12px', color: theme.text, background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 4 }}>{s.category || 'General'}</span>
                </td>
                <td style={{ padding: '16px 24px', color: theme.text, fontSize: '14px' }}>{s.chunk_count}</td>
                <td style={{ padding: '16px 24px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: s.is_active ? '#4ade80' : theme.textMuted }}>
                    {s.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </td>
                <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button onClick={() => void toggleActive(s.source_name, s.is_active)} style={{ background: 'transparent', border: `1px solid ${theme.border}`, color: theme.text, padding: '4px 12px', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
                      {s.is_active ? 'Disable' : 'Enable'}
                    </button>
                    <button onClick={() => void deleteSource(s.source_name)} style={{ background: 'rgba(248,113,113,0.1)', border: 'none', color: '#f87171', padding: '4px 12px', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
