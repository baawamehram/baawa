import { useState, useEffect } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

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

  const fetchSources = () => {
    fetch(`${API_URL}/api/knowledge`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.status === 401) { on401(); return null }
        return res.json()
      })
      .then((data) => {
        if (data) setSources(data)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchSources() }, [token, on401])

  const toggleActive = async (sourceName: string, isActive: boolean) => {
    const res = await fetch(`${API_URL}/api/knowledge/${encodeURIComponent(sourceName)}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !isActive }),
    })
    if (res.status === 401) { on401(); return }
    if (res.ok) fetchSources()
  }

  const deleteSource = async (sourceName: string) => {
    const res = await fetch(`${API_URL}/api/knowledge/${encodeURIComponent(sourceName)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.status === 401) { on401(); return }
    if (res.ok) fetchSources()
  }

  const handleUpload = async () => {
    if (!uploadFile || !uploadName.trim()) return
    setUploading(true)
    const formData = new FormData()
    formData.append('file', uploadFile)
    formData.append('source_name', uploadName)
    const res = await fetch(`${API_URL}/api/knowledge`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
    if (res.status === 401) { on401(); return }
    setUploading(false)
    if (res.ok) {
      setUploadName('')
      setUploadFile(null)
      fetchSources()
    }
  }

  if (loading) return <p className="text-gray-400 font-body">Loading...</p>

  return (
    <div>
      <h2 className="text-2xl font-heading text-white mb-6">Knowledge Base</h2>

      {/* Upload */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <h3 className="text-sm font-heading text-white mb-4">Upload Source</h3>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-gray-400 font-body text-xs mb-1 block">Source Name</label>
            <input
              type="text"
              value={uploadName}
              onChange={(e) => setUploadName(e.target.value)}
              placeholder="e.g. pricing-guide"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white font-body text-sm focus:outline-none focus:border-brand-indigo"
            />
          </div>
          <div>
            <label className="text-gray-400 font-body text-xs mb-1 block">File (.md)</label>
            <input
              type="file"
              accept=".md"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              className="text-gray-400 font-body text-sm file:mr-3 file:bg-gray-700 file:border-0 file:rounded file:px-3 file:py-2 file:text-white file:font-body file:text-sm file:cursor-pointer"
            />
          </div>
          <button
            onClick={handleUpload}
            disabled={uploading || !uploadFile || !uploadName.trim()}
            className="bg-brand-indigo hover:bg-brand-violet text-white font-heading text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>

      {/* Sources List */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800 text-left">
              <th className="px-6 py-3 text-gray-400 font-body text-xs uppercase tracking-wider">Source</th>
              <th className="px-6 py-3 text-gray-400 font-body text-xs uppercase tracking-wider">Chunks</th>
              <th className="px-6 py-3 text-gray-400 font-body text-xs uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-gray-400 font-body text-xs uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.source_name} className="border-b border-gray-800/50">
                <td className="px-6 py-4 text-white font-body text-sm">{s.source_name}</td>
                <td className="px-6 py-4 text-gray-400 font-body text-sm">{s.chunk_count}</td>
                <td className="px-6 py-4">
                  <span className={`text-xs font-body ${s.is_active ? 'text-green-400' : 'text-gray-500'}`}>
                    {s.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleActive(s.source_name, s.is_active)}
                      className="text-xs font-body px-2.5 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
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
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500 font-body text-sm">
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
