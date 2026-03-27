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

  if (loading) return <p className="text-slate-400 font-body">Loading...</p>

  return (
    <div>
      <h2 className="text-2xl font-heading text-white mb-6">Knowledge Base</h2>

      {error && (
        <div className="bg-red-900/30 border border-red-700/50 text-red-400 px-4 py-3 rounded-lg mb-6 font-body text-sm">
          {error}
        </div>
      )}

      {/* Upload */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 mb-6">
        <h3 className="text-sm font-heading text-white mb-4">Upload Source</h3>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-slate-400 font-body text-xs mb-1 block">Source Name</label>
            <input
              type="text"
              value={uploadName}
              onChange={(e) => setUploadName(e.target.value)}
              placeholder="e.g. pricing-guide"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-body text-sm focus:outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="text-slate-400 font-body text-xs mb-1 block">File (.md)</label>
            <input
              type="file"
              accept=".md"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              className="text-slate-400 font-body text-sm file:mr-3 file:bg-slate-800 file:border-0 file:rounded file:px-3 file:py-2 file:text-white file:font-body file:text-sm file:cursor-pointer"
            />
          </div>
          <button
            onClick={handleUpload}
            disabled={uploading || !uploadFile || !uploadName.trim()}
            className="bg-orange-500 hover:bg-orange-600 text-white font-heading text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>

      {/* Sources List */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700 text-left">
              <th className="px-6 py-3 text-slate-400 font-body text-xs uppercase tracking-wider">Source</th>
              <th className="px-6 py-3 text-slate-400 font-body text-xs uppercase tracking-wider">Chunks</th>
              <th className="px-6 py-3 text-slate-400 font-body text-xs uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-slate-400 font-body text-xs uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.source_name} className="border-b border-slate-700/50">
                <td className="px-6 py-4 text-white font-body text-sm">{s.source_name}</td>
                <td className="px-6 py-4 text-slate-400 font-body text-sm">{s.chunk_count}</td>
                <td className="px-6 py-4">
                  <span className={`text-xs font-body ${s.is_active ? 'text-green-400' : 'text-slate-400'}`}>
                    {s.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleActive(s.source_name, s.is_active)}
                      className="text-xs font-body px-2.5 py-1 rounded bg-slate-800 hover:bg-white/10 text-slate-300 transition-colors"
                    >
                      {s.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => deleteSource(s.source_name)}
                      className="text-xs font-body px-2.5 py-1 rounded bg-red-900/30 hover:bg-red-900/50 text-red-400 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {sources.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-400 font-body text-sm">
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
