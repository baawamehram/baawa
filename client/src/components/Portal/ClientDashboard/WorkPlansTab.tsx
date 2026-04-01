import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { portalFetch } from '../../../lib/portalApi'
import { usePortalTheme, t } from '../usePortalTheme'

interface Props {
  on401: () => void
}

interface Deliverable {
  id: number
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed'
  due_date: string
  milestone_order: number
  content: string | null
  file_url: string | null
  accepted_at: string | null
}

export function WorkPlansTab({ on401 }: Props) {
  const { theme } = usePortalTheme()
  const tk = t(theme)
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadDeliverables = async () => {
      try {
        setLoading(true)
        setError('')
        const res = await portalFetch('/api/portal/deliverables', on401)
        if (!res) return
        if (!res.ok) {
          setError('Failed to load work plans')
          return
        }
        const data = await res.json() as Deliverable[]
        setDeliverables(data)
      } catch (err) {
        console.error('Failed to load deliverables:', err)
        setError('Failed to load work plans')
      } finally {
        setLoading(false)
      }
    }
    void loadDeliverables()
  }, [on401])

  const handleAcceptDeliverable = async (id: number) => {
    try {
      const res = await portalFetch(`/api/portal/deliverables/${id}/accept`, on401, {
        method: 'POST',
      })
      if (res?.ok) {
        setDeliverables(prev => prev.map(d => d.id === id ? { ...d, accepted_at: new Date().toISOString() } : d))
      }
    } catch (err) {
      console.error('Failed to accept deliverable:', err)
    }
  }

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, color: tk.textMuted }}
      >
        Loading work plans…
      </motion.div>
    )
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          background: 'rgba(248,113,113,0.1)',
          border: '1px solid rgba(248,113,113,0.3)',
          color: '#f87171',
          padding: '16px 20px',
          borderRadius: 8,
          fontFamily: 'Outfit, sans-serif',
          fontSize: 14,
        }}
      >
        {error}
      </motion.div>
    )
  }

  if (deliverables.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: tk.bg2,
          border: `1px solid ${tk.border}`,
          borderRadius: 12,
          padding: 32,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
        <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 16, fontWeight: 600, color: tk.text, margin: '0 0 8px' }}>
          No Work Plans Yet
        </h3>
        <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, color: tk.textMuted, margin: 0 }}>
          Work plans will appear here once your engagement begins.
        </p>
      </motion.div>
    )
  }

  const statusColors = {
    pending: tk.textMuted,
    in_progress: tk.accent,
    completed: '#10b981',
  }

  const statusBgColors = {
    pending: `${tk.textMuted}20`,
    in_progress: `${tk.accent}20`,
    completed: '#10b98120',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {deliverables.map((deliverable, idx) => (
        <motion.div
          key={deliverable.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05 }}
          style={{
            background: tk.bg2,
            border: `1px solid ${tk.border}`,
            borderRadius: 12,
            padding: 20,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, fontWeight: 600, color: tk.text, margin: '0 0 4px' }}>
                {deliverable.title}
              </h4>
              {deliverable.description && (
                <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, color: tk.textMuted, margin: 0 }}>
                  {deliverable.description}
                </p>
              )}
            </div>
            <div
              style={{
                padding: '4px 12px',
                background: statusBgColors[deliverable.status as keyof typeof statusBgColors],
                color: statusColors[deliverable.status as keyof typeof statusColors],
                borderRadius: 6,
                fontSize: 11,
                fontFamily: 'Outfit, sans-serif',
                fontWeight: 600,
                textTransform: 'capitalize',
                whiteSpace: 'nowrap',
                marginLeft: 12,
              }}
            >
              {deliverable.status.replace('_', ' ')}
            </div>
          </div>

          {deliverable.content && (
            <div style={{
              background: tk.input,
              borderRadius: 8,
              padding: 12,
              marginBottom: 12,
              fontFamily: 'Outfit, sans-serif',
              fontSize: 13,
              color: tk.text,
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {deliverable.content}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              {deliverable.due_date && (
                <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, color: tk.textMuted, margin: '0 0 4px' }}>
                  Due: {new Date(deliverable.due_date).toLocaleDateString()}
                </p>
              )}
              {deliverable.accepted_at && (
                <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, color: '#10b981', margin: 0 }}>
                  ✓ Accepted on {new Date(deliverable.accepted_at).toLocaleDateString()}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {deliverable.file_url && (
                <a
                  href={deliverable.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '6px 12px',
                    background: tk.accent,
                    color: '#000',
                    borderRadius: 6,
                    fontSize: 12,
                    fontFamily: 'Outfit, sans-serif',
                    fontWeight: 600,
                    textDecoration: 'none',
                    cursor: 'pointer',
                    border: 'none',
                  }}
                >
                  Download
                </a>
              )}
              {!deliverable.accepted_at && deliverable.status !== 'pending' && (
                <button
                  onClick={() => handleAcceptDeliverable(deliverable.id)}
                  style={{
                    padding: '6px 12px',
                    background: tk.accent,
                    color: '#000',
                    borderRadius: 6,
                    fontSize: 12,
                    fontFamily: 'Outfit, sans-serif',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Accept
                </button>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
