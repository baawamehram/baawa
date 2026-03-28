import { useState, useEffect, useCallback } from 'react'
import { API_URL, authFetch } from '../../lib/api'
import { useDashboardTheme } from './ThemeContext'

interface ProblemDomain {
  domain: string
  subCategory: string
  confidence: number
  rationale: string
}

interface CallSlot {
  id: number
  proposed_slots: { datetime: string; label: string }[]
  selected_slot: string | null
  meeting_link: string | null
  status: 'pending' | 'confirmed' | 'completed'
}

interface Proposal {
  id: number
  title: string
  summary: string | null
  packages: any[]
  total_price: number
  status: 'draft' | 'sent' | 'approved' | 'rejected'
  created_at: string
}

interface Assessment {
  id: number
  email: string
  score: number
  status: 'pending' | 'reviewing' | 'onboarded' | 'deferred'
  score_breakdown: { pmf: number; validation: number; growth: number; mindset: number; revenue: number }
  score_summary: string
  biggest_opportunity: string
  biggest_risk: string
  founder_notes: string
  conversation: Array<{ role: 'user' | 'assistant'; content: string }>
  created_at: string
  results_unlocked?: boolean
  problem_domains?: ProblemDomain[] | null
  founder_name?: string
  company_name?: string
}

interface Props {
  id: number
  token: string
  on401: () => void
  onBack: () => void
}

const DIMENSION_LABELS: Record<string, string> = {
  pmf: 'Product-Market Fit',
  validation: 'Validation',
  growth: 'Growth',
  mindset: 'Mindset',
  revenue: 'Revenue',
}

const DOMAIN_COLORS: Record<string, string> = {
  Marketing: '#FF6B35',
  Sales: '#E85520',
  Engineering: '#3B82F6',
  Operations: '#8B5CF6',
  Strategy: '#F59E0B',
  Finance: '#10B981',
  Research: '#EC4899',
  Product: '#06B6D4',
}

