import { useState, useEffect, useCallback, useRef } from 'react'
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

interface ParsedTask {
  title: string
  description?: string
}

interface ParsedMarkdown {
  title: string
  description?: string
  tasks: ParsedTask[]
}

type UploadState = 'idle' | 'uploading' | 'parsing' | 'confirmation' | 'submitting' | 'success' | 'error'

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

function parseMarkdown(content: string): ParsedMarkdown {
  const lines = content.split('\n')
  let title = ''
  const tasks: ParsedTask[] = []
  let currentTask: ParsedTask | null = null

  for (const line of lines) {
    const trimmed = line.trim()
    const isIndented = /^\s{2,}/.test(line)

    // Find H1 as title (highest priority)
    if (trimmed.startsWith('# ')) {
      title = trimmed.slice(2).trim()
      continue
    }

    // Skip H2, H3, etc. (section headers)
    if (trimmed.match(/^#{2,}\s+/)) {
      currentTask = null
      continue
    }

    // Match bullet points (- or *) at start of line (not indented)
    if (trimmed.match(/^[-*]\s+.+/) && !isIndented) {
      const taskTitle = trimmed.slice(2).trim()
      currentTask = { title: taskTitle, description: '' }
      tasks.push(currentTask)
      continue
    }

    // Match sub-bullets (indented - or *) as task descriptions
    if (isIndented && trimmed.match(/^[-*]\s+.+/) && currentTask) {
      const detail = trimmed.slice(2).trim()
      if (currentTask.description) {
        currentTask.description += '\n' + detail
      } else {
        currentTask.description = detail
      }
    }
  }

  // Clean up empty descriptions
  const cleanedTasks = tasks.map((t) => ({
    title: t.title,
    description: t.description ? t.description.trim() : undefined,
  }))

  return {
    title,
    description: '',
    tasks: cleanedTasks,
  }
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

  // Upload state
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState('')
  const [formData, setFormData] = useState<ParsedMarkdown | null>(null)
  const [originalMarkdown, setOriginalMarkdown] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [removedTaskIndices, setRemovedTaskIndices] = useState<Set<number>>(new Set())

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

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file) return

    setUploadError('')
    setUploadSuccess('')
    setUploadState('uploading')

    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const content = e.target?.result as string
        setOriginalMarkdown(content)

        setUploadState('parsing')
        // Simulate parsing delay for UX feedback
        await new Promise((resolve) => setTimeout(resolve, 300))

        const parsed = parseMarkdown(content)

        // Validate parsed data
        if (!parsed.title || parsed.title.trim() === '') {
          setUploadError('Markdown must contain an H1 title (e.g., # Project Title)')
          setUploadState('error')
          return
        }

        if (parsed.title.length > 255) {
          setUploadError('Title must be 255 characters or less')
          setUploadState('error')
          return
        }

        if (parsed.tasks.length === 0) {
          setUploadError('Markdown must contain at least one task (bullet point)')
          setUploadState('error')
          return
        }

        // Validate task titles
        const invalidTask = parsed.tasks.find((t) => t.title.length > 255)
        if (invalidTask) {
          setUploadError('Task titles must be 255 characters or less')
          setUploadState('error')
          return
        }

        setFormData({
          title: parsed.title,
          description: parsed.description || '',
          tasks: parsed.tasks,
        })
        setRemovedTaskIndices(new Set())
        setUploadState('confirmation')
      }

      reader.onerror = () => {
        setUploadError('Failed to read file')
        setUploadState('error')
      }

      reader.readAsText(file)
    } catch (err) {
      console.error('Error processing file:', err)
      setUploadError('Failed to process file')
      setUploadState('error')
    }
  }, [])

  const handleRemoveTask = useCallback((index: number) => {
    const newRemoved = new Set(removedTaskIndices)
    if (newRemoved.has(index)) {
      newRemoved.delete(index)
    } else {
      newRemoved.add(index)
    }
    setRemovedTaskIndices(newRemoved)
  }, [removedTaskIndices])

  const handleSubmitPlan = useCallback(async () => {
    if (!formData || !token) return

    setUploadState('submitting')
    setUploadError('')

    try {
      // Get active tasks (not removed)
      const activeTasks = formData.tasks.filter(
        (_, index) => !removedTaskIndices.has(index)
      )

      if (activeTasks.length === 0) {
        setUploadError('At least one task must be active')
        setUploadState('error')
        return
      }

      // Create work plan
      const planRes = await authFetch(
        `${API_URL}/api/work-plans`,
        token,
        stableOn401,
        {
          method: 'POST',
          body: JSON.stringify({
            client_id: clientId,
            title: formData.title.trim(),
            description: formData.description?.trim() || null,
            markdown_source: originalMarkdown,
            status: 'draft',
          }),
        }
      )

      if (!planRes || !planRes.ok) {
        setUploadError('Failed to create work plan')
        setUploadState('error')
        return
      }

      const plan = await planRes.json()

      // Create tasks
      let tasksCreated = 0
      for (let i = 0; i < activeTasks.length; i++) {
        const task = activeTasks[i]
        const taskRes = await authFetch(
          `${API_URL}/api/work-plan-tasks`,
          token,
          stableOn401,
          {
            method: 'POST',
            body: JSON.stringify({
              work_plan_id: plan.id,
              title: task.title.trim(),
              description: task.description?.trim() || null,
              status: 'not_started',
              order_index: i + 1,
            }),
          }
        )

        if (taskRes && taskRes.ok) {
          tasksCreated++
        }
      }

      // Refresh work plans
      await fetchWorkPlans()

      setUploadSuccess(`Plan created! ${tasksCreated} task${tasksCreated !== 1 ? 's' : ''} added.`)
      setUploadState('success')

      // Reset after 2 seconds
      setTimeout(() => {
        setFormData(null)
        setOriginalMarkdown('')
        setRemovedTaskIndices(new Set())
        setUploadSuccess('')
        setUploadState('idle')
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }, 2000)
    } catch (err) {
      console.error('Error submitting plan:', err)
      setUploadError('Failed to create work plan and tasks')
      setUploadState('error')
    }
  }, [formData, token, stableOn401, clientId, originalMarkdown, removedTaskIndices, fetchWorkPlans])

  // Filter plans for client view (show active/pending)
  const displayPlans = isAdmin
    ? workPlans
    : workPlans.filter(
        (p) =>
          p.status !== 'archived' &&
          p.status !== 'draft' &&
          p.status !== 'completed'
      )

  // Render upload section (admin only)
  const renderUploadSection = () => {
    if (!isAdmin) return null

    if (uploadState === 'confirmation' && formData) {
      return (
        <div
          style={{
            padding: '24px',
            background: theme.input,
            borderRadius: '8px',
            border: `1px solid ${theme.border}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <h4
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: theme.text,
              margin: 0,
            }}
          >
            Review Plan Details
          </h4>

          {/* Title input */}
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
              Plan Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              style={{
                width: '100%',
                padding: '10px 12px',
                background: theme.card,
                border: `1px solid ${theme.border}`,
                borderRadius: '6px',
                color: theme.text,
                fontFamily: "'Outfit', sans-serif",
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Description input */}
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
              Description (optional)
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              style={{
                width: '100%',
                padding: '10px 12px',
                background: theme.card,
                border: `1px solid ${theme.border}`,
                borderRadius: '6px',
                color: theme.text,
                fontFamily: "'Outfit', sans-serif",
                fontSize: '14px',
                boxSizing: 'border-box',
                minHeight: '80px',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Tasks preview */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
              }}
            >
              <label
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: theme.textMuted,
                  margin: 0,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Tasks to Create
              </label>
              <span
                style={{
                  fontSize: '12px',
                  color: theme.accent,
                  fontWeight: 600,
                }}
              >
                {formData.tasks.length - removedTaskIndices.size} active
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxHeight: '300px',
                overflowY: 'auto',
              }}
            >
              {formData.tasks.map((task, index) => (
                <div
                  key={index}
                  style={{
                    padding: '12px',
                    background: removedTaskIndices.has(index)
                      ? 'rgba(249,113,113,0.1)'
                      : theme.card,
                    border: `1px solid ${
                      removedTaskIndices.has(index)
                        ? theme.statusError
                        : theme.border
                    }`,
                    borderRadius: '6px',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: removedTaskIndices.has(index)
                          ? theme.textMuted
                          : theme.text,
                        textDecoration: removedTaskIndices.has(index)
                          ? 'line-through'
                          : 'none',
                        marginBottom: task.description ? '4px' : 0,
                      }}
                    >
                      {task.title}
                    </div>
                    {task.description && (
                      <div
                        style={{
                          fontSize: '12px',
                          color: theme.textMuted,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          opacity: removedTaskIndices.has(index) ? 0.5 : 1,
                        }}
                      >
                        {task.description}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveTask(index)}
                    style={{
                      padding: '4px 8px',
                      background: 'transparent',
                      color: removedTaskIndices.has(index)
                        ? theme.textMuted
                        : theme.statusError,
                      border: `1px solid ${
                        removedTaskIndices.has(index)
                          ? theme.textMuted
                          : theme.statusError
                      }`,
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: 600,
                      fontFamily: "'Outfit', sans-serif",
                      textTransform: 'uppercase',
                      flexShrink: 0,
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLButtonElement
                      if (!removedTaskIndices.has(index)) {
                        el.style.background = theme.statusError
                        el.style.color = theme.bg
                      }
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLButtonElement
                      if (!removedTaskIndices.has(index)) {
                        el.style.background = 'transparent'
                        el.style.color = theme.statusError
                      }
                    }}
                  >
                    {removedTaskIndices.has(index) ? 'Undo' : 'Remove'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              paddingTop: '12px',
              borderTop: `1px solid ${theme.border}`,
            }}
          >
            <button
              onClick={() => {
                setUploadState('idle')
                setFormData(null)
                setOriginalMarkdown('')
                setRemovedTaskIndices(new Set())
                if (fileInputRef.current) {
                  fileInputRef.current.value = ''
                }
              }}
              disabled={false}
              style={{
                padding: '10px 16px',
                background: 'transparent',
                color: theme.textMuted,
                border: `1px solid ${theme.border}`,
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                fontFamily: "'Outfit', sans-serif",
                transition: 'all 0.2s',
                opacity: 1,
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLButtonElement
                el.style.color = theme.text
                el.style.borderColor = theme.text
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLButtonElement
                el.style.color = theme.textMuted
                el.style.borderColor = theme.border
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitPlan}
              disabled={removedTaskIndices.size === formData.tasks.length}
              style={{
                padding: '10px 16px',
                background:
                  removedTaskIndices.size === formData.tasks.length
                    ? theme.textMuted
                    : theme.primary,
                color: removedTaskIndices.size === formData.tasks.length
                  ? theme.bg
                  : theme.primaryText,
                border: 'none',
                borderRadius: '6px',
                cursor:
                  removedTaskIndices.size === formData.tasks.length
                    ? 'not-allowed'
                    : 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                fontFamily: "'Outfit', sans-serif",
                transition: 'opacity 0.2s',
              }}
            >
              {uploadState === 'confirmation'
                ? 'Create Work Plan'
                : 'Creating Plan...'}
            </button>
          </div>
        </div>
      )
    }

    if (uploadState === 'success') {
      return (
        <div
          style={{
            padding: '16px',
            background: 'rgba(52,211,153,0.1)',
            border: `1px solid ${theme.statusSuccess}`,
            color: theme.statusSuccess,
            borderRadius: '8px',
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '18px' }}>✓</span>
          <span style={{ fontSize: '14px', fontWeight: 500 }}>
            {uploadSuccess}
          </span>
        </div>
      )
    }

    if (uploadState === 'error') {
      return (
        <div
          style={{
            padding: '16px',
            background: 'rgba(248,113,113,0.1)',
            border: `1px solid ${theme.statusError}`,
            color: theme.statusError,
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span style={{ fontSize: '18px' }}>!</span>
            <span style={{ fontSize: '14px', fontWeight: 500 }}>
              {uploadError}
            </span>
          </div>
          <button
            onClick={() => {
              setUploadState('idle')
              setUploadError('')
              if (fileInputRef.current) {
                fileInputRef.current.value = ''
              }
            }}
            style={{
              padding: '6px 12px',
              background: theme.statusError,
              color: theme.bg,
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              fontFamily: "'Outfit', sans-serif",
              alignSelf: 'flex-start',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.opacity = '0.8'
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.opacity = '1'
            }}
          >
            Try Again
          </button>
        </div>
      )
    }

    if (uploadState === 'uploading' || uploadState === 'parsing') {
      return (
        <div
          style={{
            padding: '24px',
            background: theme.input,
            borderRadius: '8px',
            border: `1px solid ${theme.border}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              border: `3px solid ${theme.border}`,
              borderTop: `3px solid ${theme.accent}`,
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <p
            style={{
              margin: 0,
              color: theme.textMuted,
              fontSize: '14px',
            }}
          >
            {uploadState === 'uploading'
              ? 'Reading file...'
              : 'Parsing markdown...'}
          </p>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )
    }

    // Idle state - show upload input
    return (
      <div
        style={{
          padding: '24px',
          background: theme.input,
          borderRadius: '8px',
          border: `2px dashed ${theme.border}`,
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          alignItems: 'center',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLDivElement
          el.style.borderColor = theme.accent
          el.style.background = theme.card
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLDivElement
          el.style.borderColor = theme.border
          el.style.background = theme.input
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <div
          style={{
            fontSize: '28px',
          }}
        >
          📄
        </div>
        <div>
          <p
            style={{
              margin: '0 0 4px 0',
              color: theme.text,
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            Upload Markdown Work Plan
          </p>
          <p
            style={{
              margin: 0,
              color: theme.textMuted,
              fontSize: '12px',
            }}
          >
            Drag and drop or click to select a .md file
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,text/markdown"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) {
              handleFileSelect(file)
            }
          }}
          style={{
            display: 'none',
          }}
        />
      </div>
    )
  }

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
      <div style={{ fontFamily: "'Outfit', sans-serif", display: 'flex', flexDirection: 'column', gap: '24px' }}>
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
        {renderUploadSection()}
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

      {/* Upload Section (Admin Only) */}
      {renderUploadSection()}

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
