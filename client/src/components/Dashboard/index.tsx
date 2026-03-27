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
    <div className="fixed inset-0 bg-slate-950 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-900 border border-orange-500/20 rounded-2xl p-8 w-full max-w-md"
      >
        <h2 className="text-2xl font-heading text-white mb-2">Dashboard Access</h2>
        <p className="text-slate-400 mb-6 font-body text-sm">Enter your founder API key to continue.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="API Key"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white font-body focus:outline-none focus:border-orange-500 mb-4"
            autoFocus
          />
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          <button
            type="submit"
            className="w-full bg-orange-500 hover:bg-orange-600 transition-colors text-white font-heading py-3 rounded-lg"
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
    <div className="flex h-screen bg-slate-950">
      {/* Mobile header bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-700">
        <LogoIcon height={28} />
        <button
          onClick={() => setMobileNavOpen((o) => !o)}
          className="text-slate-400 hover:text-white text-2xl leading-none"
          aria-label="Toggle navigation"
          aria-expanded={mobileNavOpen}
        >
          ☰
        </button>
      </div>

      {/* Mobile dropdown nav */}
      {mobileNavOpen && (
        <div className="md:hidden fixed top-12 left-0 right-0 z-30 bg-slate-900 border-b border-slate-700 px-4 py-3 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => handleNavSelect(item.key)}
              className={`text-left px-4 py-2.5 rounded-lg font-body text-sm transition-colors ${
                section === item.key
                  ? 'bg-orange-500/10 text-orange-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* Sidebar — desktop only */}
      <aside className="hidden md:flex w-64 border-r border-slate-700 flex-col py-6 px-4 shrink-0 bg-slate-900">
        <div className="mb-8 px-2">
          <LogoDark height={32} />
        </div>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => handleNavSelect(item.key)}
              className={`text-left px-4 py-2.5 rounded-lg font-body text-sm transition-colors ${
                section === item.key
                  ? 'bg-orange-500/10 text-orange-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-8 pt-20 md:pt-8 bg-slate-950">
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
