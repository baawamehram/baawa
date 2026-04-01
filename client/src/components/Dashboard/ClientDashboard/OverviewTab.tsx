import { useState, useEffect, useCallback } from 'react'
import { useDashboardTheme } from '../ThemeContext'
import { API_URL, authFetch } from '../../../lib/api'

interface OverviewTabProps {
  clientId: number
  isAdmin: boolean
  onClose?: () => void
  isLoading?: boolean
  error?: string | null
  token?: string
  on401?: () => void
}

interface ActivityItem {
  id: string
  type: 'assessment' | 'plan' | 'task' | 'message' | 'agreement' | 'note'
  title: string
  description?: string
  timestamp: Date
  relatedTabKey?: string
}

interface FinancialSummary {
  totalCost: number
  spent: number
  remaining: number
  status: 'on_track' | 'at_risk' | 'over_budget'
}

interface ClientData {
  id: number
  founder_name: string
  company_name: string
  stage: string
  phase1_fee: number
  phase2_monthly_fee: number
  start_date: string
  created_at: string
  assessments?: any[]
  activities?: any[]
  notes?: any[]
  deliverables?: any[]
}

function getStageLabel(stage: string): string {
  const labels: { [key: string]: string } = {
    'phase1': 'Phase 1 - Engagement',
    'phase2': 'Phase 2 - Ongoing',
    'churned': 'Churned'
  }
  return labels[stage] || stage
}

function getStageColor(stage: string, theme: any): string {
  switch (stage) {
    case 'phase1':
      return theme.statusReviewing
    case 'phase2':
      return theme.statusSuccess
    case 'churned':
      return theme.statusError
    default:
      return theme.textMuted
  }
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMins = Math.floor(diffMs / (1000 * 60))

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString()
}

