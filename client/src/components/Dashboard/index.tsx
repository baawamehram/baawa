import { useState, useCallback } from 'react'
import { LogoDark, LogoIcon } from '../Logo'
import { motion, AnimatePresence } from 'framer-motion'
import { SubmissionList } from './SubmissionList'
import { SubmissionDetail } from './SubmissionDetail'
import { Pipeline } from './Pipeline'
import { ClientDetail } from './ClientDetail'
import { RevenueOverview } from './RevenueOverview'
import { KnowledgeBase } from './KnowledgeBase'
import { Intelligence } from './Intelligence'
import { API_URL } from '../../lib/api'

import { DashboardThemeProvider, useDashboardTheme } from './ThemeContext'

type Section = 'assessments' | 'pipeline' | 'clients' | 'revenue' | 'knowledge' | 'intelligence'

const NAV_ITEMS: { key: Section; label: string }[] = [
  { key: 'assessments', label: 'Assessments' },
  { key: 'pipeline', label: 'Pipeline' },
  { key: 'clients', label: 'Clients' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'knowledge', label: 'Knowledge Base' },
  { key: 'intelligence', label: 'Intelligence' },
]

function PasswordModal({ onAuth }: { onAuth: (token: string) => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const res = await fetch(`${API_URL}/api/assessments`, {
        headers: { Authorization: `Bearer ${password}` },
      })
      if (res.ok) {
        onAuth(password)
      } else {
        setError('Invalid password')
      }
    } catch {
      setError('Could not reach server')
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, fontFamily: "'Outfit', sans-serif" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ background: '#111111', border: '1px solid #333333', borderRadius: '8px', padding: '32px', width: '100%', maxWidth: '420px' }}
      >
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#ffffff', margin: '0 0 8px 0' }}>Dashboard Access</h2>
        <p style={{ color: '#aaaaaa', fontSize: '14px', margin: '0 0 24px 0' }}>Enter your founder API key to continue.</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="api-key-input" style={{ display: 'block', fontSize: '12px', color: '#ffffff', marginBottom: '8px', fontWeight: 500 }}>API Key</label>
          <input
            id="api-key-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your API key"
            style={{ width: '100%', background: '#1a1a1a', border: '1px solid #333333', borderRadius: '6px', padding: '12px 16px', color: '#ffffff', fontSize: '14px', outline: 'none', transition: 'outline 0.2s, border-color 0.2s', marginBottom: '16px', boxSizing: 'border-box', fontFamily: "'Outfit', sans-serif" }}
            onFocus={(e) => {
              e.currentTarget.style.outline = '2px solid #ffffff'
              e.currentTarget.style.outlineOffset = '2px'
              e.currentTarget.style.borderColor = '#666666'
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = 'none'
              e.currentTarget.style.borderColor = '#333333'
            }}
            autoFocus
          />
          {error && <p style={{ color: '#f87171', fontSize: '14px', marginBottom: '16px' }}>{error}</p>}
          <button
            type="submit"
            style={{ width: '100%', background: '#ffffff', color: '#000000', border: 'none', borderRadius: '6px', padding: '12px', fontSize: '16px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}
          >
            Enter Dashboard
          </button>
        </form>
      </motion.div>
    </div>
  )
}

