import { useState, useEffect, useCallback } from 'react'
import { portalFetch } from '../../lib/portalApi'
import { t } from './usePortalTheme'

interface Deliverable {
  id: number
  title: string
  description: string | null
  content: string | null
  file_url: string | null
  status: 'pending' | 'in_progress' | 'completed'
  milestone_order: number
  accepted_at: string | null
  due_date: string | null
  created_at: string
}

interface Props {
  theme: 'light' | 'dark'
  on401: () => void
}

const STATUS_COLOR = {
  pending: '#555',
  in_progress: '#A78BFA',
  completed: '#4ade80',
}

export function PortalDeliverables({ theme, on401 }: Props) {
  const tk = t(theme)
  const [deliverables, setDeliverables] = useState<Deliverable[] | null>(null)
  const [accepting, setAccepting] = useState<number | null>(null)
  const [expanded, setExpanded] = useState<number[]>([])

  const load = useCallback(async () => {
    const res = await portalFetch('/api/portal/deliverables', on401)
    if (!res || !res.ok) { setDeliverables([]); return }
    setDeliverables(await res.json())
  }, [on401])

  useEffect(() => { void load() }, [load])

  const accept = async (id: number) => {
    setAccepting(id)
    const res = await portalFetch(`/api/portal/deliverables/${id}/accept`, on401, { method: 'POST' })
    if (res?.ok) void load()
    setAccepting(null)
  }

  const toggleExpand = (id: number) => setExpanded(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  )

  if (!deliverables) return <p style={{ color: tk.textMuted, fontFamily: 'Outfit,sans-serif', fontSize: 14 }}>Loading…</p>

  if (deliverables.length === 0) {
    return (
      <div style={{ background: tk.bg2, border: `1px solid ${tk.border}`, borderRadius: 10, padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>📦</div>
        <h3 style={{ fontFamily: 'Outfit,sans-serif', color: tk.text, fontSize: 16, margin: '0 0 8px' }}>No deliverables yet</h3>
        <p style={{ fontFamily: 'Outfit,sans-serif', color: tk.textMuted, fontSize: 13, margin: 0, lineHeight: 1.6 }}>
          Once your engagement agreement is signed and work begins, deliverables will appear here for your review.
        </p>
      </div>
    )
  }

  // Group by milestone
  const milestones = [...new Set(deliverables.map(d => d.milestone_order))].sort((a, b) => a - b)

  // A milestone is unlocked if the previous one is fully accepted
  const isUnlocked = (milestoneOrder: number) => {
    if (milestoneOrder === milestones[0]) return true
    const prevMilestone = milestones[milestones.indexOf(milestoneOrder) - 1]
    const prevItems = deliverables.filter(d => d.milestone_order === prevMilestone)
    return prevItems.length > 0 && prevItems.every(d => d.accepted_at !== null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Visual milestone timeline */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 4 }}>
        {milestones.map((m, i) => {
          const items = deliverables.filter(d => d.milestone_order === m)
          const allAccepted = items.every(d => d.accepted_at)
          const unlocked = isUnlocked(m)
          return (
            <div key={m} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: allAccepted ? '#4ade80' : unlocked ? tk.accent : tk.border,
                  fontSize: 12, fontWeight: 700, color: allAccepted || unlocked ? '#000' : tk.textMuted,
                  border: `2px solid ${allAccepted ? '#4ade80' : unlocked ? tk.accent : tk.border}`,
                }}>
                  {allAccepted ? '✓' : m}
                </div>
                <span style={{ fontFamily: 'Outfit,sans-serif', fontSize: 10, color: unlocked ? tk.text : tk.textMuted, whiteSpace: 'nowrap' }}>
                  Phase {m}
                </span>
              </div>
              {i < milestones.length - 1 && (
                <div style={{ flex: 1, height: 2, background: allAccepted ? '#4ade80' : tk.border, marginBottom: 16 }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Milestone sections */}
      {milestones.map(m => {
        const items = deliverables.filter(d => d.milestone_order === m)
        const unlocked = isUnlocked(m)
        return (
          <div key={m}>
            <div style={{ fontFamily: 'Outfit,sans-serif', fontSize: 11, color: unlocked ? tk.accent : tk.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
              Phase {m} {!unlocked && '🔒'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, opacity: unlocked ? 1 : 0.4, pointerEvents: unlocked ? 'auto' : 'none' }}>
              {items.map(d => (
                <div key={d.id} style={{ background: tk.bg2, border: `1px solid ${d.accepted_at ? 'rgba(74,222,128,0.3)' : tk.border}`, borderRadius: 8, overflow: 'hidden' }}>
                  {/* Header */}
                  <div
                    onClick={() => toggleExpand(d.id)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 14, color: STATUS_COLOR[d.status] }}>
                        {d.accepted_at ? '✅' : d.status === 'completed' ? '🔵' : d.status === 'in_progress' ? '🟡' : '⬜'}
                      </span>
                      <span style={{ fontFamily: 'Outfit,sans-serif', fontSize: 14, color: tk.text, fontWeight: 600 }}>{d.title}</span>
                    </div>
                    <span style={{ fontFamily: 'Outfit,sans-serif', fontSize: 11, color: tk.accent }}>
                      {expanded.includes(d.id) ? '▲' : '▼'}
                    </span>
                  </div>

                  {/* Expanded content */}
                  {expanded.includes(d.id) && (
                    <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${tk.border}`, paddingTop: 12 }}>
                      {d.description && (
                        <p style={{ fontFamily: 'Outfit,sans-serif', fontSize: 13, color: tk.textMuted, margin: '0 0 12px', lineHeight: 1.65 }}>{d.description}</p>
                      )}
                      {d.content && (
                        <div style={{ background: tk.bg, border: `1px solid ${tk.border}`, borderRadius: 6, padding: '12px 14px', fontFamily: 'Outfit,sans-serif', fontSize: 13, color: tk.text, lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: 12 }}>
                          {d.content}
                        </div>
                      )}
                      {d.file_url && (
                        <a href={`/api/portal/deliverables/${d.id}/file`} target="_blank" rel="noopener noreferrer"
                          style={{ display: 'inline-block', background: tk.bg, border: `1px solid ${tk.border}`, borderRadius: 6, padding: '6px 12px', fontFamily: 'Outfit,sans-serif', fontSize: 12, color: tk.accent, textDecoration: 'none', marginBottom: 12 }}>
                          📎 Download Attachment
                        </a>
                      )}
                      {!d.accepted_at && d.status === 'completed' && (
                        <button
                          onClick={() => void accept(d.id)}
                          disabled={accepting === d.id}
                          style={{ background: '#4ade80', color: '#000', border: 'none', borderRadius: 6, padding: '10px 20px', fontFamily: 'Outfit,sans-serif', fontSize: 13, fontWeight: 700, cursor: accepting === d.id ? 'default' : 'pointer', opacity: accepting === d.id ? 0.6 : 1 }}
                        >
                          {accepting === d.id ? 'Confirming…' : '✓ Accept & Approve This Deliverable'}
                        </button>
                      )}
                      {d.accepted_at && (
                        <div style={{ fontFamily: 'Outfit,sans-serif', fontSize: 12, color: '#4ade80' }}>
                          ✅ Accepted on {new Date(d.accepted_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
