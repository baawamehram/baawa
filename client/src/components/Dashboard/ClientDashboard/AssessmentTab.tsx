import { useState, useEffect, useCallback } from 'react'
import { useDashboardTheme } from '../ThemeContext'
import { API_URL, authFetch } from '../../../lib/api'

interface AssessmentTabProps {
  clientId: number
  isAdmin: boolean
  onClose?: () => void
  isLoading?: boolean
  error?: string | null
  token?: string
  on401?: () => void
}

interface ScoreDomain {
  name: string
  score: number
  description?: string
}

interface Assessment {
  id: number
  client_id?: number
  assessment_id?: number
  founder_name: string
  company_name: string
  score: number
  score_breakdown?: {
    [key: string]: number
  }
  score_summary?: string
  biggest_opportunity?: string
  biggest_risk?: string
  conversation?: Array<{
    sender: 'ai' | 'user'
    message: string
    timestamp?: string
  }>
  created_at: string
  completed_at?: string
  status: string
  results_unlocked?: boolean
}

interface ClientData {
  id: number
  assessment_id?: number
  assessments?: Assessment[]
}

function getStatusBadgeColor(status: string, theme: any): string {
  switch (status) {
    case 'completed':
    case 'onboarded':
      return theme.statusSuccess
    case 'reviewing':
      return theme.statusReviewing
    case 'pending':
      return theme.statusPending
    case 'deferred':
      return theme.statusDeferred
    default:
      return theme.textMuted
  }
}

