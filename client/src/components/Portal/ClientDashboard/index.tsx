import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { portalFetch } from '../../../lib/portalApi'
import { usePortalTheme, t } from '../usePortalTheme'
import { OverviewTab } from './OverviewTab'
import { AssessmentTab } from './AssessmentTab'
import { WorkPlansTab } from './WorkPlansTab'
import { TasksTab } from './TasksTab'
import { AgreementsTab } from './AgreementsTab'
import { EngagementsTab } from './EngagementsTab'
import { ProfileTab } from './ProfileTab'

interface AssessmentData {
  id: number
  email: string
  created_at: string
  conversation: Array<{ role: 'user' | 'assistant'; content: string }>
  results_unlocked: boolean
  score: number | null
  score_breakdown: Record<string, number> | null
  score_summary: string | null
  biggest_opportunity: string | null
  biggest_risk: string | null
  problem_domains: Array<{ domain: string; subCategory: string; confidence: number }> | null
}

type Tab = 'overview' | 'assessment' | 'workplans' | 'tasks' | 'agreements' | 'engagements' | 'profile'

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'overview', label: 'Overview', emoji: '📊' },
  { id: 'assessment', label: 'Assessment', emoji: '📈' },
  { id: 'workplans', label: 'Work Plans', emoji: '📋' },
  { id: 'tasks', label: 'Tasks', emoji: '✓' },
  { id: 'agreements', label: 'Agreements', emoji: '📄' },
  { id: 'engagements', label: 'Messages', emoji: '💬' },
  { id: 'profile', label: 'Profile', emoji: '👤' },
]

export function PortalClientDashboard() {
  const { theme, toggleTheme } = usePortalTheme()
  const tk = t(theme)
  const navigate = useNavigate()

  const [assessment, setAssessment] = useState<AssessmentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const on401 = useCallback(() => {
    localStorage.removeItem('portal_token')
    navigate('/portal/login', { replace: true, state: { message: 'Your session expired — log in again.' } })
  }, [navigate])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      // Fetch assessment (we know the user is authenticated)
      const meRes = await portalFetch('/api/portal/me', on401)
      if (!meRes || !meRes.ok) {
        setError('Failed to load your data')
        return
      }
      const assessmentData = await meRes.json() as AssessmentData
      setAssessment(assessmentData)

      // Try to fetch associated client data
      // For now, we'll check if there's a client created for this assessment
      // This would require a new endpoint or we'll fetch from /api/clients after getting client_id
      // For MVP, we'll show assessment data first and enhance later
    } catch (err) {
      console.error('Failed to load client dashboard:', err)
      setError('Failed to load your dashboard. Please refresh.')
    } finally {
      setLoading(false)
    }
  }, [on401])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const handleLogout = () => {
    localStorage.removeItem('portal_token')
    navigate('/portal/login', { replace: true })
  }

  if (loading) {
    return (
      <div style={{ background: tk.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.4, repeat: Infinity }}
          style={{ fontFamily: 'Outfit, sans-serif', fontSize: 16, color: tk.textMuted }}
        >
          Loading your dashboard…
        </motion.div>
      </div>
    )
  }

  if (error && !assessment) {
    return (
      <div style={{ background: tk.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
        <div style={{ background: tk.bg2, border: `1px solid ${tk.border}`, borderRadius: 8, padding: 24, maxWidth: 400, textAlign: 'center' }}>
          <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, color: tk.text, margin: '0 0 12px' }}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{ background: tk.accent, color: '#000', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}
          >
            Refresh Page
          </button>
        </div>
      </div>
    )
  }

  if (!assessment) {
    return (
      <div style={{ background: tk.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, color: tk.textMuted }}>No assessment data found</p>
      </div>
    )
  }

  return (
    <div style={{ background: tk.bg, minHeight: '100vh', boxSizing: 'border-box' }}>
      {/* Top-right controls */}
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 100, display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          onClick={() => navigate('/portal/results')}
          aria-label="Back to results"
          title="Back to results"
          style={{ background: 'none', border: `1px solid ${tk.border}`, borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: tk.textMuted, fontSize: 14, fontFamily: 'Outfit, sans-serif' }}
        >
          ← Results
        </button>
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          style={{ background: 'none', border: `1px solid ${tk.border}`, borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: tk.textMuted, fontSize: 16 }}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        <button
          onClick={handleLogout}
          aria-label="Logout"
          title="Logout"
          style={{ background: 'none', border: `1px solid #ef4444`, borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: '#ef4444', fontSize: 13, fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}
        >
          Logout
        </button>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '24px 16px' : '32px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 11, color: tk.accent, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>
            Client Dashboard
          </div>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 'clamp(20px, 3vw, 28px)', color: tk.text, margin: '0 0 8px' }}>
            Welcome back
          </h1>
          <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, color: tk.textMuted, margin: 0 }}>
            {assessment.email}
          </p>
        </div>

        {/* Tab nav */}
        <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${tk.border}`, marginBottom: 24, overflowX: 'auto', paddingBottom: 1 }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                padding: '8px 14px',
                fontFamily: 'Outfit, sans-serif',
                fontSize: 13,
                color: activeTab === tab.id ? tk.accent : tk.textMuted,
                borderBottom: `2px solid ${activeTab === tab.id ? tk.accent : 'transparent'}`,
                fontWeight: activeTab === tab.id ? 700 : 400,
                transition: 'all 0.15s',
              }}
            >
              {tab.emoji} {isMobile && tab.id !== activeTab ? '' : tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'overview' && assessment && <OverviewTab assessment={assessment} on401={on401} />}
            {activeTab === 'assessment' && assessment && <AssessmentTab assessment={assessment} />}
            {activeTab === 'workplans' && <WorkPlansTab on401={on401} />}
            {activeTab === 'tasks' && <TasksTab on401={on401} />}
            {activeTab === 'agreements' && <AgreementsTab on401={on401} />}
            {activeTab === 'engagements' && <EngagementsTab on401={on401} />}
            {activeTab === 'profile' && assessment && <ProfileTab assessment={assessment} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
