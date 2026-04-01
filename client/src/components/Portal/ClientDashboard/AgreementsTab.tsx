import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { portalFetch } from '../../../lib/portalApi'
import { usePortalTheme, t } from '../usePortalTheme'

interface Props {
  on401: () => void
}

interface Agreement {
  id: number
  proposal_id: number
  signed_name: string | null
  signed_at: string | null
  status: 'draft' | 'sent' | 'signed'
}

interface Proposal {
  id: number
  title: string
  status: 'sent' | 'approved' | 'rejected'
  sent_at: string
  approved_at: string | null
  rejected_at: string | null
}

export function AgreementsTab({ on401 }: Props) {
  const { theme } = usePortalTheme()
  const tk = t(theme)
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [agreement, setAgreement] = useState<Agreement | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [signingModalOpen, setSigningModalOpen] = useState(false)
  const [fullName, setFullName] = useState('')
  const [signing, setSigning] = useState(false)

  const loadProposal = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const res = await portalFetch('/api/portal/proposal', on401)
      if (!res) return
      if (!res.ok) {
        setError('Failed to load proposal')
        return
      }
      const data = await res.json() as Proposal | null
      setProposal(data)

      if (data && data.status === 'approved') {
        // Try to fetch agreement
        const agreeRes = await portalFetch(`/api/portal/agreement/${data.id}`, on401)
        if (agreeRes?.ok) {
          const agreeData = await agreeRes.json() as Agreement
          setAgreement(agreeData)
        }
      }
    } catch (err) {
      console.error('Failed to load proposal:', err)
      setError('Failed to load proposal')
    } finally {
      setLoading(false)
    }
  }, [on401])

  useEffect(() => {
    void loadProposal()
  }, [loadProposal])

  const handleApproveProposal = async () => {
    if (!proposal) return
    try {
      const res = await portalFetch(`/api/portal/proposal/${proposal.id}/approve`, on401, {
        method: 'PUT',
      })
      if (res?.ok) {
        setProposal(prev => prev ? { ...prev, status: 'approved', approved_at: new Date().toISOString() } : null)
      }
    } catch (err) {
      console.error('Failed to approve proposal:', err)
    }
  }

  const handleRejectProposal = async () => {
    if (!proposal) return
    try {
      const res = await portalFetch(`/api/portal/proposal/${proposal.id}/reject`, on401, {
        method: 'PUT',
      })
      if (res?.ok) {
        setProposal(prev => prev ? { ...prev, status: 'rejected' } : null)
      }
    } catch (err) {
      console.error('Failed to reject proposal:', err)
    }
  }

  const handleSignAgreement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!proposal || !fullName.trim()) return
    try {
      setSigning(true)
      const res = await portalFetch(`/api/portal/agreement/${proposal.id}/sign`, on401, {
        method: 'POST',
        body: JSON.stringify({ signed_name: fullName }),
      })
      if (res?.ok) {
        setAgreement(prev => prev ? { ...prev, signed_name: fullName, signed_at: new Date().toISOString(), status: 'signed' } : null)
        setSigningModalOpen(false)
        setFullName('')
      }
    } catch (err) {
      console.error('Failed to sign agreement:', err)
    } finally {
      setSigning(false)
    }
  }

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, color: tk.textMuted }}
      >
        Loading agreements…
      </motion.div>
    )
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          background: 'rgba(248,113,113,0.1)',
          border: '1px solid rgba(248,113,113,0.3)',
          color: '#f87171',
          padding: '16px 20px',
          borderRadius: 8,
          fontFamily: 'Outfit, sans-serif',
          fontSize: 14,
        }}
      >
        {error}
      </motion.div>
    )
  }

  if (!proposal) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: tk.bg2,
          border: `1px solid ${tk.border}`,
          borderRadius: 12,
          padding: 32,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
        <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 16, fontWeight: 600, color: tk.text, margin: '0 0 8px' }}>
          No Agreements Yet
        </h3>
        <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, color: tk.textMuted, margin: 0 }}>
          Proposals and agreements will appear here once sent.
        </p>
      </motion.div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Proposal */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: tk.bg2,
          border: `1px solid ${tk.border}`,
          borderRadius: 12,
          padding: 24,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 16, fontWeight: 600, color: tk.text, margin: '0 0 4px' }}>
              Proposal
            </h3>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, color: tk.textMuted, margin: 0 }}>
              Sent: {new Date(proposal.sent_at).toLocaleDateString()}
            </p>
          </div>
          <div
            style={{
              padding: '4px 12px',
              background: proposal.status === 'approved' ? '#10b98120' : proposal.status === 'rejected' ? 'rgba(248,113,113,0.2)' : `${tk.accent}20`,
              color: proposal.status === 'approved' ? '#10b981' : proposal.status === 'rejected' ? '#f87171' : tk.accent,
              borderRadius: 6,
              fontSize: 11,
              fontFamily: 'Outfit, sans-serif',
              fontWeight: 600,
              textTransform: 'capitalize',
              whiteSpace: 'nowrap',
            }}
          >
            {proposal.status}
          </div>
        </div>

        {proposal.status === 'sent' && (
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={handleApproveProposal}
              style={{
                padding: '8px 16px',
                background: '#10b981',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontFamily: 'Outfit, sans-serif',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Approve
            </button>
            <button
              onClick={handleRejectProposal}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                color: '#f87171',
                border: `1px solid #f87171`,
                borderRadius: 8,
                fontSize: 13,
                fontFamily: 'Outfit, sans-serif',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Reject
            </button>
          </div>
        )}
      </motion.div>

      {/* Agreement */}
      {proposal.status === 'approved' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            background: tk.bg2,
            border: `1px solid ${tk.border}`,
            borderRadius: 12,
            padding: 24,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 16, fontWeight: 600, color: tk.text, margin: '0 0 4px' }}>
                Agreement
              </h3>
              {agreement?.signed_at && (
                <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, color: tk.textMuted, margin: 0 }}>
                  Signed by {agreement.signed_name} on {new Date(agreement.signed_at).toLocaleDateString()}
                </p>
              )}
            </div>
            {agreement?.signed_at && (
              <div
                style={{
                  padding: '4px 12px',
                  background: '#10b98120',
                  color: '#10b981',
                  borderRadius: 6,
                  fontSize: 11,
                  fontFamily: 'Outfit, sans-serif',
                  fontWeight: 600,
                }}
              >
                ✓ Signed
              </div>
            )}
          </div>

          {!agreement?.signed_at && (
            <button
              onClick={() => setSigningModalOpen(true)}
              style={{
                padding: '8px 16px',
                background: tk.accent,
                color: '#000',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontFamily: 'Outfit, sans-serif',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Sign Agreement
            </button>
          )}
        </motion.div>
      )}

      {/* Signing Modal */}
      {signingModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => !signing && setSigningModalOpen(false)}
        >
          <motion.form
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onSubmit={handleSignAgreement}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: tk.bg2,
              border: `1px solid ${tk.border}`,
              borderRadius: 12,
              padding: 24,
              maxWidth: 400,
              width: '90%',
            }}
          >
            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 16, fontWeight: 600, color: tk.text, margin: '0 0 16px' }}>
              Sign Agreement
            </h3>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: tk.text, display: 'block', marginBottom: 6 }}>
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                required
                disabled={signing}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: tk.input,
                  border: `1px solid ${tk.border}`,
                  borderRadius: 8,
                  fontFamily: 'Outfit, sans-serif',
                  fontSize: 13,
                  color: tk.text,
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="submit"
                disabled={signing || !fullName.trim()}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  background: tk.accent,
                  color: '#000',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 13,
                  fontFamily: 'Outfit, sans-serif',
                  fontWeight: 600,
                  cursor: signing || !fullName.trim() ? 'not-allowed' : 'pointer',
                  opacity: signing || !fullName.trim() ? 0.5 : 1,
                }}
              >
                {signing ? 'Signing…' : 'Sign'}
              </button>
              <button
                type="button"
                onClick={() => setSigningModalOpen(false)}
                disabled={signing}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  background: 'transparent',
                  color: tk.textMuted,
                  border: `1px solid ${tk.border}`,
                  borderRadius: 8,
                  fontSize: 13,
                  fontFamily: 'Outfit, sans-serif',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </div>
  )
}
