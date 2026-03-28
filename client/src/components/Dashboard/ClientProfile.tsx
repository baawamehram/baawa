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
  { key: 'founder_name', label: 'Client Name', type: 'text' },
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
    <div style={{ background: '#111111', border: '1px solid #333333', borderRadius: '8px', padding: '24px', fontFamily: "'Outfit', sans-serif" }}>
      <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff', margin: '0 0 16px 0' }}>Client Profile</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label style={{ color: '#aaaaaa', fontSize: '12px', marginBottom: '4px', display: 'block' }}>{f.label}</label>
            <input
              type={f.type}
              value={form[f.key] ?? ''}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value,
                }))
              }
              style={{ width: '100%', background: '#1a1a1a', border: '1px solid #333333', borderRadius: '6px', padding: '8px 12px', color: '#ffffff', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: "'Outfit', sans-serif" }}
            />
          </div>
        ))}
      </div>
      {error && (
        <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', padding: '12px 16px', borderRadius: '6px', marginTop: '16px', fontSize: '14px' }}>
          {error}
        </div>
      )}
      <button
        onClick={handleSave}
        disabled={saving}
        style={{ marginTop: '16px', background: '#ffffff', color: '#000000', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '14px', fontWeight: 600, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.5 : 1, fontFamily: "'Outfit', sans-serif" }}
      >
        {saving ? 'Saving...' : 'Save Profile'}
      </button>
    </div>
  )
}
