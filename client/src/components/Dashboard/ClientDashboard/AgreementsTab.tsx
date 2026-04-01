import { useState, useEffect, useCallback, useMemo } from 'react'
import { useDashboardTheme } from '../ThemeContext'
import { API_URL, authFetch } from '../../../lib/api'

interface AgreementsTabProps {
  clientId: number
  isAdmin: boolean
  onClose?: () => void
  isLoading?: boolean
  error?: string | null
  token?: string
  on401?: () => void
}

interface Agreement {
  id: number
  proposal_id: number
  assessment_id: number
  signed_name?: string
  signed_at?: string
  signed_ip?: string
  signed_user_agent?: string
  status: 'unsigned' | 'pending' | 'signed' | 'expired'
  created_at: string
  proposal_title?: string
  proposal_summary?: string
  proposal_status?: string
}

interface Proposal {
  id: number
  assessment_id: number
  title: string
  summary?: string
  total_price?: number
  currency?: string
  status: string
  sent_at?: string
  created_at: string
}

function getStatusBadgeColor(status: string, theme: any): string {
  switch (status) {
    case 'signed':
      return theme.statusSuccess
    case 'pending':
      return theme.statusPending
    case 'expired':
      return theme.statusError
    case 'unsigned':
    default:
      return theme.textMuted
  }
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}


