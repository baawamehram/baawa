import { useState, useEffect, useCallback } from 'react'
import { portalFetch } from '../../lib/portalApi'
import { t } from './usePortalTheme'

interface CallSlot {
  id: number
  proposed_slots: { datetime: string; label: string }[]
  selected_slot: string | null
  meeting_link: string | null
  status: 'pending' | 'confirmed' | 'completed'
}

interface Props {
  theme: 'light' | 'dark'
  on401: () => void
}

export function PortalCall({ theme, on401 }: Props) {
  const tk = t(theme)
  const [call, setCall] = useState<CallSlot | null | undefined>(undefined)
  const [booking, setBooking] = useState(false)
  const [booked, setBooked] = useState(false)

  const load = useCallback(async () => {
    const res = await portalFetch('/api/portal/call', on401)
    if (!res || !res.ok) { setCall(null); return }
    const data = await res.json()
    setCall(data)
    if (data?.selected_slot) setBooked(true)
  }, [on401])

  useEffect(() => { void load() }, [load])

  const selectSlot = async (datetime: string) => {
    if (!call || booking) return
    setBooking(true)
    const res = await portalFetch(`/api/portal/call/${call.id}/select`, on401, {
      method: 'PUT',
      body: JSON.stringify({ datetime }),
    })
    if (res?.ok) { setBooked(true); void load() }
    setBooking(false)
  }

  const card = { background: tk.bg2, border: `1px solid ${tk.border}`, borderRadius: 10, padding: 20 }

  if (call === undefined) return <p style={{ color: tk.textMuted, fontFamily: 'Outfit,sans-serif', fontSize: 14 }}>Loading…</p>

  if (!call) {
    return (
      <div style={card}>
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📅</div>
          <h3 style={{ fontFamily: 'Outfit,sans-serif', color: tk.text, fontSize: 16, margin: '0 0 8px' }}>No call scheduled yet</h3>
          <p style={{ fontFamily: 'Outfit,sans-serif', color: tk.textMuted, fontSize: 13, margin: 0, lineHeight: 1.6 }}>
            Once our team reviews your assessment, we'll send you availability to book a strategy call.
          </p>
        </div>
      </div>
    )
  }

  if (booked || call.status === 'confirmed' || call.status === 'completed') {
    const selected = call.selected_slot
    return (
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 22 }}>✅</span>
          <div>
            <div style={{ fontFamily: 'Outfit,sans-serif', fontSize: 15, fontWeight: 700, color: tk.accent }}>Call Confirmed</div>
            {selected && (
              <div style={{ fontFamily: 'Outfit,sans-serif', fontSize: 13, color: tk.textMuted }}>
                {new Date(selected).toLocaleString(undefined, { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
        </div>
        {call.meeting_link && (
          <a href={call.meeting_link} target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-block', background: tk.accent, color: '#000', borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 700, fontFamily: 'Outfit,sans-serif', textDecoration: 'none' }}>
            Join Meeting →
          </a>
        )}
      </div>
    )
  }

  // Show slot picker
  return (
    <div style={card}>
      <div style={{ fontFamily: 'Outfit,sans-serif', fontSize: 11, color: tk.accent, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Book Your Strategy Call</div>
      <p style={{ fontFamily: 'Outfit,sans-serif', fontSize: 13, color: tk.textMuted, margin: '0 0 16px', lineHeight: 1.6 }}>
        Pick a time that works for you. This call will help us tailor your strategy before we present pricing.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {call.proposed_slots.map(slot => (
          <button
            key={slot.datetime}
            onClick={() => void selectSlot(slot.datetime)}
            disabled={booking}
            style={{
              background: tk.accent, color: '#000', border: 'none', borderRadius: 8, padding: '12px 16px',
              fontFamily: 'Outfit,sans-serif', fontSize: 14, fontWeight: 600, cursor: booking ? 'default' : 'pointer',
              opacity: booking ? 0.6 : 1, textAlign: 'left',
            }}
          >
            {slot.label || new Date(slot.datetime).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </button>
        ))}
      </div>
    </div>
  )
}
