import { useState, useEffect, useCallback, useMemo } from 'react'
import { useDashboardTheme } from '../ThemeContext'
import { API_URL, authFetch } from '../../../lib/api'

interface TasksTabProps {
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
  work_plan_title?: string
  title: string
  description?: string
  order_index?: number
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked'
  assigned_to?: string
  due_date?: string
  estimated_hours?: number
  actual_hours?: number
  cost?: number
  progress_percent: number
  completed_at?: string
  created_at: string
  updated_at: string
}

function getStatusBadgeColor(status: string, theme: any): string {
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

function isOverdue(dueDateStr?: string): boolean {
  if (!dueDateStr) return false
  return new Date(dueDateStr) < new Date()
}

function isDueSoon(dueDateStr?: string): boolean {
  if (!dueDateStr) return false
  const dueDate = new Date(dueDateStr)
  const today = new Date()
  const threeDay = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000)
  return dueDate >= today && dueDate <= threeDay
}

export function TasksTab({
  clientId,
  isAdmin,
  token = '',
  on401 = () => {},
}: TasksTabProps) {
  const { theme } = useDashboardTheme()
  const [tasks, setTasks] = useState<WorkPlanTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedTask, setExpandedTask] = useState<number | null>(null)
  const [updatingTask, setUpdatingTask] = useState(false)

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'due_date' | 'progress' | 'status' | 'title'>('due_date')


  const stableOn401 = useCallback(on401, [on401])

  const fetchTasks = useCallback(async () => {
    if (!token) return
    try {
      setLoading(true)
      setError('')

      const res = await authFetch(
        `${API_URL}/api/work-plan-tasks?client_id=${clientId}`,
        token,
        stableOn401
      )
      if (!res || !res.ok) {
        if (res?.status === 404) {
          setTasks([])
        } else {
          setError('Failed to load tasks')
        }
        return
      }

      const data: WorkPlanTask[] = await res.json()
      setTasks(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error fetching tasks:', err)
      setError('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }, [clientId, token, stableOn401])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  // Filter and sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    let result = [...tasks]

    // Apply status filter
    if (statusFilter.length > 0) {
      result = result.filter((t) => statusFilter.includes(t.status))
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(term) ||
          t.work_plan_title?.toLowerCase().includes(term)
      )
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'due_date':
          // Tasks without due date go to bottom
          if (!a.due_date) return 1
          if (!b.due_date) return -1
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
        case 'progress':
          return a.progress_percent - b.progress_percent
        case 'status':
          const statusOrder: Record<string, number> = {
            'blocked': 0,
            'not_started': 1,
            'in_progress': 2,
            'completed': 3,
          }
          return (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0)
        case 'title':
          return a.title.localeCompare(b.title)
        default:
          return 0
      }
    })

    return result
  }, [tasks, statusFilter, searchTerm, sortBy])

  const handleStatusUpdate = useCallback(
    async (taskId: number, newStatus: string) => {
      if (!token) return
      try {
        setUpdatingTask(true)
        const res = await authFetch(
          `${API_URL}/api/work-plan-tasks/${taskId}`,
          token,
          stableOn401,
          {
            method: 'PUT',
            body: JSON.stringify({ status: newStatus }),
          }
        )
        if (res && res.ok) {
          setTasks(
            tasks.map((t) =>
              t.id === taskId
                ? { ...t, status: newStatus as any }
                : t
            )
          )
        } else {
          setError('Failed to update task status')
        }
      } catch (err) {
        console.error('Error updating task:', err)
        setError('Failed to update task')
      } finally {
        setUpdatingTask(false)
      }
    },
    [token, stableOn401, tasks]
  )

  const handleProgressUpdate = useCallback(
    async (taskId: number, progress: number) => {
      if (!token) return
      try {
        setUpdatingTask(true)
        const res = await authFetch(
          `${API_URL}/api/work-plan-tasks/${taskId}`,
          token,
          stableOn401,
          {
            method: 'PUT',
            body: JSON.stringify({ progress_percent: progress }),
          }
        )
        if (res && res.ok) {
          setTasks(
            tasks.map((t) =>
              t.id === taskId ? { ...t, progress_percent: progress } : t
            )
          )
        } else {
          setError('Failed to update task progress')
        }
      } catch (err) {
        console.error('Error updating task progress:', err)
        setError('Failed to update task progress')
      } finally {
        setUpdatingTask(false)
      }
    },
    [token, stableOn401, tasks]
  )

  const handleDueDateUpdate = useCallback(
    async (taskId: number, newDueDate: string) => {
      if (!token) return
      try {
        setUpdatingTask(true)
        const res = await authFetch(
          `${API_URL}/api/work-plan-tasks/${taskId}`,
          token,
          stableOn401,
          {
            method: 'PUT',
            body: JSON.stringify({ due_date: newDueDate }),
          }
        )
        if (res && res.ok) {
          setTasks(
            tasks.map((t) =>
              t.id === taskId ? { ...t, due_date: newDueDate } : t
            )
          )
        } else {
          setError('Failed to update task due date')
        }
      } catch (err) {
        console.error('Error updating task due date:', err)
        setError('Failed to update task due date')
      } finally {
        setUpdatingTask(false)
      }
    },
    [token, stableOn401, tasks]
  )

  const handleAssigneeUpdate = useCallback(
    async (taskId: number, newAssignee: string) => {
      if (!token) return
      try {
        setUpdatingTask(true)
        const res = await authFetch(
          `${API_URL}/api/work-plan-tasks/${taskId}`,
          token,
          stableOn401,
          {
            method: 'PUT',
            body: JSON.stringify({ assigned_to: newAssignee || null }),
          }
        )
        if (res && res.ok) {
          setTasks(
            tasks.map((t) =>
              t.id === taskId ? { ...t, assigned_to: newAssignee || undefined } : t
            )
          )
        } else {
          setError('Failed to update task assignee')
        }
      } catch (err) {
        console.error('Error updating task assignee:', err)
        setError('Failed to update task assignee')
      } finally {
        setUpdatingTask(false)
      }
    },
    [token, stableOn401, tasks]
  )

  if (loading) {
    return (
      <div style={{ fontFamily: "'Outfit', sans-serif", color: theme.text }}>
        <div style={{ padding: '32px', textAlign: 'center', color: theme.textMuted }}>
          Loading tasks...
        </div>
      </div>
    )
  }

  if (error && tasks.length === 0) {
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

  if (filteredAndSortedTasks.length === 0) {
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
          TASKS
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
          {tasks.length === 0 ? 'No tasks yet.' : 'No tasks match your filters.'}
        </div>
      </div>
    )
  }

  const allStatuses = ['not_started', 'in_progress', 'completed', 'blocked']

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
        TASKS
      </h3>

      {/* Filters and Controls */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          padding: '16px',
          background: theme.input,
          borderRadius: '8px',
          border: `1px solid ${theme.border}`,
        }}
      >
        {/* Search Bar */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: theme.textMuted,
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Search
          </label>
          <input
            type="text"
            placeholder="Search by task title or work plan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: theme.card,
              border: `1px solid ${theme.border}`,
              borderRadius: '6px',
              color: theme.text,
              fontSize: '14px',
              fontFamily: "'Outfit', sans-serif",
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Status Filter */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: theme.textMuted,
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Status Filter
          </label>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            {allStatuses.map((status) => (
              <label
                key={status}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: theme.text,
                }}
              >
                <input
                  type="checkbox"
                  checked={statusFilter.includes(status)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setStatusFilter([...statusFilter, status])
                    } else {
                      setStatusFilter(statusFilter.filter((s) => s !== status))
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                />
                {status.replace('_', ' ')}
              </label>
            ))}
          </div>
        </div>

        {/* Sort By */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: theme.textMuted,
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Sort By
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{
              padding: '8px 12px',
              background: theme.card,
              border: `1px solid ${theme.border}`,
              borderRadius: '6px',
              color: theme.text,
              fontSize: '14px',
              fontFamily: "'Outfit', sans-serif",
              cursor: 'pointer',
            }}
          >
            <option value="due_date">Due Date (Nearest First)</option>
            <option value="progress">Progress (Lowest First)</option>
            <option value="status">Status</option>
            <option value="title">Title (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Task Count */}
      <div
        style={{
          fontSize: '13px',
          color: theme.textMuted,
        }}
      >
        Showing {filteredAndSortedTasks.length} of {tasks.length} tasks
      </div>

      {/* Tasks List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredAndSortedTasks.map((task) => (
          <div key={task.id}>
            {/* Task Card Header */}
            <div
              onClick={() =>
                setExpandedTask(expandedTask === task.id ? null : task.id)
              }
              style={{
                padding: '16px',
                background: theme.card,
                borderRadius: '8px',
                border: `1px solid ${theme.border}`,
                borderLeft: `3px solid ${getStatusBadgeColor(task.status, theme)}`,
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <h4
                    style={{
                      margin: 0,
                      fontSize: '15px',
                      fontWeight: 600,
                      color: theme.text,
                    }}
                  >
                    {task.title}
                  </h4>
                  <div
                    style={{
                      padding: '4px 12px',
                      background: getStatusBadgeColor(task.status, theme),
                      color: theme.bg,
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {task.status.replace('_', ' ')}
                  </div>
                </div>

                {/* Task Meta Info */}
                <div
                  style={{
                    display: 'flex',
                    gap: '16px',
                    fontSize: '13px',
                    color: theme.textMuted,
                    flexWrap: 'wrap',
                  }}
                >
                  {task.work_plan_title && (
                    <span>Plan: {task.work_plan_title}</span>
                  )}
                  {task.assigned_to && (
                    <span>Assigned: {task.assigned_to}</span>
                  )}
                  {task.due_date && (
                    <span
                      style={{
                        color: isOverdue(task.due_date)
                          ? theme.statusError
                          : isDueSoon(task.due_date)
                            ? theme.statusPending
                            : theme.textMuted,
                      }}
                    >
                      Due: {formatDate(task.due_date)}{' '}
                      {isOverdue(task.due_date) && '(overdue)'}
                    </span>
                  )}
                </div>

                {/* Progress Bar */}
                {task.progress_percent > 0 && (
                  <div
                    style={{
                      marginTop: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
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
                    <span style={{ fontSize: '12px', color: theme.accent, minWidth: '35px' }}>
                      {task.progress_percent}%
                    </span>
                  </div>
                )}
              </div>

              <div
                style={{
                  fontSize: '18px',
                  color: theme.textMuted,
                  flexShrink: 0,
                }}
              >
                {expandedTask === task.id ? '▼' : '▶'}
              </div>
            </div>

            {/* Expanded Details Panel */}
            {expandedTask === task.id && (
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
                {/* Task Title and Description */}
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
                    {task.description || '(No description)'}
                  </p>
                </div>

                {/* Task Info Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '16px',
                  }}
                >
                  <div>
                    <p
                      style={{
                        margin: '0 0 8px 0',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: theme.textMuted,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Status
                    </p>
                    <div
                      style={{
                        padding: '4px 12px',
                        background: getStatusBadgeColor(task.status, theme),
                        color: theme.bg,
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 600,
                        display: 'inline-block',
                        textTransform: 'uppercase',
                      }}
                    >
                      {task.status.replace('_', ' ')}
                    </div>
                  </div>

                  {task.assigned_to && (
                    <div>
                      <p
                        style={{
                          margin: '0 0 8px 0',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: theme.textMuted,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        Assigned To
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '13px',
                          color: theme.text,
                        }}
                      >
                        {task.assigned_to}
                      </p>
                    </div>
                  )}

                  {task.due_date && (
                    <div>
                      <p
                        style={{
                          margin: '0 0 8px 0',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: theme.textMuted,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        Due Date
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '13px',
                          color: isOverdue(task.due_date)
                            ? theme.statusError
                            : isDueSoon(task.due_date)
                              ? theme.statusPending
                              : theme.text,
                        }}
                      >
                        {formatDate(task.due_date)}
                        {isOverdue(task.due_date) && ' (overdue)'}
                      </p>
                    </div>
                  )}

                  {task.estimated_hours !== undefined && (
                    <div>
                      <p
                        style={{
                          margin: '0 0 8px 0',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: theme.textMuted,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        Estimated Hours
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '13px',
                          color: theme.text,
                        }}
                      >
                        {task.estimated_hours}h
                      </p>
                    </div>
                  )}

                  {task.actual_hours !== undefined && (
                    <div>
                      <p
                        style={{
                          margin: '0 0 8px 0',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: theme.textMuted,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        Actual Hours
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '13px',
                          color: theme.text,
                        }}
                      >
                        {task.actual_hours}h
                      </p>
                    </div>
                  )}

                  {task.cost !== undefined && (
                    <div>
                      <p
                        style={{
                          margin: '0 0 8px 0',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: theme.textMuted,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        Cost
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '13px',
                          color: theme.accent,
                          fontWeight: 600,
                        }}
                      >
                        ${task.cost.toFixed(2)}
                      </p>
                    </div>
                  )}

                  <div>
                    <p
                      style={{
                        margin: '0 0 8px 0',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: theme.textMuted,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Created
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '13px',
                        color: theme.text,
                      }}
                    >
                      {formatDate(task.created_at)}
                    </p>
                  </div>

                  {task.completed_at && (
                    <div>
                      <p
                        style={{
                          margin: '0 0 8px 0',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: theme.textMuted,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        Completed
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '13px',
                          color: theme.statusSuccess,
                        }}
                      >
                        {formatDate(task.completed_at)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Progress Section */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px',
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: '12px',
                        fontWeight: 600,
                        color: theme.textMuted,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Progress
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '13px',
                        color: theme.accent,
                        fontWeight: 600,
                      }}
                    >
                      {task.progress_percent}%
                    </p>
                  </div>
                  <div
                    style={{
                      background: theme.card,
                      borderRadius: '3px',
                      height: '8px',
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

                {/* Admin Edit Controls */}
                {isAdmin && (
                  <div
                    style={{
                      paddingTop: '12px',
                      borderTop: `1px solid ${theme.border}`,
                    }}
                  >
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
                      Admin Actions
                    </h5>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '12px',
                      }}
                    >
                      {/* Change Status */}
                      <div>
                        <label
                          style={{
                            display: 'block',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: theme.textMuted,
                            marginBottom: '6px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}
                        >
                          Status
                        </label>
                        <select
                          value={task.status}
                          onChange={(e) => {
                            handleStatusUpdate(task.id, e.target.value)
                          }}
                          disabled={updatingTask}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            background: theme.card,
                            border: `1px solid ${theme.border}`,
                            borderRadius: '4px',
                            color: theme.text,
                            fontSize: '13px',
                            fontFamily: "'Outfit', sans-serif",
                            cursor: updatingTask ? 'not-allowed' : 'pointer',
                            opacity: updatingTask ? 0.6 : 1,
                          }}
                        >
                          <option value="not_started">Not Started</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="blocked">Blocked</option>
                        </select>
                      </div>

                      {/* Update Progress */}
                      <div>
                        <label
                          style={{
                            display: 'block',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: theme.textMuted,
                            marginBottom: '6px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}
                        >
                          Progress
                        </label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={task.progress_percent}
                            onChange={(e) => {
                              handleProgressUpdate(task.id, parseInt(e.target.value))
                            }}
                            disabled={updatingTask}
                            style={{
                              flex: 1,
                              cursor: updatingTask ? 'not-allowed' : 'pointer',
                              opacity: updatingTask ? 0.6 : 1,
                            }}
                          />
                          <span
                            style={{
                              minWidth: '35px',
                              textAlign: 'right',
                              color: theme.accent,
                              fontWeight: 600,
                              fontSize: '13px',
                            }}
                          >
                            {task.progress_percent}%
                          </span>
                        </div>
                      </div>

                      {/* Change Due Date */}
                      <div>
                        <label
                          style={{
                            display: 'block',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: theme.textMuted,
                            marginBottom: '6px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}
                        >
                          Due Date
                        </label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="date"
                            value={task.due_date ? task.due_date.split('T')[0] : ''}
                            onChange={(e) => {
                              handleDueDateUpdate(task.id, e.target.value)
                            }}
                            disabled={updatingTask}
                            style={{
                              flex: 1,
                              padding: '8px 10px',
                              background: theme.card,
                              border: `1px solid ${theme.border}`,
                              borderRadius: '4px',
                              color: theme.text,
                              fontSize: '13px',
                              fontFamily: "'Outfit', sans-serif",
                              cursor: updatingTask ? 'not-allowed' : 'pointer',
                              opacity: updatingTask ? 0.6 : 1,
                            }}
                          />
                        </div>
                      </div>

                      {/* Change Assignee */}
                      <div>
                        <label
                          style={{
                            display: 'block',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: theme.textMuted,
                            marginBottom: '6px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}
                        >
                          Assigned To
                        </label>
                        <input
                          type="text"
                          placeholder="Team member name..."
                          value={task.assigned_to || ''}
                          onChange={(e) => {
                            handleAssigneeUpdate(task.id, e.target.value)
                          }}
                          disabled={updatingTask}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            background: theme.card,
                            border: `1px solid ${theme.border}`,
                            borderRadius: '4px',
                            color: theme.text,
                            fontSize: '13px',
                            fontFamily: "'Outfit', sans-serif",
                            cursor: updatingTask ? 'not-allowed' : 'pointer',
                            opacity: updatingTask ? 0.6 : 1,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Client View - Contact Us */}
                {!isAdmin && (
                  <div
                    style={{
                      paddingTop: '12px',
                      borderTop: `1px solid ${theme.border}`,
                    }}
                  >
                    <button
                      style={{
                        padding: '10px 20px',
                        background: theme.primary,
                        color: theme.bg,
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 600,
                        fontFamily: "'Outfit', sans-serif",
                        transition: 'opacity 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        (e.target as HTMLElement).style.opacity = '0.8'
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLElement).style.opacity = '1'
                      }}
                      onClick={() => {
                        alert('Contact form would open here')
                      }}
                    >
                      Contact Us
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
