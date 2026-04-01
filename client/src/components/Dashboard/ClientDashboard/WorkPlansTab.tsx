import { useState, useEffect, useCallback } from 'react'
import { useDashboardTheme } from '../ThemeContext'
import { API_URL, authFetch } from '../../../lib/api'

interface WorkPlansTabProps {
  clientId: number
  isAdmin: boolean
  onClose?: () => void
  isLoading?: boolean
  error?: string | null
  token?: string
  on401?: () => void
}

interface WorkPlanTask {
  id: number
  work_plan_id: number
  title: string
  description?: string
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked'
  assigned_to?: string
  due_date?: string
  estimated_hours?: number
  actual_hours?: number
  cost?: number
  progress_percent: number
  completed_at?: string
}

interface WorkPlanCost {
  id: number
  work_plan_id: number
  description: string
  amount: number
  category?: string
  approved: boolean
  approved_at?: string
}

interface WorkPlan {
  id: number
  client_id: number
  assessment_id: number
  title: string
  description?: string
  markdown_source?: string
  status: 'draft' | 'pending_approval' | 'approved' | 'in_progress' | 'completed' | 'archived'
  client_approved_at?: string
  client_approved_by?: string
  costs_approved_at?: string
  costs_approved_by?: string
  total_cost?: number
  created_at: string
  updated_at: string
  created_by?: string
  tasks?: WorkPlanTask[]
  costs?: WorkPlanCost[]
}

function getStatusBadgeColor(status: string, theme: any): string {
  switch (status) {
    case 'draft':
      return theme.statusDeferred
    case 'pending_approval':
      return theme.statusPending
    case 'approved':
      return theme.statusSuccess
    case 'in_progress':
      return theme.statusReviewing
    case 'completed':
      return theme.statusSuccess
    case 'archived':
      return theme.statusDeferred
    default:
      return theme.textMuted
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'draft':
      return 'Draft'
    case 'pending_approval':
      return 'Pending Approval'
    case 'approved':
      return 'Approved'
    case 'in_progress':
      return 'In Progress'
    case 'completed':
      return 'Completed'
    case 'archived':
      return 'Archived'
    default:
      return status
  }
}

