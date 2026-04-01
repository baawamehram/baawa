import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { portalFetch } from '../../../lib/portalApi'
import { usePortalTheme, t } from '../usePortalTheme'

interface Props {
  on401: () => void
}

interface Message {
  id: number
  sender: 'prospect' | 'founder'
  body: string
  created_at: string
}

export function EngagementsTab({ on401 }: Props) {
  const { theme } = usePortalTheme()
  const tk = t(theme)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadMessages = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await portalFetch('/api/portal/messages', on401)
      if (!res) return
      if (!res.ok) {
        setError('Failed to load messages')
        return
      }
      const data = await res.json() as Message[]
      setMessages(data)
    } catch (err) {
      console.error('Failed to load messages:', err)
      setError('Failed to load messages')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadMessages()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    try {
      setSending(true)
      setError('')
      const res = await portalFetch('/api/portal/messages', on401, {
        method: 'POST',
        body: JSON.stringify({ body: newMessage }),
      })
      if (!res) return
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? 'Failed to send message')
        return
      }
      setMessages(prev => [...prev, {
        id: Date.now(),
        sender: 'prospect',
        body: newMessage,
        created_at: new Date().toISOString(),
      }])
      setNewMessage('')
    } catch (err) {
      console.error('Failed to send message:', err)
      setError('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, color: tk.textMuted }}
      >
        Loading messages…
      </motion.div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 300px)', background: tk.bg2, border: `1px solid ${tk.border}`, borderRadius: 12, overflow: 'hidden' }}>
      {/* Messages Container */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 16, fontWeight: 600, color: tk.text, margin: '0 0 8px' }}>
                No Messages Yet
              </h3>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, color: tk.textMuted, margin: 0 }}>
                Start a conversation with your contact
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
                style={{
                  alignSelf: msg.sender === 'prospect' ? 'flex-end' : 'flex-start',
                  maxWidth: '70%',
                  padding: '10px 14px',
                  background: msg.sender === 'prospect' ? tk.accent : tk.input,
                  color: msg.sender === 'prospect' ? '#000' : tk.text,
                  borderRadius: 8,
                  fontFamily: 'Outfit, sans-serif',
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                <p style={{ margin: 0, wordBreak: 'break-word' }}>{msg.body}</p>
                <p style={{ fontSize: 11, opacity: 0.7, margin: '4px 0 0', textAlign: msg.sender === 'prospect' ? 'right' : 'left' }}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </motion.div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <div style={{ borderTop: `1px solid ${tk.border}`, padding: 16 }}>
        {error && (
          <div style={{
            background: 'rgba(248,113,113,0.1)',
            border: '1px solid rgba(248,113,113,0.3)',
            color: '#f87171',
            padding: '8px 12px',
            borderRadius: 6,
            fontFamily: 'Outfit, sans-serif',
            fontSize: 12,
            marginBottom: 12,
          }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message…"
            disabled={sending}
            style={{
              flex: 1,
              padding: '10px 12px',
              background: tk.input,
              border: `1px solid ${tk.border}`,
              borderRadius: 8,
              fontFamily: 'Outfit, sans-serif',
              fontSize: 13,
              color: tk.text,
              boxSizing: 'border-box',
            }}
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            style={{
              padding: '10px 16px',
              background: tk.accent,
              color: '#000',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontFamily: 'Outfit, sans-serif',
              fontWeight: 600,
              cursor: sending || !newMessage.trim() ? 'not-allowed' : 'pointer',
              opacity: sending || !newMessage.trim() ? 0.5 : 1,
            }}
          >
            {sending ? '…' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  )
}
