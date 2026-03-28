import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { API_URL, authFetch } from '../../lib/api'
import { useDashboardTheme } from './ThemeContext'

interface Suggestion {
  type: 'lead' | 'work' | 'system'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  action_label: string
  link: string
}

interface Props {
  token: string
  on401: () => void
  onNavigate: (view: string, id?: number) => void
}

export function CommandCenter({ token, on401, onNavigate }: Props) {
  const { theme } = useDashboardTheme()
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSuggestions = useCallback(async () => {
    try {
      const res = await authFetch(`${API_URL}/api/journey/suggestions`, token, on401)
      if (res?.ok) {
        setSuggestions(await res.json())
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [token, on401])

  useEffect(() => { void fetchSuggestions() }, [fetchSuggestions])

  const typeIcon = (type: Suggestion['type']) => {
    switch (type) {
      case 'lead': return '👤'
      case 'work': return '🏗️'
      case 'system': return '⚙️'
    }
  }

  const priorityColor = (priority: Suggestion['priority']) => {
    switch (priority) {
      case 'high': return '#f87171'
      case 'medium': return '#fbbf24'
      case 'low': return '#4ade80'
    }
  }

  if (loading) return <p style={{ color: theme.textMuted, fontFamily: "'Outfit', sans-serif", padding: '24px' }}>Analyzing CRM data...</p>

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: theme.text, margin: 0 }}>Command Center</h2>
          <p style={{ fontSize: '14px', color: theme.textMuted, margin: '4px 0 0' }}>Resident Agent: Active & Analyzing</p>
        </div>
        <button
          onClick={() => { setLoading(true); void fetchSuggestions(); }}
          style={{ background: theme.bg, border: `1px solid ${theme.border}`, color: theme.text, padding: '8px 16px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}
        >
          ↻ Refresh Analysis
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        <AnimatePresence>
          {suggestions.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              style={{
                background: theme.card,
                border: `1px solid ${theme.border}`,
                borderRadius: '12px',
                padding: '24px',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '4px',
                  height: '100%',
                  background: priorityColor(s.priority)
                }}
              />
              
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '18px' }}>{typeIcon(s.type)}</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: theme.textMuted }}>
                    {s.type} · {s.priority} priority
                  </span>
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: theme.text, margin: '0 0 8px 0', lineHeight: 1.4 }}>{s.title}</h3>
                <p style={{ fontSize: '13.5px', color: theme.textMuted, lineHeight: 1.5, margin: '0 0 20px 0' }}>{s.description}</p>
              </div>

              <button
                onClick={() => {
                  // Basic router logic for the dash
                  if (s.link.startsWith('/assessments/')) {
                    onNavigate('submissions', parseInt(s.link.split('/')[2]))
                  } else if (s.link === '/clients') {
                    onNavigate('pipeline')
                  } else if (s.link === '/intelligence') {
                    onNavigate('intelligence')
                  }
                }}
                style={{
                  width: '100%',
                  background: theme.text,
                  color: theme.bg,
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: "'Outfit', sans-serif"
                }}
              >
                {s.action_label}
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {suggestions.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', background: theme.card, border: `1px solid ${theme.border}`, borderRadius: '12px' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🛡️</div>
            <h3 style={{ color: theme.text, fontSize: '18px', fontWeight: 600, margin: '0 0 8px 0' }}>All Clear</h3>
            <p style={{ color: theme.textMuted, fontSize: '14px', margin: 0 }}>The resident agent hasn't found any immediate action items or system optimizations.</p>
          </div>
        )}
      </div>
    </div>
  )
}
