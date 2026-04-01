import { useState, useEffect, useCallback } from 'react'
import { useDashboardTheme } from '../ThemeContext'
import { API_URL, authFetch } from '../../../lib/api'
import { OverviewTab } from './OverviewTab'
import { AssessmentTab } from './AssessmentTab'
import { WorkPlansTab } from './WorkPlansTab'
import { TasksTab } from './TasksTab'
import { AgreementsTab } from './AgreementsTab'
import { EngagementsTab } from './EngagementsTab'
import { ProfileTab } from './ProfileTab'

interface ClientData {
  id: number
  founder_name: string
  company_name: string
  email: string
  stage: string
  created_at: string
}

interface ClientDashboardProps {
  clientId: number
  token: string
  onBack: () => void
  isAdmin?: boolean
  on401?: () => void
}

type TabKey = 'overview' | 'assessment' | 'work-plans' | 'tasks' | 'agreements' | 'engagements' | 'profile'

const TABS: { key: TabKey; label: string; adminOnly?: boolean }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'assessment', label: 'Assessment' },
  { key: 'work-plans', label: 'Work Plans' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'agreements', label: 'Agreements' },
  { key: 'engagements', label: 'Engagements' },
  { key: 'profile', label: 'Profile' },
]

export function ClientDashboard({
  clientId,
  token,
  onBack,
  isAdmin = true,
  on401 = () => {},
}: ClientDashboardProps) {
  const { theme } = useDashboardTheme()
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [clientData, setClientData] = useState<ClientData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Wrap on401 in useCallback to ensure stable reference across renders
  const stableOn401 = useCallback(on401, [on401])

  useEffect(() => {
    const fetchClient = async () => {
      try {
        const res = await authFetch(`${API_URL}/api/clients/${clientId}`, token, stableOn401)
        if (!res) return
        const data = await res.json()
        setClientData(data)
      } catch (err) {
        setError('Failed to load client data')
      } finally {
        setLoading(false)
      }
    }

    fetchClient()
  }, [clientId, token])

  const visibleTabs = isAdmin ? TABS : TABS.filter(tab => !tab.adminOnly)

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab clientId={clientId} isAdmin={isAdmin} onClose={onBack} isLoading={false} error={null} token={token} on401={stableOn401} />
      case 'assessment':
        return <AssessmentTab clientId={clientId} isAdmin={isAdmin} onClose={onBack} isLoading={false} error={null} />
      case 'work-plans':
        return <WorkPlansTab clientId={clientId} isAdmin={isAdmin} onClose={onBack} isLoading={false} error={null} />
      case 'tasks':
        return <TasksTab clientId={clientId} isAdmin={isAdmin} onClose={onBack} isLoading={false} error={null} />
      case 'agreements':
        return <AgreementsTab clientId={clientId} isAdmin={isAdmin} onClose={onBack} isLoading={false} error={null} />
      case 'engagements':
        return <EngagementsTab clientId={clientId} isAdmin={isAdmin} onClose={onBack} isLoading={false} error={null} />
      case 'profile':
        return <ProfileTab clientId={clientId} isAdmin={isAdmin} onClose={onBack} isLoading={false} error={null} />
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div style={{ fontFamily: "'Outfit', sans-serif", color: theme.textMuted }}>
        Loading client data...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ fontFamily: "'Outfit', sans-serif", color: theme.statusError }}>
        {error}
      </div>
    )
  }

  if (!clientData) {
    return (
      <div style={{ fontFamily: "'Outfit', sans-serif", color: theme.textMuted }}>
        Client not found
      </div>
    )
  }

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif" }}>
      {/* Header with back button and client info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '24px',
            color: theme.text,
            padding: '4px 8px',
            lineHeight: 1,
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = theme.textMuted)}
          onMouseLeave={(e) => (e.currentTarget.style.color = theme.text)}
          title="Back to clients"
        >
          ←
        </button>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: theme.text, margin: '0 0 4px 0' }}>
            {clientData.founder_name}
          </h1>
          <p style={{ fontSize: '14px', color: theme.textMuted, margin: 0 }}>
            {clientData.company_name}
          </p>
        </div>
      </div>

      {/* Tab navigation */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '32px',
          borderBottom: `1px solid ${theme.border}`,
          paddingBottom: '0',
          flexWrap: 'wrap',
        }}
      >
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '12px 16px',
              background: activeTab === tab.key ? theme.primary : 'transparent',
              color: activeTab === tab.key ? theme.primaryText : theme.textMuted,
              border: activeTab === tab.key ? `1px solid ${theme.primary}` : `1px solid transparent`,
              borderRadius: '6px 6px 0 0',
              cursor: 'pointer',
              fontSize: '13px',
              fontFamily: "'Outfit', sans-serif",
              fontWeight: activeTab === tab.key ? 600 : 400,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.key) {
                e.currentTarget.style.background = theme.card
                e.currentTarget.style.color = theme.text
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.key) {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = theme.textMuted
              }
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ paddingBottom: '32px' }}>
        {renderTabContent()}
      </div>
    </div>
  )
}