function DashboardContent() {
  const { theme, isDark, toggleTheme } = useDashboardTheme()
  const [token, setToken] = useState<string | null>(null)
  const [section, setSection] = useState<Section>('assessments')
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<number | null>(null)
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const handle401 = useCallback(() => {
    setToken(null)
  }, [])

  if (!token) {
    return <PasswordModal onAuth={setToken} />
  }

  const renderContent = () => {
    if (section === 'assessments') {
      if (selectedAssessmentId !== null) {
        return (
          <SubmissionDetail
            id={selectedAssessmentId}
            token={token}
            on401={handle401}
            onBack={() => setSelectedAssessmentId(null)}
          />
        )
      }
      return (
        <SubmissionList
          token={token}
          on401={handle401}
          onSelect={(id) => setSelectedAssessmentId(id)}
        />
      )
    }
    if (section === 'pipeline' || section === 'clients') {
      if (selectedClientId !== null) {
        return (
          <ClientDetail
            id={selectedClientId}
            token={token}
            on401={handle401}
            onBack={() => setSelectedClientId(null)}
          />
        )
      }
      return (
        <Pipeline
          token={token}
          on401={handle401}
          onSelectClient={(id) => setSelectedClientId(id)}
          onViewAssessment={(id) => {
            setSection('assessments')
            setSelectedAssessmentId(id)
          }}
        />
      )
    }
    if (section === 'revenue') {
      return <RevenueOverview token={token} on401={handle401} />
    }
    if (section === 'knowledge') {
      return <KnowledgeBase token={token} on401={handle401} />
    }
    if (section === 'intelligence') {
      return <Intelligence token={token} on401={handle401} />
    }
    return null
  }

  const handleNavSelect = (key: Section) => {
    setSection(key)
    setSelectedAssessmentId(null)
    setSelectedClientId(null)
    setMobileNavOpen(false)
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: theme.bg, fontFamily: "'Outfit', sans-serif", color: theme.text }}>
      {/* Mobile header bar */}
      <div style={{ display: 'none', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40, alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: theme.sidebar, borderBottom: `1px solid ${theme.border}` }}
        className="mobile-header">
        <LogoIcon height={28} />
        <button
          onClick={() => setMobileNavOpen((o) => !o)}
          style={{ color: theme.textMuted, background: 'none', border: 'none', cursor: 'pointer', fontSize: '24px', lineHeight: 1 }}
          aria-label="Toggle navigation"
          aria-expanded={mobileNavOpen}
        >
          ☰
        </button>
      </div>

      {/* Mobile dropdown nav */}
      {mobileNavOpen && (
        <div style={{ position: 'fixed', top: '48px', left: 0, right: 0, zIndex: 30, background: theme.sidebar, borderBottom: `1px solid ${theme.border}`, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => handleNavSelect(item.key)}
              style={{
                textAlign: 'left',
                padding: '10px 16px',
                borderRadius: '6px',
                fontSize: '14px',
                border: 'none',
                cursor: 'pointer',
                background: section === item.key ? theme.primary : 'transparent',
                color: section === item.key ? theme.primaryText : theme.textMuted,
                fontFamily: "'Outfit', sans-serif",
                fontWeight: section === item.key ? 600 : 400
              }}
            >
              {item.label}
            </button>
          ))}
          <button
            onClick={toggleTheme}
            style={{ textAlign: 'left', padding: '10px 16px', borderRadius: '6px', fontSize: '14px', border: 'none', cursor: 'pointer', background: 'transparent', color: theme.textMuted, fontFamily: "'Outfit', sans-serif", marginTop: '8px', borderTop: `1px solid ${theme.border}` }}
          >
            {isDark ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
        </div>
      )}

      {/* Sidebar — desktop only */}
      <aside style={{ width: '256px', background: theme.sidebar, borderRight: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column', padding: '24px 16px', flexShrink: 0 }}>
        <div style={{ marginBottom: '32px', padding: '0 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {isDark ? <LogoDark height={32} /> : <LogoIcon height={32} />}
          <button
            onClick={toggleTheme}
            style={{ background: theme.input, border: `1px solid ${theme.border}`, cursor: 'pointer', padding: '6px', borderRadius: '6px', color: theme.text, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? '☀️' : '🌙'}
          </button>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => handleNavSelect(item.key)}
              style={{
                textAlign: 'left',
                padding: '10px 16px',
                borderRadius: '6px',
                fontSize: '14px',
                border: 'none',
                cursor: 'pointer',
                background: section === item.key ? theme.primary : 'transparent',
                color: section === item.key ? theme.primaryText : theme.textMuted,
                fontFamily: "'Outfit', sans-serif",
                fontWeight: section === item.key ? 600 : 400,
                transition: 'background 0.2s, color 0.2s'
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
        
        <div style={{ paddingTop: '16px', borderTop: `1px solid ${theme.border}`, color: theme.textMuted, fontSize: '12px', textAlign: 'center' }}>
          Baawa Consultancy CRM v1.1
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '32px', background: theme.bgMain }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${section}-${selectedAssessmentId}-${selectedClientId}-${isDark}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}

export default function Dashboard() {
  return (
    <DashboardThemeProvider>
      <DashboardContent />
    </DashboardThemeProvider>
  )
}
