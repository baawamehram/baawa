import { useState, useEffect, useCallback, useRef } from 'react'
import { useDashboardTheme } from '../ThemeContext'
import { API_URL, authFetch } from '../../../lib/api'

interface EngagementsTabProps {
  clientId: number
  isAdmin: boolean
  onClose?: () => void
  isLoading?: boolean
  error?: string | null
  token?: string
  on401?: () => void
}

interface PortalMessage {
  id: number
  sender: 'team' | 'prospect'
  body: string
  created_at: string
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function EngagementsTab({
  clientId,
  isAdmin,
  token = '',
  on401 = () => {},
}: EngagementsTabProps) {
  const { theme } = useDashboardTheme()
  const [messages, setMessages] = useState<PortalMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const [assessmentId, setAssessmentId] = useState<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const stableOn401 = useCallback(on401, [on401])

  // Fetch client data to get assessment ID
  const fetchClientData = useCallback(async () => {
    if (!token || !isAdmin) return
    try {
      const res = await authFetch(`${API_URL}/api/clients/${clientId}`, token, stableOn401)
      if (!res || !res.ok) {
        console.error('Failed to fetch client')
        return
      }
      const data = await res.json()
      if (data.assessment_id) {
        setAssessmentId(data.assessment_id)
      }
    } catch (err) {
      console.error('Error fetching client:', err)
    }
  }, [clientId, token, stableOn401, isAdmin])

  // Fetch message history
  const fetchMessages = useCallback(async () => {
    if (!token) return

    try {
      setLoading(true)
      setError('')

      let endpoint: string
      if (isAdmin && assessmentId) {
        endpoint = `${API_URL}/api/assessments/${assessmentId}/messages`
      } else if (!isAdmin) {
        endpoint = `${API_URL}/api/portal/messages`
      } else {
        return
      }

      const res = await authFetch(endpoint, token, stableOn401)
      if (!res || !res.ok) {
        if (res?.status === 401) {
          stableOn401()
          return
        }
        throw new Error('Failed to fetch messages')
      }

      const data: PortalMessage[] = await res.json()
      setMessages(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error fetching messages:', err)
      setError('Failed to load messages')
    } finally {
      setLoading(false)
    }
  }, [token, isAdmin, assessmentId, stableOn401])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Initial load
  useEffect(() => {
    if (isAdmin) {
      fetchClientData()
    }
  }, [isAdmin, fetchClientData])

  // Fetch messages when assessment ID is ready
  useEffect(() => {
    if (isAdmin && !assessmentId) return
    fetchMessages()
  }, [isAdmin, assessmentId, fetchMessages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageText.trim() || !token) return

    setSending(true)
    try {
      let endpoint: string
      let method = 'POST'

      if (isAdmin && assessmentId) {
        endpoint = `${API_URL}/api/assessments/${assessmentId}/message`
      } else if (!isAdmin) {
        endpoint = `${API_URL}/api/portal/messages`
      } else {
        throw new Error('Unable to determine message endpoint')
      }

      const res = await authFetch(
        endpoint,
        token,
        stableOn401,
        {
          method,
          body: JSON.stringify({ body: messageText }),
        }
      )

      if (!res || !res.ok) {
        if (res?.status === 401) {
          stableOn401()
          return
        }
        throw new Error('Failed to send message')
      }

      // Clear input and refresh messages
      setMessageText('')
      await fetchMessages()
    } catch (err) {
      console.error('Error sending message:', err)
      setError('Failed to send message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div style={{ fontFamily: "'Outfit', sans-serif", color: theme.text }}>
        <h3 style={{ fontSize: '20px', fontWeight: 600, color: theme.text, margin: '0 0 16px 0', letterSpacing: '0.05em' }}>ENGAGEMENTS</h3>
        <div style={{ padding: '24px', background: theme.card, borderRadius: '8px', border: `1px solid ${theme.border}` }}>
          Loading messages...
        </div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif" }}>
      <h3 style={{ fontSize: '20px', fontWeight: 600, color: theme.text, margin: '0 0 16px 0', letterSpacing: '0.05em' }}>ENGAGEMENTS</h3>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '600px',
        background: theme.card,
        borderRadius: '8px',
        border: `1px solid ${theme.border}`,
        overflow: 'hidden',
      }}>
        {/* Message Thread */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          {messages.length === 0 ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: theme.textMuted,
              fontSize: '14px',
            }}>
              No messages yet. Start a conversation!
            </div>
          ) : (
            messages.map((msg) => {
              const isAdmin_ = msg.sender === 'team'
              const isCurrentUserAdmin = isAdmin
              const isFromCurrentUser = isAdmin_ === isCurrentUserAdmin

              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    justifyContent: isFromCurrentUser ? 'flex-end' : 'flex-start',
                    marginBottom: '4px',
                  }}
                >
                  <div style={{
                    maxWidth: '70%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: isFromCurrentUser
                      ? theme.accent
                      : theme.accentTintBg,
                    border: isFromCurrentUser
                      ? `1px solid ${theme.accent}`
                      : `1px solid ${theme.accentTintBorder}`,
                    color: isFromCurrentUser ? '#ffffff' : theme.text,
                  }}>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: 500,
                      marginBottom: '6px',
                      opacity: 0.9,
                    }}>
                      {isFromCurrentUser ? 'You' : isAdmin_ ? 'Team' : 'Prospect'}
                    </div>
                    <div style={{
                      fontSize: '14px',
                      lineHeight: '1.4',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      marginBottom: '6px',
                    }}>
                      {msg.body}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      opacity: 0.7,
                    }}>
                      {formatRelativeTime(msg.created_at)}
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Error banner */}
        {error && (
          <div style={{
            padding: '12px 20px',
            background: theme.statusError,
            color: '#ffffff',
            fontSize: '13px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span>{error}</span>
            <button
              onClick={() => setError('')}
              style={{
                background: 'none',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                fontSize: '16px',
                padding: '0 4px',
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* Message Input */}
        <form
          onSubmit={handleSendMessage}
          style={{
            display: 'flex',
            gap: '10px',
            padding: '16px 20px',
            borderTop: `1px solid ${theme.border}`,
            background: theme.card,
          }}
        >
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type your message..."
            disabled={sending}
            style={{
              flex: 1,
              padding: '10px 14px',
              border: `1px solid ${theme.border}`,
              borderRadius: '6px',
              background: theme.input,
              color: theme.text,
              fontSize: '14px',
              fontFamily: "'Outfit', sans-serif",
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = theme.accent
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = theme.border
            }}
          />
          <button
            type="submit"
            disabled={sending || !messageText.trim()}
            style={{
              padding: '10px 20px',
              background: messageText.trim() && !sending ? theme.accent : theme.textMuted,
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: messageText.trim() && !sending ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: 500,
              fontFamily: "'Outfit', sans-serif",
              transition: 'background-color 0.2s',
              opacity: sending || !messageText.trim() ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (messageText.trim() && !sending) {
                e.currentTarget.style.background = theme.accentHover
              }
            }}
            onMouseLeave={(e) => {
              if (messageText.trim() && !sending) {
                e.currentTarget.style.background = theme.accent
              }
            }}
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  )
}