export function OverviewTab({
  clientId,
  isAdmin,
  token = '',
  on401 = () => {},
}: OverviewTabProps) {
  const { theme } = useDashboardTheme()
  const [clientData, setClientData] = useState<ClientData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary>({
    totalCost: 0,
    spent: 0,
    remaining: 0,
    status: 'on_track',
  })

  const stableOn401 = useCallback(on401, [on401])

  const fetchClientData = useCallback(async () => {
    if (!token) return
    try {
      setLoading(true)
      const res = await authFetch(`${API_URL}/api/clients/${clientId}`, token, stableOn401)
      if (!res) return

      if (!res.ok) {
        setError('Failed to load client data')
        return
      }

      const data = await res.json()
      setClientData(data)

      // Build activity feed
      const activityList: ActivityItem[] = []

      // Add recent activities
      if (data.activities && Array.isArray(data.activities)) {
        data.activities.slice(0, 5).forEach((activity: any) => {
          activityList.push({
            id: `activity-${activity.id}`,
            type: 'note' as const,
            title: activity.description || 'Activity',
            timestamp: new Date(activity.created_at),
            description: activity.type,
          })
        })
      }

      // Add deliverables/notes
      if (data.notes && Array.isArray(data.notes)) {
        data.notes.slice(0, 3).forEach((note: any) => {
          activityList.push({
            id: `note-${note.id}`,
            type: 'note' as const,
            title: 'Note added',
            description: note.content?.substring(0, 100),
            timestamp: new Date(note.created_at),
          })
        })
      }

      // Sort by timestamp descending (newest first)
      activityList.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      setActivities(activityList.slice(0, 7))

      // Calculate financial summary
      const totalCost = data.phase1_fee || 0
      let spent = 0
      let status: 'on_track' | 'at_risk' | 'over_budget' = 'on_track'

      if (totalCost > 0) {
        const startDate = new Date(data.start_date)
        const now = new Date()
        const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        spent = Math.min(totalCost, Math.floor((daysSinceStart / 30) * (totalCost / 3)))

        if (spent > totalCost) {
          status = 'over_budget'
        } else if (spent > totalCost * 0.8) {
          status = 'at_risk'
        }
      }

      setFinancialSummary({
        totalCost,
        spent,
        remaining: Math.max(0, totalCost - spent),
        status,
      })
    } catch (err) {
      console.error('Error fetching client data:', err)
      setError('Failed to load overview data')
    } finally {
      setLoading(false)
    }
  }, [clientId, token, stableOn401])

  useEffect(() => {
    fetchClientData()
  }, [fetchClientData])

  if (loading) {
    return (
      <div style={{ fontFamily: "'Outfit', sans-serif", color: theme.text }}>
        <div style={{ padding: '32px', textAlign: 'center', color: theme.textMuted }}>
          Loading overview...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ fontFamily: "'Outfit', sans-serif" }}>
        <div style={{
          background: 'rgba(248,113,113,0.1)',
          border: `1px solid ${theme.statusError}`,
          color: theme.statusError,
          padding: '12px 16px',
          borderRadius: '6px',
          fontSize: '14px',
        }}>
          {error}
        </div>
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

  const stageColor = getStageColor(clientData.stage, theme)

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Status Badge */}
      <div style={{
        padding: '16px 20px',
        background: theme.card,
        borderRadius: '8px',
        border: `1px solid ${theme.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div>
          <p style={{ margin: '0 0 8px 0', color: theme.textMuted, fontSize: '12px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Current Status
          </p>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: theme.text }}>
            {getStageLabel(clientData.stage)}
          </h3>
        </div>
        <div style={{
          padding: '8px 16px',
          background: stageColor,
          color: theme.bg,
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: 600,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}>
          {clientData.stage.replace('_', ' ')}
        </div>
      </div>

      {/* Next Actions Card */}
      <div style={{
        padding: '20px',
        background: theme.card,
        borderRadius: '8px',
        border: `1px solid ${theme.border}`,
      }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: theme.text, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Next Actions
        </h4>
        <div style={{
          padding: '12px',
          background: theme.input,
          borderRadius: '6px',
          color: theme.textMuted,
          fontSize: '13px',
          marginBottom: '16px',
        }}>
          {clientData.stage === 'phase1' ? (
            'Waiting for client feedback on proposal'
          ) : clientData.stage === 'phase2' ? (
            'Continue with Phase 2 deliverables'
          ) : (
            'Engagement has concluded'
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {isAdmin ? (
            <>
              <button style={{
                padding: '8px 16px',
                background: theme.primary,
                color: theme.bg,
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                fontFamily: "'Outfit', sans-serif",
              }}>
                Send Plan
              </button>
              <button style={{
                padding: '8px 16px',
                background: theme.input,
                color: theme.text,
                border: `1px solid ${theme.border}`,
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                fontFamily: "'Outfit', sans-serif",
              }}>
                Schedule Call
              </button>
            </>
          ) : (
            <button style={{
              padding: '8px 16px',
              background: theme.primary,
              color: theme.bg,
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              fontFamily: "'Outfit', sans-serif",
            }}>
              Review Plan
            </button>
          )}
        </div>
      </div>

      {/* Financial Summary */}
      {isAdmin && (
        <div style={{
          padding: '20px',
          background: theme.card,
          borderRadius: '8px',
          border: `1px solid ${theme.border}`,
        }}>
          <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 600, color: theme.text, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Financial Summary
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <div style={{ padding: '12px', background: theme.input, borderRadius: '6px' }}>
              <p style={{ margin: '0 0 4px 0', color: theme.textMuted, fontSize: '12px' }}>Total Contract Value</p>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: theme.text }}>
                ${financialSummary.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div style={{ padding: '12px', background: theme.input, borderRadius: '6px' }}>
              <p style={{ margin: '0 0 4px 0', color: theme.textMuted, fontSize: '12px' }}>Amount Spent</p>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: theme.statusReviewing }}>
                ${financialSummary.spent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div style={{ padding: '12px', background: theme.input, borderRadius: '6px' }}>
              <p style={{ margin: '0 0 4px 0', color: theme.textMuted, fontSize: '12px' }}>Remaining Budget</p>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: theme.accent }}>
                ${financialSummary.remaining.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div style={{ padding: '12px', background: theme.input, borderRadius: '6px' }}>
              <p style={{ margin: '0 0 4px 0', color: theme.textMuted, fontSize: '12px' }}>Budget Status</p>
              <p style={{
                margin: 0,
                fontSize: '14px',
                fontWeight: 600,
                color: financialSummary.status === 'on_track' ? theme.statusSuccess : financialSummary.status === 'at_risk' ? theme.statusPending : theme.statusError,
              }}>
                {financialSummary.status === 'on_track' ? 'On Track' : financialSummary.status === 'at_risk' ? 'At Risk' : 'Over Budget'}
              </p>
            </div>
          </div>
          <div style={{
            background: theme.bg,
            borderRadius: '4px',
            height: '8px',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${Math.min(100, (financialSummary.spent / financialSummary.totalCost) * 100)}%`,
              height: '100%',
              background: financialSummary.status === 'on_track' ? theme.statusSuccess : financialSummary.status === 'at_risk' ? theme.statusPending : theme.statusError,
            }} />
          </div>
        </div>
      )}

      {/* Recent Activity Feed */}
      <div style={{
        padding: '20px',
        background: theme.card,
        borderRadius: '8px',
        border: `1px solid ${theme.border}`,
      }}>
        <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 600, color: theme.text, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Recent Activity
        </h4>
        {activities.length === 0 ? (
          <p style={{ margin: 0, color: theme.textMuted, fontSize: '13px' }}>
            No activity yet
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {activities.map((activity) => (
              <div
                key={activity.id}
                style={{
                  padding: '12px',
                  background: theme.input,
                  borderRadius: '6px',
                  borderLeft: `3px solid ${theme.accent}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = theme.card
                  e.currentTarget.style.transform = 'translateX(2px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = theme.input
                  e.currentTarget.style.transform = 'translateX(0)'
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    margin: '0 0 4px 0',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: theme.text,
                  }}>
                    {activity.title}
                  </p>
                  {activity.description && (
                    <p style={{
                      margin: 0,
                      fontSize: '12px',
                      color: theme.textMuted,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {activity.description}
                    </p>
                  )}
                </div>
                <p style={{
                  margin: 0,
                  fontSize: '12px',
                  color: theme.textMuted,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}>
                  {formatDate(activity.timestamp)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Stats Footer */}
      <div style={{
        padding: '16px',
        background: theme.input,
        borderRadius: '8px',
        border: `1px solid ${theme.border}`,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '16px',
      }}>
        <div>
          <p style={{ margin: '0 0 4px 0', color: theme.textMuted, fontSize: '12px' }}>Engagement Start</p>
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: theme.text }}>
            {new Date(clientData.created_at).toLocaleDateString()}
          </p>
        </div>
        <div>
          <p style={{ margin: '0 0 4px 0', color: theme.textMuted, fontSize: '12px' }}>Days Active</p>
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: theme.text }}>
            {Math.floor((new Date().getTime() - new Date(clientData.created_at).getTime()) / (1000 * 60 * 60 * 24))}
          </p>
        </div>
        {isAdmin && (
          <div>
            <p style={{ margin: '0 0 4px 0', color: theme.textMuted, fontSize: '12px' }}>Total Notes</p>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: theme.text }}>
              {clientData.notes?.length || 0}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