function getTaskStatusColor(status: string, theme: any): string {
  switch (status) {
    case 'completed':
      return theme.statusSuccess
    case 'in_progress':
      return theme.statusReviewing
    case 'blocked':
      return theme.statusError
    case 'not_started':
    default:
      return theme.textMuted
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function WorkPlansTab({
  clientId,
  isAdmin,
  token = '',
  on401 = () => {},
}: WorkPlansTabProps) {
  const { theme } = useDashboardTheme()
  const [workPlans, setWorkPlans] = useState<WorkPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedPlan, setExpandedPlan] = useState<number | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [approvingCosts, setApprovingCosts] = useState(false)

  const stableOn401 = useCallback(on401, [on401])

  const fetchWorkPlans = useCallback(async () => {
    if (!token) return
    try {
      setLoading(true)
      setError('')

      const res = await authFetch(
        `${API_URL}/api/work-plans?client_id=${clientId}`,
        token,
        stableOn401
      )
      if (!res || !res.ok) {
        if (res?.status === 404) {
          setWorkPlans([])
        } else {
          setError('Failed to load work plans')
        }
        return
      }

      const data: WorkPlan[] = await res.json()
      setWorkPlans(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error fetching work plans:', err)
      setError('Failed to load work plans')
    } finally {
      setLoading(false)
    }
  }, [clientId, token, stableOn401])

  useEffect(() => {
    fetchWorkPlans()
  }, [fetchWorkPlans])

  const handleSendToClient = useCallback(async (planId: number) => {
    if (!token) return
    try {
      setUpdatingStatus(true)
      const res = await authFetch(
        `${API_URL}/api/work-plans/${planId}`,
        token,
        stableOn401,
        {
          method: 'PUT',
          body: JSON.stringify({ status: 'pending_approval' }),
        }
      )
      if (res && res.ok) {
        setWorkPlans(
          workPlans.map((p) =>
            p.id === planId ? { ...p, status: 'pending_approval' } : p
          )
        )
      } else {
        setError('Failed to send plan to client')
      }
    } catch (err) {
      console.error('Error sending plan to client:', err)
      setError('Failed to send plan to client')
    } finally {
      setUpdatingStatus(false)
    }
  }, [token, stableOn401, workPlans])

  const handleApprovePlan = useCallback(async (planId: number) => {
    if (!token) return
    try {
      setUpdatingStatus(true)
      const res = await authFetch(
        `${API_URL}/api/work-plans/${planId}`,
        token,
        stableOn401,
        {
          method: 'PUT',
          body: JSON.stringify({ status: 'approved' }),
        }
      )
      if (res && res.ok) {
        setWorkPlans(
          workPlans.map((p) =>
            p.id === planId ? { ...p, status: 'approved' } : p
          )
        )
      } else {
        setError('Failed to approve plan')
      }
    } catch (err) {
      console.error('Error approving plan:', err)
      setError('Failed to approve plan')
    } finally {
      setUpdatingStatus(false)
    }
  }, [token, stableOn401, workPlans])

  const handleApproveCosts = useCallback(async (planId: number) => {
    if (!token) return
    try {
      setApprovingCosts(true)
      const res = await authFetch(
        `${API_URL}/api/work-plans/${planId}`,
        token,
        stableOn401,
        {
          method: 'PUT',
          body: JSON.stringify({ costs_approved_by: 'client' }),
        }
      )
      if (res && res.ok) {
        setWorkPlans(
          workPlans.map((p) =>
            p.id === planId
              ? { ...p, costs_approved_at: new Date().toISOString() }
              : p
          )
        )
      } else {
        setError('Failed to approve costs')
      }
    } catch (err) {
      console.error('Error approving costs:', err)
      setError('Failed to approve costs')
    } finally {
      setApprovingCosts(false)
    }
  }, [token, stableOn401, workPlans])

  const handleArchive = useCallback(async (planId: number) => {
    if (!token) return
    try {
      setUpdatingStatus(true)
      const res = await authFetch(
        `${API_URL}/api/work-plans/${planId}`,
        token,
        stableOn401,
        {
          method: 'PUT',
          body: JSON.stringify({ status: 'archived' }),
        }
      )
      if (res && res.ok) {
        setWorkPlans(
          workPlans.map((p) =>
            p.id === planId ? { ...p, status: 'archived' } : p
          )
        )
      } else {
        setError('Failed to archive plan')
      }
    } catch (err) {
      console.error('Error archiving plan:', err)
      setError('Failed to archive plan')
    } finally {
      setUpdatingStatus(false)
    }
  }, [token, stableOn401, workPlans])

  // Filter plans for client view (show active/pending)
  const displayPlans = isAdmin
    ? workPlans
    : workPlans.filter(
        (p) =>
          p.status !== 'archived' &&
          p.status !== 'draft' &&
          p.status !== 'completed'
      )

  if (loading) {
    return (
      <div style={{ fontFamily: "'Outfit', sans-serif", color: theme.text }}>
        <div style={{ padding: '32px', textAlign: 'center', color: theme.textMuted }}>
          Loading work plans...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ fontFamily: "'Outfit', sans-serif" }}>
        <div
          style={{
            background: 'rgba(248,113,113,0.1)',
            border: `1px solid ${theme.statusError}`,
            color: theme.statusError,
            padding: '12px 16px',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        >
          {error}
        </div>
      </div>
    )
  }

  if (displayPlans.length === 0) {
    return (
      <div style={{ fontFamily: "'Outfit', sans-serif" }}>
        <h3
          style={{
            fontSize: '20px',
            fontWeight: 600,
            color: theme.text,
            margin: '0 0 16px 0',
            letterSpacing: '0.05em',
          }}
        >
          WORK PLANS
        </h3>
        <div
          style={{
            color: theme.textMuted,
            padding: '24px',
            background: theme.card,
            borderRadius: '8px',
            border: `1px solid ${theme.border}`,
          }}
        >
          No work plans yet.
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        fontFamily: "'Outfit', sans-serif",
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      <h3
        style={{
          fontSize: '20px',
          fontWeight: 600,
          color: theme.text,
          margin: 0,
          letterSpacing: '0.05em',
        }}
      >
        WORK PLANS
      </h3>

      {/* Work Plans List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {displayPlans.map((plan) => (
          <div key={plan.id}>
            {/* Plan Card Header */}
            <div
              onClick={() =>
                setExpandedPlan(expandedPlan === plan.id ? null : plan.id)
              }
              style={{
                padding: '16px',
                background: theme.card,
                borderRadius: '8px',
                border: `1px solid ${theme.border}`,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '16px',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = theme.accent
                el.style.background = theme.input
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = theme.border
                el.style.background = theme.card
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <h4
                    style={{
                      margin: 0,
                      fontSize: '15px',
                      fontWeight: 600,
                      color: theme.text,
                    }}
                  >
                    {plan.title}
                  </h4>
                  <div
                    style={{
                      padding: '4px 12px',
                      background: getStatusBadgeColor(plan.status, theme),
                      color: theme.bg,
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {getStatusLabel(plan.status)}
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: '24px',
                    fontSize: '13px',
                    color: theme.textMuted,
                  }}
                >
                  <span>Created: {formatDate(plan.created_at)}</span>
                  <span>Updated: {formatDate(plan.updated_at)}</span>
                  {plan.total_cost !== undefined && (
                    <span>Cost: {formatCurrency(plan.total_cost)}</span>
                  )}
                </div>
              </div>
              <div
                style={{
                  fontSize: '18px',
                  color: theme.textMuted,
                  flexShrink: 0,
                }}
              >
                {expandedPlan === plan.id ? '▼' : '▶'}
              </div>
            </div>

            {/* Expanded Details Panel */}
            {expandedPlan === plan.id && (
              <div
                style={{
                  padding: '20px',
                  background: theme.input,
                  borderRadius: '0 0 8px 8px',
                  borderLeft: `1px solid ${theme.border}`,
                  borderRight: `1px solid ${theme.border}`,
                  borderBottom: `1px solid ${theme.border}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                }}
              >
                {/* Plan Title and Description */}
                {plan.description && (
                  <div>
                    <h5
                      style={{
                        margin: '0 0 8px 0',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: theme.textMuted,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Description
                    </h5>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '13px',
                        color: theme.text,
                        lineHeight: 1.5,
                      }}
                    >
                      {plan.description}
                    </p>
                  </div>
                )}

                {/* Markdown Source */}
                {plan.markdown_source && (
                  <div>
                    <h5
                      style={{
                        margin: '0 0 8px 0',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: theme.textMuted,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Plan Source
                    </h5>
                    <div
                      style={{
                        padding: '12px',
                        background: theme.card,
                        borderRadius: '6px',
                        border: `1px solid ${theme.border}`,
                        fontSize: '12px',
                        color: theme.text,
                        maxHeight: '300px',
                        overflowY: 'auto',
                        fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {plan.markdown_source}
                    </div>
                  </div>
                )}

                {/* Tasks */}
                {plan.tasks && plan.tasks.length > 0 && (
                  <div>
                    <h5
                      style={{
                        margin: '0 0 12px 0',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: theme.textMuted,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Tasks ({plan.tasks.length})
                    </h5>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      {plan.tasks.map((task) => (
                        <div
                          key={task.id}
                          style={{
                            padding: '12px',
                            background: theme.card,
                            borderRadius: '6px',
                            border: `1px solid ${theme.border}`,
                            borderLeft: `3px solid ${getTaskStatusColor(
                              task.status,
                              theme
                            )}`,
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              marginBottom: '8px',
                              gap: '12px',
                            }}
                          >
                            <h6
                              style={{
                                margin: 0,
                                fontSize: '13px',
                                fontWeight: 600,
                                color: theme.text,
                                flex: 1,
                              }}
                            >
                              {task.title}
                            </h6>
                            <div
                              style={{
                                padding: '4px 8px',
                                background: getTaskStatusColor(task.status, theme),
                                color: theme.bg,
                                borderRadius: '3px',
                                fontSize: '10px',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {task.status.replace('_', ' ')}
                            </div>
                          </div>
                          {task.description && (
                            <p
                              style={{
                                margin: '0 0 8px 0',
                                fontSize: '12px',
                                color: theme.textMuted,
                              }}
                            >
                              {task.description}
                            </p>
                          )}
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                              gap: '8px',
                              fontSize: '12px',
                              color: theme.textMuted,
                            }}
                          >
                            {task.assigned_to && (
                              <span>Assigned to: {task.assigned_to}</span>
                            )}
                            {task.due_date && (
                              <span>Due: {formatDate(task.due_date)}</span>
                            )}
                            {task.estimated_hours !== undefined && (
                              <span>Est: {task.estimated_hours}h</span>
                            )}
                          </div>
                          {task.progress_percent > 0 && (
                            <div
                              style={{
                                marginTop: '8px',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  marginBottom: '4px',
                                  fontSize: '12px',
                                }}
                              >
                                <span style={{ color: theme.textMuted }}>Progress</span>
                                <span style={{ color: theme.accent }}>
                                  {task.progress_percent}%
                                </span>
                              </div>
                              <div
                                style={{
                                  background: theme.card,
                                  borderRadius: '3px',
                                  height: '6px',
                                  overflow: 'hidden',
                                }}
                              >
                                <div
                                  style={{
                                    width: `${task.progress_percent}%`,
                                    height: '100%',
                                    background: theme.accent,
                                    transition: 'width 0.3s ease',
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Costs */}
                {plan.costs && plan.costs.length > 0 && (
                  <div>
                    <h5
                      style={{
                        margin: '0 0 12px 0',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: theme.textMuted,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Costs ({plan.costs.length})
                    </h5>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      {plan.costs.map((cost) => (
                        <div
                          key={cost.id}
                          style={{
                            padding: '12px',
                            background: theme.card,
                            borderRadius: '6px',
                            border: `1px solid ${theme.border}`,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: '12px',
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <p
                              style={{
                                margin: '0 0 4px 0',
                                fontSize: '13px',
                                fontWeight: 600,
                                color: theme.text,
                              }}
                            >
                              {cost.description}
                            </p>
                            {cost.category && (
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: '12px',
                                  color: theme.textMuted,
                                }}
                              >
                                {cost.category}
                              </p>
                            )}
                          </div>
                          <div
                            style={{
                              textAlign: 'right',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <p
                              style={{
                                margin: 0,
                                fontSize: '13px',
                                fontWeight: 600,
                                color: theme.accent,
                              }}
                            >
                              {formatCurrency(cost.amount)}
                            </p>
                            <div
                              style={{
                                padding: '3px 8px',
                                background: cost.approved
                                  ? theme.statusSuccess
                                  : theme.statusPending,
                                color: theme.bg,
                                borderRadius: '3px',
                                fontSize: '10px',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                              }}
                            >
                              {cost.approved ? 'Approved' : 'Pending'}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div
                        style={{
                          padding: '12px',
                          background: theme.card,
                          borderRadius: '6px',
                          border: `2px solid ${theme.accent}`,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            fontSize: '13px',
                            fontWeight: 600,
                            color: theme.text,
                          }}
                        >
                          Total Cost
                        </p>
                        <p
                          style={{
                            margin: 0,
                            fontSize: '15px',
                            fontWeight: 700,
                            color: theme.accent,
                          }}
                        >
                          {formatCurrency(
                            plan.costs.reduce((sum, c) => sum + c.amount, 0)
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '12px',
                    paddingTop: '12px',
                    borderTop: `1px solid ${theme.border}`,
                  }}
                >
                  {isAdmin && (
                    <>
                      {plan.status === 'draft' && (
                        <button
                          onClick={() => handleSendToClient(plan.id)}
                          disabled={updatingStatus}
                          style={{
                            padding: '8px 16px',
                            background: theme.primary,
                            color: theme.bg,
                            border: 'none',
                            borderRadius: '6px',
                            cursor: updatingStatus ? 'not-allowed' : 'pointer',
                            fontSize: '13px',
                            fontWeight: 600,
                            fontFamily: "'Outfit', sans-serif",
                            opacity: updatingStatus ? 0.6 : 1,
                            transition: 'opacity 0.2s',
                          }}
                        >
                          {updatingStatus ? 'Sending...' : 'Send to Client'}
                        </button>
                      )}
                      {plan.status !== 'archived' &&
                        plan.status !== 'completed' && (
                          <button
                            onClick={() => handleArchive(plan.id)}
                            disabled={updatingStatus}
                            style={{
                              padding: '8px 16px',
                              background: 'transparent',
                              color: theme.statusError,
                              border: `1px solid ${theme.statusError}`,
                              borderRadius: '6px',
                              cursor: updatingStatus ? 'not-allowed' : 'pointer',
                              fontSize: '13px',
                              fontWeight: 600,
                              fontFamily: "'Outfit', sans-serif",
                              opacity: updatingStatus ? 0.6 : 1,
                              transition: 'opacity 0.2s',
                            }}
                          >
                            Archive
                          </button>
                        )}
                    </>
                  )}
                  {!isAdmin && (
                    <>
                      {plan.status === 'pending_approval' && (
                        <button
                          onClick={() => handleApprovePlan(plan.id)}
                          disabled={updatingStatus}
                          style={{
                            padding: '8px 16px',
                            background: theme.statusSuccess,
                            color: theme.bg,
                            border: 'none',
                            borderRadius: '6px',
                            cursor: updatingStatus ? 'not-allowed' : 'pointer',
                            fontSize: '13px',
                            fontWeight: 600,
                            fontFamily: "'Outfit', sans-serif",
                            opacity: updatingStatus ? 0.6 : 1,
                            transition: 'opacity 0.2s',
                          }}
                        >
                          {updatingStatus ? 'Approving...' : 'Approve Plan'}
                        </button>
                      )}
                      {plan.costs &&
                        plan.costs.some((c) => !c.approved) &&
                        plan.status !== 'pending_approval' && (
                          <button
                            onClick={() => handleApproveCosts(plan.id)}
                            disabled={approvingCosts}
                            style={{
                              padding: '8px 16px',
                              background: theme.accent,
                              color: theme.bg,
                              border: 'none',
                              borderRadius: '6px',
                              cursor: approvingCosts ? 'not-allowed' : 'pointer',
                              fontSize: '13px',
                              fontWeight: 600,
                              fontFamily: "'Outfit', sans-serif",
                              opacity: approvingCosts ? 0.6 : 1,
                              transition: 'opacity 0.2s',
                            }}
                          >
                            {approvingCosts
                              ? 'Approving Costs...'
                              : 'Approve Costs'}
                          </button>
                        )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
