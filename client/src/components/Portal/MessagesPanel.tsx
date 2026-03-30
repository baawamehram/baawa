import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { type Theme, t } from './usePortalTheme'

export interface PortalMessage {
  id: number
  sender: 'team' | 'prospect'
  body: string
  created_at: string
}

interface MessagesPanelProps {
  messages: PortalMessage[]
  theme: Theme
  onSend: (body: string) => Promise<void>
  sendError: string
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function MessagesPanel({ messages, theme, onSend, sendError }: MessagesPanelProps) {
  const tk = t(theme)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const trimmed = body.trim()
    if (!trimmed || sending) return
    setSending(true)
    try {
      await onSend(trimmed)
      setBody('')
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ background: tk.bg2, border: `1px solid ${tk.border}`, borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%', minHeight: 320 }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${tk.border}` }}>
        <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, fontWeight: 600, color: tk.text }}>Messages</div>
        <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 11, color: tk.textMuted, marginTop: 2 }}>from Baawa team</div>
      </div>

      {/* Thread */}
      <div style={{ flex: 1, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
        {messages.length === 0 && (
          <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: tk.textMuted, margin: 'auto', textAlign: 'center', padding: '20px 0' }}>
            No messages yet — we'll be in touch soon.
          </p>
        )}
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', justifyContent: msg.sender === 'prospect' ? 'flex-end' : 'flex-start' }}
          >
            <div style={{
              maxWidth: '80%',
              background: msg.sender === 'team' ? tk.msgTeamBg : tk.msgProspectBg,
              borderRadius: msg.sender === 'team' ? '10px 10px 10px 2px' : '10px 10px 2px 10px',
              padding: '10px 12px',
            }}>
              {msg.sender === 'team' && (
                <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 10, color: tk.accent, marginBottom: 3 }}>Baawa</div>
              )}
              <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: tk.text, lineHeight: 1.55 }}>{msg.body}</div>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 10, color: tk.textMuted, marginTop: 4 }}>{formatDate(msg.created_at)}</div>
            </div>
          </motion.div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Reply input */}
      {sendError && (
        <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, color: '#ef4444', margin: '0 14px', paddingBottom: 4 }}>{sendError}</p>
      )}
      <div style={{ padding: '10px 12px', borderTop: `1px solid ${tk.border}`, display: 'flex', gap: 8 }}>
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend() } }}
          placeholder="Write a reply…"
          disabled={sending}
          style={{ flex: 1, background: tk.inputBg, border: `1.5px solid ${tk.accentBorder}`, borderRadius: 8, padding: '8px 12px', fontFamily: 'Outfit, sans-serif', fontSize: 13, color: tk.text, outline: 'none', boxSizing: 'border-box' }}
        />
        <button
          onClick={() => void handleSend()}
          disabled={sending || !body.trim()}
          style={{ background: 'linear-gradient(135deg, #064E3B, #059669)', border: 'none', borderRadius: 8, padding: '8px 14px', color: '#fff', fontFamily: 'Outfit, sans-serif', fontSize: 14, fontWeight: 600, cursor: sending || !body.trim() ? 'not-allowed' : 'pointer', opacity: sending || !body.trim() ? 0.5 : 1 }}
        >
          →
        </button>
      </div>
    </div>
  )
}
