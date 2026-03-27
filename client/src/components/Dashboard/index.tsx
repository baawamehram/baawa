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
    <div style={{ position: 'fixed', inset: 0, background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, fontFamily: "'Outfit', sans-serif" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ background: '#111111', border: '1px solid #333333', borderRadius: '8px', padding: '32px', width: '100%', maxWidth: '420px' }}
      >
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#ffffff', margin: '0 0 8px 0' }}>Dashboard Access</h2>
        <p style={{ color: '#aaaaaa', fontSize: '14px', margin: '0 0 24px 0' }}>Enter your founder API key to continue.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="API Key"
            style={{ width: '100%', background: '#1a1a1a', border: '1px solid #333333', borderRadius: '6px', padding: '12px 16px', color: '#ffffff', fontSize: '14px', outline: 'none', marginBottom: '16px', boxSizing: 'border-box', fontFamily: "'Outfit', sans-serif" }}
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

export default function Dashboard() {
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
    if (section === 'pipeline') {
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
        />
      )
    }
    if (section === 'clients') {
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
    <div style={{ display: 'flex', height: '100vh', background: '#000000', fontFamily: "'Outfit', sans-serif" }}>
      {/* Mobile header bar */}
      <div style={{ display: 'none', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40, alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#000000', borderBottom: '1px solid #333333' }}
        className="mobile-header">
        <LogoIcon height={28} />
        <button
          onClick={() => setMobileNavOpen((o) => !o)}
          style={{ color: '#aaaaaa', background: 'none', border: 'none', cursor: 'pointer', fontSize: '24px', lineHeight: 1 }}
          aria-label="Toggle navigation"
          aria-expanded={mobileNavOpen}
        >
          ☰
        </button>
      </div>

      {/* Mobile dropdown nav */}
      {mobileNavOpen && (
        <div style={{ position: 'fixed', top: '48px', left: 0, right: 0, zIndex: 30, background: '#111111', borderBottom: '1px solid #333333', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
                background: section === item.key ? '#ffffff' : 'transparent',
                color: section === item.key ? '#000000' : '#aaaaaa',
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* Sidebar — desktop only */}
      <aside style={{ width: '256px', background: '#111111', borderRight: '1px solid #333333', display: 'flex', flexDirection: 'column', padding: '24px 16px', flexShrink: 0 }}>
        <div style={{ marginBottom: '32px', padding: '0 8px' }}>
          <LogoDark height={32} />
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
                background: section === item.key ? '#ffffff' : 'transparent',
                color: section === item.key ? '#000000' : '#aaaaaa',
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '32px', background: '#000000' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${section}-${selectedAssessmentId}-${selectedClientId}`}
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
