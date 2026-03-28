import { useState, useEffect, useCallback } from 'react'
import { portalFetch } from '../../lib/portalApi'
import { t } from './usePortalTheme'

interface ProposalPackage {
  name: string
  description: string
  price: number
  currency: string
  deliverables: string[]
}

interface Proposal {
  id: number
  title: string
  summary: string | null
  packages: ProposalPackage[]
  total_price: number
  currency: string
  status: 'sent' | 'approved' | 'rejected'
  approved_at: string | null
}

interface Agreement {
  status: 'pending' | 'signed'
  signed_name: string | null
  signed_at: string | null
}

interface Props {
  theme: 'light' | 'dark'
  on401: () => void
}

export function PortalProposal({ theme, on401 }: Props) {
  const tk = t(theme)
  const [proposal, setProposal] = useState<Proposal | null | undefined>(undefined)
  const [agreement, setAgreement] = useState<Agreement | null>(null)
  const [approving, setApproving] = useState(false)
  const [signingName, setSigningName] = useState('')
  const [signing, setSigning] = useState(false)
  const [signed, setSigned] = useState(false)

  const loadProposal = useCallback(async () => {
    const res = await portalFetch('/api/portal/proposal', on401)
    if (!res || !res.ok) { setProposal(null); return }
    const data = await res.json()
    setProposal(data)
    if (data?.status === 'approved') {
      const aRes = await portalFetch(`/api/portal/agreement/${data.id}`, on401)
      if (aRes?.ok) {
        const ag = await aRes.json()
        setAgreement(ag)
        if (ag?.status === 'signed') setSigned(true)
      }
    }
  }, [on401])

  useEffect(() => { void loadProposal() }, [loadProposal])

  const approveProposal = async () => {
    if (!proposal) return
    setApproving(true)
    const res = await portalFetch(`/api/portal/proposal/${proposal.id}/approve`, on401, { method: 'PUT' })
    if (res?.ok) void loadProposal()
    setApproving(false)
  }

  const signAgreement = async () => {
    if (!proposal || signingName.trim().length < 2) return
    setSigning(true)
    const res = await portalFetch(`/api/portal/agreement/${proposal.id}/sign`, on401, {
      method: 'POST',
      body: JSON.stringify({ signed_name: signingName.trim() }),
    })
    if (res?.ok) { setSigned(true); void loadProposal() }
    setSigning(false)
  }

  const card = (extra = {}) => ({ background: tk.bg2, border: `1px solid ${tk.border}`, borderRadius: 10, padding: 20, ...extra })

  if (proposal === undefined) return <p style={{ color: tk.textMuted, fontFamily: 'Outfit,sans-serif', fontSize: 14 }}>Loading…</p>

  if (!proposal) {
    return (
      <div style={card({ textAlign: 'center', padding: '40px 20px' })}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
        <h3 style={{ fontFamily: 'Outfit,sans-serif', color: tk.text, fontSize: 16, margin: '0 0 8px' }}>No proposal yet</h3>
        <p style={{ fontFamily: 'Outfit,sans-serif', color: tk.textMuted, fontSize: 13, margin: 0, lineHeight: 1.6 }}>
          After your strategy call, we'll build a tailored proposal for you. It will appear here.
        </p>
      </div>
    )
  }

  const currencySymbol = proposal.currency === 'GBP' ? '£' : proposal.currency === 'USD' ? '$' : proposal.currency

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Proposal Card */}
      <div style={card()}>
        <div style={{ fontFamily: 'Outfit,sans-serif', fontSize: 11, color: tk.accent, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Proposal</div>
        <h2 style={{ fontFamily: 'Outfit,sans-serif', fontSize: 20, color: tk.text, margin: '0 0 8px' }}>{proposal.title}</h2>
        {proposal.summary && <p style={{ fontFamily: 'Outfit,sans-serif', fontSize: 13, color: tk.textMuted, margin: '0 0 20px', lineHeight: 1.65 }}>{proposal.summary}</p>}

        {/* Packages */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          {proposal.packages.map((pkg, i) => (
            <div key={i} style={{ border: `1px solid ${tk.border}`, borderRadius: 8, padding: 14, background: tk.bg }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <span style={{ fontFamily: 'Outfit,sans-serif', fontSize: 14, fontWeight: 700, color: tk.text }}>{pkg.name}</span>
                <span style={{ fontFamily: 'Outfit,sans-serif', fontSize: 16, fontWeight: 700, color: tk.accent }}>{currencySymbol}{pkg.price.toLocaleString()}</span>
              </div>
              <p style={{ fontFamily: 'Outfit,sans-serif', fontSize: 12, color: tk.textMuted, margin: '0 0 8px', lineHeight: 1.5 }}>{pkg.description}</p>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {pkg.deliverables.map((d, j) => (
                  <li key={j} style={{ fontFamily: 'Outfit,sans-serif', fontSize: 12, color: tk.textMuted, marginBottom: 2 }}>{d}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Total */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${tk.border}`, paddingTop: 14 }}>
          <span style={{ fontFamily: 'Outfit,sans-serif', fontSize: 13, color: tk.textMuted }}>Total Investment</span>
          <span style={{ fontFamily: 'Outfit,sans-serif', fontSize: 20, fontWeight: 700, color: tk.text }}>{currencySymbol}{proposal.total_price.toLocaleString()}</span>
        </div>
      </div>

      {/* Approve / Agreement / Signed */}
      {proposal.status === 'sent' && (
        <div style={card()}>
          <p style={{ fontFamily: 'Outfit,sans-serif', fontSize: 13, color: tk.textMuted, margin: '0 0 14px', lineHeight: 1.6 }}>
            If this looks right, approve the proposal to unlock your engagement agreement.
          </p>
          <button
            onClick={() => void approveProposal()}
            disabled={approving}
            style={{ background: tk.accent, color: '#000', border: 'none', borderRadius: 8, padding: '12px 24px', fontFamily: 'Outfit,sans-serif', fontSize: 14, fontWeight: 700, cursor: approving ? 'default' : 'pointer', opacity: approving ? 0.6 : 1 }}
          >
            {approving ? 'Approving…' : '✓ Approve Proposal'}
          </button>
        </div>
      )}

      {proposal.status === 'approved' && !signed && (
        <div style={card({ border: `1px solid ${tk.accentBorder}` })}>
          <div style={{ fontFamily: 'Outfit,sans-serif', fontSize: 11, color: tk.accent, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Sign Engagement Agreement</div>
          <p style={{ fontFamily: 'Outfit,sans-serif', fontSize: 13, color: tk.textMuted, margin: '0 0 16px', lineHeight: 1.65 }}>
            By signing below you confirm your acceptance of the proposed scope, deliverables, and investment. Your digital signature (name, IP address, and timestamp) constitutes a legally binding agreement.
          </p>
          <label style={{ fontFamily: 'Outfit,sans-serif', fontSize: 12, color: tk.textMuted, display: 'block', marginBottom: 6 }}>Type your full legal name to sign</label>
          <input
            type="text"
            value={signingName}
            onChange={e => setSigningName(e.target.value)}
            placeholder="Your Full Name"
            style={{ width: '100%', background: tk.bg, border: `1px solid ${tk.border}`, borderRadius: 6, padding: '10px 12px', color: tk.text, fontSize: 16, fontFamily: 'Outfit,sans-serif', outline: 'none', boxSizing: 'border-box', marginBottom: 12 }}
          />
          {signingName.trim().length >= 2 && (
            <div style={{ fontFamily: 'Dancing Script, Brush Script MT, cursive', fontSize: 28, color: tk.accent, marginBottom: 12, opacity: 0.9 }}>{signingName}</div>
          )}
          <button
            onClick={() => void signAgreement()}
            disabled={signing || signingName.trim().length < 2}
            style={{ background: signing || signingName.trim().length < 2 ? 'transparent' : tk.accent, color: signing || signingName.trim().length < 2 ? tk.textMuted : '#000', border: `1px solid ${tk.accentBorder}`, borderRadius: 8, padding: '12px 24px', fontFamily: 'Outfit,sans-serif', fontSize: 14, fontWeight: 700, cursor: signing || signingName.trim().length < 2 ? 'default' : 'pointer' }}
          >
            {signing ? 'Signing…' : '✍ Sign Agreement — Begin Engagement'}
          </button>
        </div>
      )}

      {(signed || agreement?.status === 'signed') && (
        <div style={card({ background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.25)' })}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>✅</span>
            <div>
              <div style={{ fontFamily: 'Outfit,sans-serif', fontSize: 15, fontWeight: 700, color: '#4ade80' }}>Agreement Signed</div>
              <div style={{ fontFamily: 'Outfit,sans-serif', fontSize: 12, color: tk.textMuted }}>
                Signed by {agreement?.signed_name ?? 'you'}{agreement?.signed_at ? ` on ${new Date(agreement.signed_at).toLocaleDateString()}` : ''}. Work begins shortly.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
