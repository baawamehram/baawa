import { useState } from 'react'
import { API_URL, authFetch } from '../../lib/api'

interface ClientData {
  id: number
  founder_name: string
  company_name: string
  email: string
  phone: string
  website: string
  start_date: string
  phase1_fee: number
  phase2_monthly_fee: number
}

interface Props {
  client: ClientData
  token: string
  on401: () => void
  onUpdate: () => void
}

const FIELDS: { key: keyof ClientData; label: string; type: string }[] = [
  { key: 'founder_name', label: 'Founder Name', type: 'text' },
  { key: 'company_name', label: 'Company', type: 'text' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'website', label: 'Website', type: 'url' },
  { key: 'phone', label: 'Phone', type: 'tel' },
  { key: 'start_date', label: 'Start Date', type: 'date' },
  { key: 'phase1_fee', label: 'Phase 1 Fee', type: 'number' },
  { key: 'phase2_monthly_fee', label: 'Phase 2 Monthly Fee', type: 'number' },
]

export function ClientProfile({ client, token, on401, onUpdate }: Props) {
  const [form, setForm] = useState<Record<string, string | number>>(() => {
    const initial: Record<string, string | number> = {}
    for (const f of FIELDS) {
      initial[f.key] = client[f.key] ?? ''
    }
    return initial
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await authFetch(`${API_URL}/api/clients/${client.id}`, token, on401, {
        method: 'PUT',
        body: JSON.stringify(form),
      })
      if (!res) return
      if (!res.ok) {
        setError('Something went wrong. Please try again.')
        return
      }
      onUpdate()
    } catch {
      setError('Network error. Please check your connection.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-surface border border-border-subtle rounded-xl p-6">
      <h3 className="text-lg font-heading text-white mb-4">Client Profile</h3>
      <div className="grid grid-cols-2 gap-4">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className="text-gray-400 font-body text-xs mb-1 block">{f.label}</label>
            <input
              type={f.type}
              value={form[f.key] ?? ''}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value,
                }))
              }
              className="w-full bg-surface-2 border border-border-subtle rounded-lg px-3 py-2 text-white font-body text-sm focus:outline-none focus:border-brand-indigo"
            />
          </div>
        ))}
      </div>
      {error && (
        <div className="bg-red-900/30 border border-red-700/50 text-red-400 px-4 py-3 rounded-lg mt-4 font-body text-sm">
          {error}
        </div>
      )}
      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-4 bg-brand-indigo hover:bg-brand-violet text-white font-heading text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Profile'}
      </button>
    </div>
  )
}