function getScoreColor(score: number, theme: any): string {
  if (score >= 80) return theme.statusSuccess
  if (score >= 60) return theme.statusPending
  return theme.statusError
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function AssessmentTab({
  clientId,
  isAdmin,
  token = '',
  on401 = () => {},
}: AssessmentTabProps) {
  const { theme } = useDashboardTheme()
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [unlocking, setUnlocking] = useState(false)

  const stableOn401 = useCallback(on401, [on401])

  const fetchAssessment = useCallback(async () => {
    if (!token) return
    try {
      setLoading(true)
      setError('')

      // First, get the client to find the assessment_id
      const clientRes = await authFetch(`${API_URL}/api/clients/${clientId}`, token, stableOn401)
      if (!clientRes || !clientRes.ok) {
        setError('Failed to load client data')
        return
      }

      const clientData: ClientData = await clientRes.json()

      // Now fetch the assessment
      if (!clientData.assessment_id) {
        setError('No assessment found for this client')
        return
      }

      const assessmentRes = await authFetch(
        `${API_URL}/api/assessments/${clientData.assessment_id}`,
        token,
        stableOn401
      )
      if (!assessmentRes || !assessmentRes.ok) {
        setError('Failed to load assessment data')
        return
      }

      const assessmentData: Assessment = await assessmentRes.json()
      setAssessment(assessmentData)
    } catch (err) {
      console.error('Error fetching assessment:', err)
      setError('Failed to load assessment')
    } finally {
      setLoading(false)
    }
  }, [clientId, token, stableOn401])

  useEffect(() => {
    fetchAssessment()
  }, [fetchAssessment])

  const handleUnlockResults = useCallback(async () => {
    if (!assessment || !token) return
    try {
      setUnlocking(true)
      const res = await authFetch(
        `${API_URL}/api/assessments/${assessment.id}/unlock-results`,
        token,
        stableOn401,
        { method: 'POST' }
      )
      if (res && res.ok) {
        setAssessment({ ...assessment, results_unlocked: true })
      } else {
        setError('Failed to unlock results')
      }
    } catch (err) {
      console.error('Error unlocking results:', err)
      setError('Failed to unlock results')
    } finally {
      setUnlocking(false)
    }
  }, [assessment, token, stableOn401])

  if (loading) {
    return (
      <div style={{ fontFamily: "'Outfit', sans-serif", color: theme.text }}>
        <div style={{ padding: '32px', textAlign: 'center', color: theme.textMuted }}>
          Loading assessment...
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

  if (!assessment) {
    return (
      <div style={{ fontFamily: "'Outfit', sans-serif" }}>
        <h3 style={{ fontSize: '20px', fontWeight: 600, color: theme.text, margin: '0 0 16px 0', letterSpacing: '0.05em' }}>
          ASSESSMENT
        </h3>
        <div style={{ color: theme.textMuted, padding: '24px', background: theme.card, borderRadius: '8px', border: `1px solid ${theme.border}` }}>
          No assessment found for this client.
        </div>
      </div>
    )
  }

  // Build score breakdown from conversation or score_breakdown field
  const domains: ScoreDomain[] = []
  if (assessment.score_breakdown && typeof assessment.score_breakdown === 'object') {
    Object.entries(assessment.score_breakdown).forEach(([name, score]) => {
      if (typeof score === 'number') {
        domains.push({ name, score })
      }
    })
  }

  // Get problem domains (score < 70)
  const problemDomains = domains.filter(d => d.score < 70).sort((a, b) => a.score - b.score)

  // Parse conversation
  const conversation = Array.isArray(assessment.conversation) ? assessment.conversation : []

  const statusLabel = assessment.status === 'onboarded' ? 'Completed' :
                      assessment.status === 'reviewing' ? 'In Review' :
                      assessment.status === 'pending' ? 'Pending' :
                      assessment.status === 'deferred' ? 'Deferred' : assessment.status

  const badgeColor = getStatusBadgeColor(assessment.status, theme)
  const scoreColor = getScoreColor(assessment.score || 0, theme)

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Assessment Header */}
      <div style={{
        padding: '20px',
        background: theme.card,
        borderRadius: '8px',
        border: `1px solid ${theme.border}`,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '16px',
      }}>
        <div style={{ flex: 1 }}>
          <p style={{ margin: '0 0 4px 0', color: theme.textMuted, fontSize: '12px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Assessment
          </p>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600, color: theme.text }}>
            {assessment.company_name || 'Assessment'}
          </h3>
          <p style={{ margin: '0 0 12px 0', color: theme.textMuted, fontSize: '13px' }}>
            Completed: {formatDate(assessment.completed_at || assessment.created_at)}
          </p>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{
              padding: '8px 12px',
              background: badgeColor,
              color: theme.bg,
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}>
              {statusLabel}
            </div>
          </div>
        </div>
        <div style={{
          textAlign: 'center',
          padding: '12px',
          background: theme.input,
          borderRadius: '6px',
          minWidth: '80px',
        }}>
          <p style={{ margin: '0 0 4px 0', color: theme.textMuted, fontSize: '12px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Overall Score
          </p>
          <p style={{
            margin: 0,
            fontSize: '32px',
            fontWeight: 700,
            color: scoreColor,
          }}>
            {assessment.score || 0}
          </p>
          <p style={{ margin: '4px 0 0 0', color: theme.textMuted, fontSize: '11px' }}>
            / 100
          </p>
        </div>
      </div>

      {/* Score Breakdown */}
      {domains.length > 0 && (
        <div style={{
          padding: '20px',
          background: theme.card,
          borderRadius: '8px',
          border: `1px solid ${theme.border}`,
        }}>
          <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 600, color: theme.text, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Score Breakdown by Domain
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {domains.map((domain) => (
              <div key={domain.name}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px',
                }}>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: theme.text }}>
                    {domain.name}
                  </p>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: getScoreColor(domain.score, theme) }}>
                    {domain.score}/100
                  </p>
                </div>
                <div style={{
                  background: theme.input,
                  borderRadius: '3px',
                  height: '6px',
                  overflow: 'hidden',
                  position: 'relative',
                }}>
                  <div style={{
                    width: `${Math.min(100, (domain.score / 100) * 100)}%`,
                    height: '100%',
                    background: getScoreColor(domain.score, theme),
                    transition: 'width 0.3s ease',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Findings */}
      {(assessment.biggest_opportunity || assessment.biggest_risk || assessment.score_summary) && (
        <div style={{
          padding: '20px',
          background: theme.card,
          borderRadius: '8px',
          border: `1px solid ${theme.border}`,
        }}>
          <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 600, color: theme.text, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Key Findings
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            {assessment.biggest_opportunity && (
              <div style={{
                padding: '14px',
                background: theme.input,
                borderRadius: '6px',
                borderLeft: `3px solid ${theme.statusSuccess}`,
              }}>
                <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 700, color: theme.statusSuccess, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  💡 Biggest Opportunity
                </p>
                <p style={{ margin: 0, fontSize: '13px', color: theme.text, lineHeight: 1.5 }}>
                  {assessment.biggest_opportunity}
                </p>
              </div>
            )}
            {assessment.biggest_risk && (
              <div style={{
                padding: '14px',
                background: theme.input,
                borderRadius: '6px',
                borderLeft: `3px solid ${theme.statusError}`,
              }}>
                <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 700, color: theme.statusError, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  ⚠️ Biggest Risk
                </p>
                <p style={{ margin: 0, fontSize: '13px', color: theme.text, lineHeight: 1.5 }}>
                  {assessment.biggest_risk}
                </p>
              </div>
            )}
            {assessment.score_summary && (
              <div style={{
                padding: '14px',
                background: theme.input,
                borderRadius: '6px',
                borderLeft: `3px solid ${theme.accent}`,
              }}>
                <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 700, color: theme.accent, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  🎯 Recommendation
                </p>
                <p style={{ margin: 0, fontSize: '13px', color: theme.text, lineHeight: 1.5 }}>
                  {assessment.score_summary}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Problem Domains */}
      {problemDomains.length > 0 && (
        <div style={{
          padding: '20px',
          background: theme.card,
          borderRadius: '8px',
          border: `1px solid ${theme.border}`,
        }}>
          <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 600, color: theme.text, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Problem Areas (Score &lt; 70)
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {problemDomains.map((domain) => (
              <div
                key={domain.name}
                style={{
                  padding: '12px',
                  background: theme.input,
                  borderRadius: '6px',
                  borderLeft: `3px solid ${getScoreColor(domain.score, theme)}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 600, color: theme.text }}>
                    {domain.name}
                  </p>
                  {domain.description && (
                    <p style={{ margin: 0, fontSize: '12px', color: theme.textMuted }}>
                      {domain.description}
                    </p>
                  )}
                </div>
                <p style={{
                  margin: 0,
                  fontSize: '14px',
                  fontWeight: 700,
                  color: getScoreColor(domain.score, theme),
                  whiteSpace: 'nowrap',
                  marginLeft: '12px',
                }}>
                  {domain.score}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conversation Transcript */}
      {conversation.length > 0 && (
        <div style={{
          padding: '20px',
          background: theme.card,
          borderRadius: '8px',
          border: `1px solid ${theme.border}`,
        }}>
          <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 600, color: theme.text, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Conversation Transcript
          </h4>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            maxHeight: '500px',
            overflowY: 'auto',
          }}>
            {conversation.map((turn, idx) => (
              <div
                key={idx}
                style={{
                  padding: '12px',
                  background: turn.sender === 'ai' ? theme.input : theme.bg,
                  borderRadius: '6px',
                  borderLeft: `3px solid ${turn.sender === 'ai' ? theme.accent : theme.textMuted}`,
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'flex-start',
                }}
              >
                <div style={{
                  minWidth: '24px',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: turn.sender === 'ai' ? theme.accent : theme.textMuted,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  color: theme.bg,
                  fontWeight: 600,
                  flexShrink: 0,
                }}>
                  {turn.sender === 'ai' ? 'A' : 'Q'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    margin: 0,
                    fontSize: '13px',
                    color: theme.text,
                    lineHeight: 1.5,
                    wordBreak: 'break-word',
                  }}>
                    {turn.message}
                  </p>
                  {turn.timestamp && (
                    <p style={{
                      margin: '4px 0 0 0',
                      fontSize: '11px',
                      color: theme.textMuted,
                    }}>
                      {new Date(turn.timestamp).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin Controls */}
      {isAdmin && (
        <div style={{
          padding: '20px',
          background: theme.card,
          borderRadius: '8px',
          border: `1px solid ${theme.border}`,
        }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: theme.text, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Admin Controls
          </h4>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            {!assessment.results_unlocked ? (
              <>
                <button
                  onClick={handleUnlockResults}
                  disabled={unlocking}
                  style={{
                    padding: '8px 16px',
                    background: theme.primary,
                    color: theme.bg,
                    border: 'none',
                    borderRadius: '6px',
                    cursor: unlocking ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                    fontFamily: "'Outfit', sans-serif",
                    opacity: unlocking ? 0.6 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  {unlocking ? 'Unlocking...' : 'Unlock for Client'}
                </button>
                <p style={{ margin: 0, fontSize: '12px', color: theme.textMuted }}>
                  Make assessment results visible to the client
                </p>
              </>
            ) : (
              <>
                <div style={{
                  padding: '8px 16px',
                  background: theme.statusSuccess,
                  color: theme.bg,
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}>
                  Unlocked for Client
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: theme.statusSuccess }}>
                  Assessment results are visible to the client
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