export function SubmissionDetail({ id, token, on401, onBack }: Props) {
  const { theme } = useDashboardTheme()
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [actionMsg, setActionMsg] = useState('')
  const [error, setError] = useState('')
  const [messages, setMessages] = useState<Array<{ id: number; sender: string; body: string; created_at: string }>>([])
  const [messageBody, setMessageBody] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)
  const [unlocking, setUnlocking] = useState(false)

  // Identity state
  const [isEditingIdentity, setIsEditingIdentity] = useState(false)
  const [editFounder, setEditFounder] = useState('')
  const [editCompany, setEditCompany] = useState('')

  // CRM State
  const [call, setCall] = useState<CallSlot | null>(null)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [showCallForm, setShowCallForm] = useState(false)
  const [newSlots, setNewSlots] = useState([{ datetime: '', label: '' }])
  const [meetingLink, setMeetingLink] = useState('')
  
  const [showPropForm, setShowPropForm] = useState(false)
  const [propTitle, setPropTitle] = useState('')
  const [propSummary, setPropSummary] = useState('')
  const [propPrice, setPropPrice] = useState(0)
  const [propPackages] = useState([{ name: '', description: '', price: 0, deliverables: [''] }])

  const loadAll = useCallback(async () => {
    try {
      const [res, msgsRes, callRes, propRes] = await Promise.all([
        authFetch(`${API_URL}/api/assessments/${id}`, token, on401),
        authFetch(`${API_URL}/api/assessments/${id}/messages`, token, on401),
        authFetch(`${API_URL}/api/calls/${id}`, token, on401),
        authFetch(`${API_URL}/api/proposals/assessment/${id}`, token, on401)
      ])
      
      if (res?.ok) {
        const data = await res.json()
        setAssessment(data)
        setNotes(data.founder_notes || '')
        setEditFounder(data.founder_name || '')
        setEditCompany(data.company_name || '')
      }
      if (msgsRes?.ok) setMessages(await msgsRes.json())
      if (callRes?.ok) setCall(await callRes.json())
      if (propRes?.ok) setProposals(await propRes.json())
    } catch {
      setError('Network error loading detailed view.')
    } finally {
      setLoading(false)
    }
  }, [id, token, on401])

  useEffect(() => { void loadAll() }, [loadAll])

  const saveIdentity = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await authFetch(`${API_URL}/api/assessments/${id}/identity`, token, on401, {
        method: 'PUT',
        body: JSON.stringify({ founder_name: editFounder, company_name: editCompany }),
      })
      if (res?.ok) {
        setAssessment(prev => prev ? { ...prev, founder_name: editFounder, company_name: editCompany } : null)
        setIsEditingIdentity(false)
        setActionMsg('Identity updated across platform.')
      } else {
        setError('Failed to update identity.')
      }
    } catch {
      setError('Network error.')
    } finally {
      setSaving(false)
    }
  }

  const saveNotes = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await authFetch(`${API_URL}/api/assessments/${id}/notes`, token, on401, {
        method: 'PUT',
        body: JSON.stringify({ notes }),
      })
      if (!res?.ok) setError('Failed to save notes.')
    } catch { setError('Network error.') }
    finally { setSaving(false) }
  }

  const handleAction = async (action: 'onboard' | 'defer') => {
    if (action === 'defer' && !window.confirm('Send defer email to this founder?')) return
    setError('')
    try {
      const res = await authFetch(`${API_URL}/api/assessments/${id}/${action}`, token, on401, { method: 'POST' })
      if (!res?.ok) return setError('Action failed.')
      setActionMsg(action === 'onboard' ? 'Client onboarded!' : 'Email sent.')
      void loadAll()
    } catch { setError('Network error.') }
  }

  const proposeCall = async () => {
    setError('')
    try {
      const res = await authFetch(`${API_URL}/api/calls`, token, on401, {
        method: 'POST',
        body: JSON.stringify({
          assessment_id: id,
          proposed_slots: newSlots.filter(s => s.datetime),
          meeting_link: meetingLink
        })
      })
      if (res?.ok) {
        setShowCallForm(false)
        setActionMsg('Call slots sent to portal.')
        void loadAll()
      }
    } catch { setError('Failed to propose call.') }
  }

  const createProposal = async () => {
    setError('')
    try {
      const res = await authFetch(`${API_URL}/api/proposals`, token, on401, {
        method: 'POST',
        body: JSON.stringify({
          assessment_id: id,
          title: propTitle,
          summary: propSummary,
          packages: propPackages,
          total_price: propPrice
        })
      })
      if (res?.ok) {
        setShowPropForm(false)
        setActionMsg('Proposal draft created.')
        void loadAll()
      }
    } catch { setError('Failed to create proposal.') }
  }

  const sendProposal = async (propId: number) => {
    try {
      const res = await authFetch(`${API_URL}/api/proposals/${propId}/send`, token, on401, { method: 'PUT' })
      if (res?.ok) {
        setActionMsg('Proposal pushed to portal.')
        void loadAll()
      }
    } catch { setError('Failed to send proposal.') }
  }

  if (loading) return <p style={{ color: theme.textMuted, fontFamily: "'Outfit', sans-serif" }}>Loading...</p>
  if (!assessment) return <p style={{ color: theme.textMuted, fontFamily: "'Outfit', sans-serif" }}>Assessment not found.</p>

  const breakdown = assessment.score_breakdown || {}

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", paddingBottom: '100px' }}>
      <button onClick={onBack} style={{ color: theme.textMuted, background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', marginBottom: '24px', display: 'inline-block', padding: 0 }}>
        &larr; Back to list
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
            {isEditingIdentity ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  value={editFounder}
                  onChange={e => setEditFounder(e.target.value)}
                  placeholder="Founder Name"
                  style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}`, padding: '4px 8px', borderRadius: '4px', fontSize: '20px', fontWeight: 700 }}
                />
                <input
                  value={editCompany}
                  onChange={e => setEditCompany(e.target.value)}
                  placeholder="Company Name"
                  style={{ background: theme.bg, color: theme.text, border: `1px solid ${theme.border}`, padding: '4px 8px', borderRadius: '4px', fontSize: '14px' }}
                />
                <button onClick={saveIdentity} style={{ background: theme.accent, color: '#000', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>SAVE</button>
                <button onClick={() => setIsEditingIdentity(false)} style={{ background: 'transparent', color: theme.textMuted, border: `1px solid ${theme.border}`, padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>CANCEL</button>
              </div>
            ) : (
              <>
                <h2 style={{ fontSize: '28px', fontWeight: 700, color: theme.text, margin: 0 }}>
                  {assessment.founder_name || assessment.email}
                </h2>
                <span style={{ fontSize: '12px', color: theme.textMuted }}>ID: {assessment.id} {assessment.company_name && `• ${assessment.company_name}`}</span>
                <button onClick={() => setIsEditingIdentity(true)} style={{ background: 'none', border: 'none', color: theme.accent, fontSize: '11px', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>Edit Identity</button>
              </>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
            <span style={{ color: theme.primaryText, background: theme.primary, padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>{assessment.status}</span>
            {(assessment.problem_domains || []).map(d => (
              <span key={d.domain} style={{ background: `${DOMAIN_COLORS[d.domain] || '#FF6B35'}20`, color: DOMAIN_COLORS[d.domain] || '#FF6B35', border: `1px solid ${DOMAIN_COLORS[d.domain] || '#FF6B35'}40`, padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>{d.domain}</span>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {!assessment.results_unlocked && (
            <button
              onClick={async () => {
                setUnlocking(true)
                try {
                  const res = await authFetch(`${API_URL}/api/assessments/${id}/unlock-results`, token, on401, { method: 'POST' })
                  if (res?.ok) { 
                    setAssessment(p => p ? { ...p, results_unlocked: true } : p)
                    setActionMsg('Results visible in portal.')
                  }
                } finally { setUnlocking(false) }
              }}
              style={{ background: theme.text, color: theme.bg, border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', opacity: unlocking ? 0.5 : 1 }}
            >
              Unlock Results
            </button>
          )}
          <button onClick={() => handleAction('onboard')} style={{ background: theme.accent, color: '#000', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>Onboard</button>
          <button onClick={() => handleAction('defer')} style={{ background: 'transparent', color: theme.text, border: `1px solid ${theme.border}`, borderRadius: '6px', padding: '8px 16px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>Defer</button>
        </div>
      </div>

      {actionMsg && <div style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80', padding: '12px 16px', borderRadius: '6px', marginBottom: '24px', fontSize: '14px' }}>{actionMsg}</div>}
      {error && <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', padding: '12px 16px', borderRadius: '6px', marginBottom: '24px', fontSize: '14px' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: '24px' }}>
        
        {/* Left Column: Intelligence & Lifecycle */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* AI Intelligence Card */}
          <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: theme.text, margin: '0 0 16px 0', borderBottom: `1px solid ${theme.border}`, paddingBottom: '12px' }}>AI Classification</h3>
            {assessment.problem_domains && assessment.problem_domains.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {assessment.problem_domains.map((d, i) => (
                  <div key={i} style={{ background: theme.input, padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${DOMAIN_COLORS[d.domain] || '#FF6B35'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 700, color: theme.text, fontSize: '14px' }}>{d.domain} &middot; {d.subCategory}</span>
                      <span style={{ color: theme.accent, fontSize: '12px', fontWeight: 700 }}>{d.confidence}% match</span>
                    </div>
                    <p style={{ color: theme.textMuted, fontSize: '13px', margin: '6px 0 0', lineHeight: 1.5 }}>{d.rationale}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: theme.textMuted, fontSize: '14px', fontStyle: 'italic' }}>AI is still classifying this assessment based on the interview transcript...</p>
            )}
          </div>

          {/* Call Scheduler Card */}
          <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: theme.text, margin: 0 }}>Strategic Call</h3>
              {!call && !showCallForm && <button onClick={() => setShowCallForm(true)} style={{ background: theme.text, color: theme.bg, border: 'none', fontSize: '11px', fontWeight: 700, padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>+ PROPOSE SLOTS</button>}
            </div>

            {call && (
              <div style={{ background: theme.input, padding: '12px', borderRadius: '8px', border: `1px solid ${call.status === 'confirmed' ? '#4ade80' : theme.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                   <span style={{ fontSize: '13px', color: theme.textMuted }}>Status: <b style={{ color: theme.text }}>{call.status.toUpperCase()}</b></span>
                   {call.status === 'pending' && <span style={{ color: '#facc15', fontSize: '11px' }}>Waiting for founder...</span>}
                </div>
                {call.selected_slot ? (
                  <div style={{ marginTop: '8px', color: '#4ade80', fontWeight: 700, fontSize: '15px' }}>
                    {new Date(call.selected_slot).toLocaleString()}
                  </div>
                ) : (
                  <div style={{ marginTop: '8px', color: theme.textMuted, fontSize: '12px' }}>Proposed: {call.proposed_slots.length} slots</div>
                )}
                {call.meeting_link && <div style={{ marginTop: '8px', fontSize: '12px', color: '#3B82F6' }}>Link: {call.meeting_link}</div>}
              </div>
            )}

            {showCallForm && (
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ fontSize: '12px', color: theme.textMuted }}>Propose up to 3 date/time options:</label>
                {newSlots.map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px' }}>
                    <input type="datetime-local" value={s.datetime} onChange={e => {
                        const next = [...newSlots]; next[i].datetime = e.target.value; setNewSlots(next);
                    }} style={{ background: theme.bg, border: `1px solid ${theme.border}`, color: theme.text, borderRadius: '4px', padding: '6px', flex: 2, fontSize: '13px' }} />
                    <input placeholder="Label (e.g. Afternoon)" value={s.label} onChange={e => {
                        const next = [...newSlots]; next[i].label = e.target.value; setNewSlots(next);
                    }} style={{ background: theme.bg, border: `1px solid ${theme.border}`, color: theme.text, borderRadius: '4px', padding: '6px', flex: 1, fontSize: '13px' }} />
                  </div>
                ))}
                <button onClick={() => setNewSlots([...newSlots, { datetime: '', label: '' }])} style={{ color: theme.textMuted, fontSize: '11px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>+ Add Option</button>
                <input placeholder="Meeting Link (GMeet/Zoom)" value={meetingLink} onChange={e => setMeetingLink(e.target.value)} style={{ background: theme.bg, border: `1px solid ${theme.border}`, color: theme.text, borderRadius: '4px', padding: '6px', fontSize: '13px' }} />
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button onClick={proposeCall} style={{ background: theme.accent, border: 'none', color: '#000', fontWeight: 700, padding: '8px 16px', borderRadius: '4px', fontSize: '13px', cursor: 'pointer' }}>Send to Portal</button>
                  <button onClick={() => setShowCallForm(false)} style={{ background: 'transparent', border: `1px solid ${theme.border}`, color: theme.text, padding: '8px 16px', borderRadius: '4px', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            )}
          </div>

          {/* Proposal Management */}
          <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
               <h3 style={{ fontSize: '16px', fontWeight: 600, color: theme.text, margin: 0 }}>Proposals</h3>
               {!showPropForm && <button onClick={() => setShowPropForm(true)} style={{ background: theme.text, color: theme.bg, border: 'none', fontSize: '11px', fontWeight: 700, padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>+ NEW DRAFT</button>}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {proposals.map(p => (
                <div key={p.id} style={{ background: theme.input, padding: '12px', borderRadius: '8px', border: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ color: theme.text, fontSize: '14px', fontWeight: 600 }}>{p.title}</div>
                    <div style={{ color: theme.textMuted, fontSize: '11px' }}>Total: £{p.total_price.toLocaleString()} &middot; Status: <span style={{ color: p.status === 'approved' ? '#4ade80' : p.status === 'sent' ? '#3B82F6' : '#facc15' }}>{p.status}</span></div>
                  </div>
                  {p.status === 'draft' && <button onClick={() => sendProposal(p.id)} style={{ background: '#3B82F6', border: 'none', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>SEND</button>}
                  {p.status === 'approved' && <span style={{ fontSize: '16px' }}>✅</span>}
                </div>
              ))}
              {proposals.length === 0 && !showPropForm && <p style={{ color: theme.textMuted, fontSize: '13px' }}>No proposals created yet.</p>}
            </div>

            {showPropForm && (
              <div style={{ marginTop: '20px', borderTop: `1px solid ${theme.border}`, paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input placeholder="Proposal Title" value={propTitle} onChange={e => setPropTitle(e.target.value)} style={{ background: theme.bg, border: `1px solid ${theme.border}`, color: theme.text, borderRadius: '4px', padding: '8px', fontSize: '14px' }} />
                <textarea placeholder="Executive Summary" value={propSummary} onChange={e => setPropSummary(e.target.value)} style={{ background: theme.bg, border: `1px solid ${theme.border}`, color: theme.text, borderRadius: '4px', padding: '8px', fontSize: '13px', minHeight: '60px' }} />
                <input type="number" placeholder="Total Price" value={propPrice} onChange={e => setPropPrice(Number(e.target.value))} style={{ background: theme.bg, border: `1px solid ${theme.border}`, color: theme.text, borderRadius: '4px', padding: '8px', fontSize: '14px' }} />
                <div style={{ display: 'flex', gap: '8px' }}>
                   <button onClick={createProposal} style={{ background: '#4ade80', border: 'none', color: '#000', fontWeight: 700, padding: '8px 16px', borderRadius: '4px', fontSize: '13px', cursor: 'pointer' }}>Save Draft</button>
                   <button onClick={() => setShowPropForm(false)} style={{ background: 'transparent', border: `1px solid ${theme.border}`, color: theme.text, padding: '8px 16px', borderRadius: '4px', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            )}
          </div>

          {/* Conversation & Transcript */}
          <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: theme.text, margin: '0 0 16px 0' }}>Conversation</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '400px', overflowY: 'auto', paddingRight: '12px' }}>
              {(assessment.conversation || []).map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ 
                    maxWidth: '85%', 
                    padding: '12px 14px', 
                    borderRadius: '12px', 
                    fontSize: '13.5px', 
                    background: msg.role === 'user' ? theme.border : theme.input, 
                    color: msg.role === 'user' ? theme.text : theme.textMuted, 
                    lineHeight: 1.5, 
                    borderBottomRightRadius: msg.role === 'user' ? '2px' : '12px', 
                    borderBottomLeftRadius: msg.role === 'user' ? '12px' : '2px',
                    border: `1px solid ${theme.border}`
                  }}>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Breakdown, Notes, Messages */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Status Tracker */}
          <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: theme.text, margin: '0 0 16px 0' }}>Engagement Score</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Object.entries(breakdown).map(([key, value]) => (
                <div key={key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: theme.textMuted, marginBottom: '4px' }}>
                    <span>{DIMENSION_LABELS[key] || key.toUpperCase()}</span>
                    <span>{value}%</span>
                  </div>
                  <div style={{ background: theme.input, borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: theme.accent, width: `${value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gap: '16px' }}>
             <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '20px' }}>
                <h4 style={{ fontSize: '12px', color: '#4ade80', margin: '0 0 6px 0' }}>TOP OPPORTUNITY</h4>
                <p style={{ color: theme.text, fontSize: '13px', margin: 0 }}>{assessment.biggest_opportunity}</p>
             </div>
             <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '20px' }}>
                <h4 style={{ fontSize: '12px', color: '#f87171', margin: '0 0 6px 0' }}>TOP RISK</h4>
                <p style={{ color: theme.text, fontSize: '13px', margin: 0 }}>{assessment.biggest_risk}</p>
             </div>
          </div>

          {/* CRM Notes */}
          <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: theme.text, marginBottom: '12px' }}>CRM Working Notes</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ width: '100%', background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: '6px', padding: '12px', color: theme.text, fontSize: '14px', minHeight: '80px', fontFamily: "'Outfit', sans-serif" }}
              placeholder="Private notes for the team..."
            />
            <button onClick={saveNotes} disabled={saving} style={{ marginTop: '12px', background: theme.primary, color: theme.primaryText, border: 'none', borderRadius: '4px', padding: '8px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.5 : 1 }}>{saving ? 'SAVING...' : 'UPDATE NOTES'}</button>
          </div>

          {/* Portal Messages Chat */}
          <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: theme.text, marginBottom: '16px' }}>Portal Chat</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px', maxHeight: '250px', overflowY: 'auto' }}>
              {messages.map((msg) => (
                <div key={msg.id} style={{ display: 'flex', justifyContent: msg.sender === 'prospect' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '85%', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', background: msg.sender === 'team' ? theme.input : theme.border, color: theme.textMuted, border: `1px solid ${theme.border}` }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, marginBottom: '4px', color: msg.sender === 'team' ? theme.accent : theme.text }}>{msg.sender === 'team' ? 'BAAWA' : 'CLIENT'}</div>
                    {msg.body}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <textarea value={messageBody} onChange={e => setMessageBody(e.target.value)} placeholder="Message the client..." rows={2} style={{ flex: 1, background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: '6px', padding: '10px', color: theme.text, fontSize: '13px', resize: 'none' }} />
              <button
                onClick={async () => {
                   if (!messageBody.trim()) return; setSendingMsg(true);
                   const res = await authFetch(`${API_URL}/api/assessments/${id}/message`, token, on401, { method: 'POST', body: JSON.stringify({ body: messageBody.trim() }) });
                   if (res?.ok) { setMessages(p => [...p, { id: Date.now(), sender: 'team', body: messageBody.trim(), created_at: new Date().toISOString() }]); setMessageBody('') }
                   setSendingMsg(false)
                }}
                disabled={sendingMsg}
                style={{ background: theme.text, color: theme.bg, border: 'none', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', fontWeight: 700, alignSelf: 'flex-end', cursor: 'pointer' }}
              >{sendingMsg ? '..' : 'SEND'}</button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