export function AgreementsTab({
  clientId,
  isAdmin,
  token = '',
  on401 = () => {},
}: AgreementsTabProps) {
  const { theme } = useDashboardTheme()
  const [agreements, setAgreements] = useState<Agreement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedAgreement, setExpandedAgreement] = useState<number | null>(null)
  const [signingModal, setSigningModal] = useState<{ agreementId: number; proposalTitle: string } | null>(null)
  const [signing, setSigning] = useState(false)
  const [assessmentId, setAssessmentId] = useState<number | null>(null)

  const stableOn401 = useCallback(on401, [on401])

  // Fetch client and their assessment ID
  const fetchClientData = useCallback(async () => {
    if (!token) return
    try {
      const res = await authFetch(`${API_URL}/api/clients/${clientId}`, token, stableOn401)
      if (!res || !res.ok) {
        console.error('Failed to fetch client')
        return
      }
      const data = await res.json()
      if (data.assessment_id) {
        setAssessmentId(data.assessment_id)
      }
    } catch (err) {
      console.error('Error fetching client:', err)
    }
  }, [clientId, token, stableOn401])

  // Fetch agreements and proposals
  const fetchData = useCallback(async () => {
    if (!token || !assessmentId) return
    try {
      setLoading(true)
      setError('')

      // Fetch proposals for this assessment
      const proposalRes = await authFetch(
        `${API_URL}/api/proposals/assessment/${assessmentId}`,
        token,
        stableOn401
      )
      if (proposalRes && proposalRes.ok) {
        const proposalData: Proposal[] = await proposalRes.json()

        // Build agreements from proposals (since agreements are linked to proposals)
        const agreementsList: Agreement[] = Array.isArray(proposalData)
          ? proposalData.map((proposal) => ({
              id: proposal.id,
              proposal_id: proposal.id,
              assessment_id: assessmentId,
              proposal_title: proposal.title,
              proposal_summary: proposal.summary,
              proposal_status: proposal.status,
              status: proposal.status === 'sent' ? 'pending' : proposal.status === 'approved' ? 'signed' : 'unsigned',
              created_at: proposal.created_at,
              signed_at: undefined,
              signed_name: undefined,
            }))
          : []
        setAgreements(agreementsList)
      }
    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Failed to load agreements')
    } finally {
      setLoading(false)
    }
  }, [assessmentId, token, stableOn401])

  useEffect(() => {
    fetchClientData()
  }, [fetchClientData])

  useEffect(() => {
    if (assessmentId) {
      fetchData()
    }
  }, [assessmentId, fetchData])

  // Filter agreements based on user role
  const filteredAgreements = useMemo(() => {
    let result = [...agreements]
    if (!isAdmin) {
      // Clients only see signed and pending agreements
      result = result.filter((a) => a.status === 'signed' || a.status === 'pending')
    }
    return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [agreements, isAdmin])

  const handleSendForSignature = useCallback(
    async (agreementId: number) => {
      if (!token) return
      try {
        // In a real implementation, this would call an API endpoint
        // For now, we'll update the status locally
        setAgreements((prev) =>
          prev.map((a) =>
            a.id === agreementId
              ? { ...a, status: 'pending', signed_at: undefined }
              : a
          )
        )
        // You could show a toast/notification here
      } catch (err) {
        console.error('Error sending for signature:', err)
        setError('Failed to send for signature')
      }
    },
    [token]
  )

  const handleDownloadAgreement = useCallback((agreement: Agreement) => {
    // In a real implementation, this would download the PDF/document
    // For now, we'll show an alert
    alert(`Downloading: ${agreement.proposal_title}`)
  }, [])

  if (loading) {
    return (
      <div style={{ fontFamily: "'Outfit', sans-serif", color: theme.text }}>
        <div style={{ padding: '32px', textAlign: 'center', color: theme.textMuted }}>
          Loading agreements...
        </div>
      </div>
    )
  }

  if (error && agreements.length === 0) {
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

  if (filteredAgreements.length === 0) {
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
          AGREEMENTS
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
          {agreements.length === 0
            ? isAdmin
              ? 'No agreements yet. Create a proposal to get started.'
              : 'No agreements available.'
            : 'No agreements visible with your current filters.'}
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
        AGREEMENTS
      </h3>

      {/* Agreements List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredAgreements.map((agreement) => (
          <div key={agreement.id}>
            {/* Agreement Card Header */}
            <div
              onClick={() =>
                setExpandedAgreement(expandedAgreement === agreement.id ? null : agreement.id)
              }
              style={{
                padding: '16px',
                background: theme.card,
                borderRadius: '8px',
                border: `1px solid ${theme.border}`,
                borderLeft: `3px solid ${getStatusBadgeColor(agreement.status, theme)}`,
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
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '8px',
                    flexWrap: 'wrap',
                  }}
                >
                  <h4
                    style={{
                      margin: 0,
                      fontSize: '15px',
                      fontWeight: 600,
                      color: theme.text,
                    }}
                  >
                    {agreement.proposal_title || 'Untitled Agreement'}
                  </h4>
                  <div
                    style={{
                      padding: '4px 12px',
                      background: getStatusBadgeColor(agreement.status, theme),
                      color: agreement.status === 'unsigned' || agreement.status === 'expired'
                        ? theme.text
                        : theme.bg,
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {agreement.status}
                  </div>
                </div>

                {/* Agreement Meta Info */}
                <div
                  style={{
                    display: 'flex',
                    gap: '16px',
                    fontSize: '13px',
                    color: theme.textMuted,
                    flexWrap: 'wrap',
                  }}
                >
                  <span>Created: {formatDate(agreement.created_at)}</span>
                  {agreement.signed_at && (
                    <span style={{ color: theme.statusSuccess }}>
                      Signed: {formatDate(agreement.signed_at)}
                    </span>
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
                {expandedAgreement === agreement.id ? '▼' : '▶'}
              </div>
            </div>

            {/* Expanded Details Panel */}
            {expandedAgreement === agreement.id && (
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
                {/* Agreement Summary */}
                {agreement.proposal_summary && (
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
                      Summary
                    </h5>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '13px',
                        color: theme.text,
                        lineHeight: 1.5,
                      }}
                    >
                      {agreement.proposal_summary}
                    </p>
                  </div>
                )}

                {/* Agreement Info Grid */}
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
                        background: getStatusBadgeColor(agreement.status, theme),
                        color: agreement.status === 'unsigned' || agreement.status === 'expired'
                          ? theme.text
                          : theme.bg,
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 600,
                        display: 'inline-block',
                        textTransform: 'uppercase',
                      }}
                    >
                      {agreement.status}
                    </div>
                  </div>

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
                      {formatDate(agreement.created_at)}
                    </p>
                  </div>

                  {agreement.signed_at && (
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
                        Signed Date
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '13px',
                          color: theme.statusSuccess,
                        }}
                      >
                        {formatDate(agreement.signed_at)}
                      </p>
                    </div>
                  )}

                  {agreement.signed_name && (
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
                        Signed By
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '13px',
                          color: theme.text,
                        }}
                      >
                        {agreement.signed_name}
                      </p>
                    </div>
                  )}
                </div>

                {/* Admin Actions */}
                {isAdmin && agreement.status === 'unsigned' && (
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

                    <button
                      onClick={() =>
                        setSigningModal({
                          agreementId: agreement.id,
                          proposalTitle: agreement.proposal_title || 'Agreement',
                        })
                      }
                      style={{
                        padding: '10px 20px',
                        background: theme.accent,
                        color: theme.primaryText,
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
                    >
                      Send for Signature
                    </button>
                  </div>
                )}

                {/* Download Button */}
                {(agreement.status === 'signed' || isAdmin) && (
                  <div
                    style={{
                      paddingTop: '12px',
                      borderTop: `1px solid ${theme.border}`,
                    }}
                  >
                    <button
                      onClick={() => handleDownloadAgreement(agreement)}
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
                    >
                      Download Agreement
                    </button>
                  </div>
                )}

                {/* Client View - Needs Signature */}
                {!isAdmin && agreement.status === 'pending' && (
                  <div
                    style={{
                      paddingTop: '12px',
                      borderTop: `1px solid ${theme.border}`,
                      padding: '12px',
                      background: 'rgba(251, 191, 36, 0.1)',
                      borderRadius: '6px',
                      border: `1px solid ${theme.statusPending}`,
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: '13px',
                        color: theme.statusPending,
                        fontWeight: 600,
                      }}
                    >
                      This agreement needs your signature. Please sign it to proceed.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Signing Modal */}
      {signingModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => !signing && setSigningModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: theme.card,
              border: `1px solid ${theme.border}`,
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '500px',
              width: '90%',
            }}
          >
            <h4
              style={{
                margin: '0 0 16px 0',
                fontSize: '18px',
                fontWeight: 600,
                color: theme.text,
              }}
            >
              Send {signingModal.proposalTitle} for Signature
            </h4>

            <div
              style={{
                marginBottom: '16px',
              }}
            >
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
                Confirm Details
              </label>
              <div
                style={{
                  padding: '12px',
                  background: theme.input,
                  borderRadius: '6px',
                  border: `1px solid ${theme.border}`,
                  fontSize: '13px',
                  color: theme.text,
                }}
              >
                <p style={{ margin: '0 0 8px 0' }}>
                  <strong>Agreement:</strong> {signingModal.proposalTitle}
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Status:</strong> Will be marked as pending signature
                </p>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end',
              }}
            >
              <button
                onClick={() => setSigningModal(null)}
                disabled={signing}
                style={{
                  padding: '10px 20px',
                  background: theme.input,
                  color: theme.text,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '6px',
                  cursor: signing ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  fontFamily: "'Outfit', sans-serif",
                  opacity: signing ? 0.6 : 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setSigning(true)
                  await handleSendForSignature(signingModal.agreementId)
                  setSigningModal(null)
                  setSigning(false)
                }}
                disabled={signing}
                style={{
                  padding: '10px 20px',
                  background: theme.accent,
                  color: theme.primaryText,
                  border: 'none',
                  borderRadius: '6px',
                  cursor: signing ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  fontFamily: "'Outfit', sans-serif",
                  opacity: signing ? 0.6 : 1,
                }}
              >
                {signing ? 'Sending...' : 'Send for Signature'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
