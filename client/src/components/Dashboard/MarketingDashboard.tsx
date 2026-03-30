import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { API_URL } from '../../lib/api'

const EMAIL_TYPES = ['confirmation', 'value_reminder', 'social_proof', 'objection_handler', 'last_touch', 'reengagement', 'pre_call', 'post_call'] as const
type EmailType = typeof EMAIL_TYPES[number]
type Tab = 'analytics' | 'sequences' | 'templates' | 'abtests'

interface StatsData {
  assessmentsThisWeek: number
  assessmentsThisMonth: number
  emailsByType: { email_type: string; count: number }[]
  funnel: { total_assessments: number; total_emails: number; calls_booked: number }
  recentQueue: { assessment_id: number; name: string; email_type: string; sent_at: string }[]
}

interface SequenceConfig {
  email_type: string
  enabled: boolean
  delay_hours: number
  updated_at: string
}

interface TemplateData {
  email_type: string
  subject: string
  html_body: string
  is_default: boolean
  updated_at: string
}

interface ABTest {
  id: number
  email_type: string
  variant_name: string
  subject: string
  html_body: string
  traffic_split: number
  active: boolean
  winner: boolean
  created_at: string
  variant_sends: number
  control_sends: number
}

interface Props {
  token: string
  on401: () => void
}

export function MarketingDashboard({ token, on401 }: Props) {
  const [tab, setTab] = useState<Tab>('analytics')

  return (
    <div style={{ padding: 24 }}>
      {/* Tab nav */}
      <div style={{
        display: 'flex',
        gap: 12,
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        padding: 8,
        marginBottom: 32,
        width: 'fit-content',
      }}>
        {(['analytics', 'sequences', 'templates', 'abtests'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: tab === t ? 'rgba(5,150,105,0.2)' : 'transparent',
              border: tab === t ? '1px solid #059669' : 'none',
              borderRadius: 6,
              padding: '8px 16px',
              fontFamily: "'Outfit', sans-serif",
              fontSize: 13,
              fontWeight: tab === t ? 600 : 400,
              color: tab === t ? '#059669' : 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {tab === 'analytics' && <AnalyticsTab token={token} on401={on401} />}
          {tab === 'sequences' && <SequencesTab token={token} on401={on401} />}
          {tab === 'templates' && <TemplatesTab token={token} />}
          {tab === 'abtests' && <ABTestsTab token={token} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function AnalyticsTab({ token, on401 }: Props) {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/api/marketing/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) { if (res.status === 401) on401(); return }
        const data = await res.json()
        setStats(data)
      } catch (err) {
        setError('Failed to load analytics')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [token, on401])

  if (loading) return <div style={{ color: '#999', fontFamily: "'Outfit', sans-serif" }}>Loading analytics...</div>
  if (error || !stats) return <div style={{ color: '#f87171', fontFamily: "'Outfit', sans-serif" }}>{error || 'No data'}</div>

  const { total_assessments = 0, total_emails = 0, calls_booked = 0 } = stats.funnel || {}
  const emailToCall = total_emails > 0 ? Math.round((calls_booked / total_emails) * 100) : 0
  const assessmentToEmail = total_assessments > 0 ? Math.round((total_emails / total_assessments) * 100) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Stat cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
      }}>
        {[
          { label: 'This Week', value: stats.assessmentsThisWeek },
          { label: 'This Month', value: stats.assessmentsThisMonth },
          { label: 'Calls Booked', value: calls_booked },
          { label: 'Emails Sent', value: total_emails },
        ].map(card => (
          <div
            key={card.label}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              padding: 20,
            }}
          >
            <div style={{ color: '#999', fontSize: 12, marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#059669' }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Funnel */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        padding: 20,
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: '#fff' }}>Conversion Funnel</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Assessments</div>
            <div style={{
              background: '#059669',
              height: 40,
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              paddingLeft: 12,
              color: '#000',
              fontWeight: 600,
            }}>
              {total_assessments}
            </div>
          </div>
          <div style={{ fontSize: 14, color: '#666' }}>→</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Emails ({assessmentToEmail}%)</div>
            <div style={{
              background: 'rgba(5,150,105,0.6)',
              height: 40,
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              paddingLeft: 12,
              color: '#fff',
              fontWeight: 600,
            }}>
              {total_emails}
            </div>
          </div>
          <div style={{ fontSize: 14, color: '#666' }}>→</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Calls ({emailToCall}%)</div>
            <div style={{
              background: 'rgba(5,150,105,0.3)',
              height: 40,
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              paddingLeft: 12,
              color: '#fff',
              fontWeight: 600,
            }}>
              {calls_booked}
            </div>
          </div>
        </div>
      </div>

      {/* Emails by type */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        padding: 20,
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: '#fff' }}>Emails by Type</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {stats.emailsByType.map(et => {
            const max = Math.max(...stats.emailsByType.map(x => x.count))
            const width = max > 0 ? (et.count / max) * 100 : 0
            return (
              <div key={et.email_type} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 60px', gap: 12, alignItems: 'center' }}>
                <div style={{ fontSize: 12, color: '#999', textTransform: 'capitalize' }}>{et.email_type}</div>
                <div style={{
                  background: 'rgba(5,150,105,0.3)',
                  height: 24,
                  borderRadius: 4,
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    background: '#059669',
                    height: '100%',
                    width: `${width}%`,
                    transition: 'width 0.3s',
                  }} />
                </div>
                <div style={{ fontSize: 12, color: '#ccc', textAlign: 'right' }}>{et.count}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent sends */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        padding: 20,
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: '#fff' }}>Recent Sends (Last 50)</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflowY: 'auto' }}>
          {stats.recentQueue.map((item, i) => (
            <div key={i} style={{
              display: 'grid',
              gridTemplateColumns: '80px 1fr 120px 120px',
              gap: 12,
              padding: '8px 0',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              fontSize: 12,
              color: '#ccc',
            }}>
              <div>#{item.assessment_id}</div>
              <div>{item.name || '—'}</div>
              <div style={{ textTransform: 'capitalize', color: '#059669' }}>{item.email_type}</div>
              <div style={{ color: '#999' }}>{new Date(item.sent_at).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SequencesTab({ token, on401 }: Props) {
  const [sequences, setSequences] = useState<SequenceConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [savingType, setSavingType] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/api/marketing/sequences`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) { if (res.status === 401) on401(); return }
        const data = await res.json()
        setSequences(data)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [token, on401])

  const handleToggle = async (emailType: string, enabled: boolean) => {
    setSavingType(emailType)
    try {
      const res = await fetch(`${API_URL}/api/marketing/sequences/${emailType}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled }),
      })
      if (res.ok) {
        setSequences(s => s.map(x => x.email_type === emailType ? { ...x, enabled: !x.enabled } : x))
      }
    } finally {
      setSavingType(null)
    }
  }

  if (loading) return <div style={{ color: '#999' }}>Loading sequences...</div>

  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 8,
      overflow: 'hidden',
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <th style={{ padding: 16, textAlign: 'left', color: '#999', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Email Type</th>
            <th style={{ padding: 16, textAlign: 'left', color: '#999', fontSize: 12, fontWeight: 600 }}>Delay (hours)</th>
            <th style={{ padding: 16, textAlign: 'center', color: '#999', fontSize: 12, fontWeight: 600 }}>Enabled</th>
            <th style={{ padding: 16, textAlign: 'center', color: '#999', fontSize: 12, fontWeight: 600 }}>Save</th>
          </tr>
        </thead>
        <tbody>
          {sequences.map(seq => {
            const [delayInput, setDelayInput] = useState(seq.delay_hours)
            return (
              <tr key={seq.email_type} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: 16, color: '#ccc', fontSize: 13, textTransform: 'capitalize' }}>{seq.email_type}</td>
                <td style={{ padding: 16 }}>
                  <input
                    type="number"
                    value={delayInput}
                    onChange={(e) => setDelayInput(Number(e.target.value))}
                    step="0.5"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 4,
                      padding: '6px 8px',
                      color: '#ccc',
                      fontFamily: "'Outfit', sans-serif",
                      fontSize: 13,
                      width: 80,
                    }}
                  />
                </td>
                <td style={{ padding: 16, textAlign: 'center' }}>
                  <button
                    onClick={() => handleToggle(seq.email_type, seq.enabled)}
                    disabled={savingType === seq.email_type}
                    style={{
                      background: seq.enabled ? 'rgba(5,150,105,0.4)' : 'rgba(255,255,255,0.1)',
                      border: `1px solid ${seq.enabled ? '#059669' : 'rgba(255,255,255,0.2)'}`,
                      borderRadius: 4,
                      padding: '4px 12px',
                      color: seq.enabled ? '#059669' : '#999',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 600,
                      fontFamily: "'Outfit', sans-serif",
                    }}
                  >
                    {seq.enabled ? 'On' : 'Off'}
                  </button>
                </td>
                <td style={{ padding: 16, textAlign: 'center' }}>
                  <button
                    disabled={savingType === seq.email_type}
                    style={{
                      background: 'rgba(5,150,105,0.3)',
                      border: 'none',
                      borderRadius: 4,
                      padding: '6px 12px',
                      color: '#059669',
                      cursor: savingType === seq.email_type ? 'default' : 'pointer',
                      fontSize: 12,
                      fontWeight: 600,
                      fontFamily: "'Outfit', sans-serif",
                      opacity: savingType === seq.email_type ? 0.5 : 1,
                    }}
                  >
                    {savingType === seq.email_type ? '...' : 'Save'}
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function TemplatesTab({ token }: { token: string }) {
  const [selectedType, setSelectedType] = useState<EmailType>('confirmation')
  const [template, setTemplate] = useState<TemplateData | null>(null)
  const [editSubject, setEditSubject] = useState('')
  const [editBody, setEditBody] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/api/marketing/templates/${selectedType}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setTemplate(data)
          setEditSubject(data.subject)
          setEditBody(data.html_body)
        }
      } catch (err) {
        console.error('Failed to load template')
      }
    }
    void load()
  }, [selectedType, token])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/api/marketing/templates/${selectedType}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: editSubject, html_body: editBody }),
      })
      if (res.ok) {
        setTemplate(t => t ? { ...t, subject: editSubject, html_body: editBody, is_default: false } : null)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    try {
      const res = await fetch(`${API_URL}/api/marketing/templates/${selectedType}/reset`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        // Reload
        const getRes = await fetch(`${API_URL}/api/marketing/templates/${selectedType}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (getRes.ok) {
          const data = await getRes.json()
          setTemplate(data)
          setEditSubject(data.subject)
          setEditBody(data.html_body)
        }
      }
    } catch (err) {
      console.error('Failed to reset')
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 24 }}>
      {/* Type list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {EMAIL_TYPES.map(type => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            style={{
              background: selectedType === type ? 'rgba(5,150,105,0.2)' : 'transparent',
              border: selectedType === type ? '1px solid #059669' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6,
              padding: '8px 12px',
              color: selectedType === type ? '#059669' : '#ccc',
              fontFamily: "'Outfit', sans-serif",
              fontSize: 12,
              fontWeight: selectedType === type ? 600 : 400,
              textAlign: 'left',
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Editor */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {template && (
          <>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#999', textTransform: 'uppercase', marginBottom: 6 }}>Subject</label>
              <input
                type="text"
                value={editSubject}
                onChange={(e) => setEditSubject(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 6,
                  padding: '10px 12px',
                  color: '#ccc',
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 13,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#999', textTransform: 'uppercase', marginBottom: 6 }}>HTML Body</label>
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: 300,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 6,
                  padding: '12px',
                  color: '#ccc',
                  fontFamily: "monospace",
                  fontSize: 12,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  background: 'rgba(5,150,105,0.4)',
                  border: '1px solid #059669',
                  borderRadius: 6,
                  padding: '8px 16px',
                  color: '#059669',
                  cursor: 'pointer',
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: 600,
                  fontSize: 13,
                  opacity: saving ? 0.5 : 1,
                }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={handleReset}
                disabled={template.is_default}
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 6,
                  padding: '8px 16px',
                  color: '#f87171',
                  cursor: template.is_default ? 'default' : 'pointer',
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: 600,
                  fontSize: 13,
                  opacity: template.is_default ? 0.5 : 1,
                }}
              >
                Reset to Default
              </button>
              <button
                onClick={() => setPreviewOpen(true)}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 6,
                  padding: '8px 16px',
                  color: '#ccc',
                  cursor: 'pointer',
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                Preview
              </button>
            </div>

            {previewOpen && (
              <div style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
              }}>
                <div style={{
                  background: '#1a1a1a',
                  borderRadius: 8,
                  width: '90%',
                  maxWidth: 700,
                  maxHeight: '90vh',
                  display: 'flex',
                  flexDirection: 'column',
                }}>
                  <div style={{ padding: 16, borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Preview</div>
                    <button
                      onClick={() => setPreviewOpen(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#999',
                        fontSize: 20,
                        cursor: 'pointer',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  <div style={{ flex: 1, overflow: 'auto' }}>
                    <iframe
                      srcDoc={editBody}
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        background: '#fff',
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ABTestsTab({ token }: { token: string }) {
  const [tests, setTests] = useState<ABTest[]>([])
  const [loading, setLoading] = useState(true)
  const [creatingFor, setCreatingFor] = useState<EmailType | null>(null)
  const [newVariant, setNewVariant] = useState({ variant_name: '', subject: '', html_body: '', traffic_split: 0.5 })

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/api/marketing/ab-tests`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setTests(data)
        }
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [token])

  const handleCreateTest = async () => {
    if (!creatingFor || !newVariant.variant_name) return
    try {
      const res = await fetch(`${API_URL}/api/marketing/ab-tests`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_type: creatingFor, ...newVariant }),
      })
      if (res.ok) {
        const data = await res.json()
        setTests(t => [...t, { ...newVariant, email_type: creatingFor, id: data.id, active: true, winner: false, created_at: new Date().toISOString(), variant_sends: 0, control_sends: 0 }])
        setCreatingFor(null)
        setNewVariant({ variant_name: '', subject: '', html_body: '', traffic_split: 0.5 })
      }
    } catch (err) {
      console.error('Failed to create test')
    }
  }

  const handleDeclareWinner = async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/api/marketing/ab-tests/${id}/declare-winner`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ apply_to_template: confirm('Apply variant as main template?') }),
      })
      if (res.ok) {
        setTests(t => t.map(x => x.id === id ? { ...x, active: false, winner: true } : x))
      }
    } catch (err) {
      console.error('Failed to declare winner')
    }
  }

  if (loading) return <div style={{ color: '#999' }}>Loading A/B tests...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Create form */}
      {!creatingFor && (
        <button
          onClick={() => setCreatingFor('confirmation')}
          style={{
            background: 'rgba(5,150,105,0.2)',
            border: '1px solid #059669',
            borderRadius: 6,
            padding: '12px 20px',
            color: '#059669',
            cursor: 'pointer',
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 600,
            fontSize: 13,
            width: 'fit-content',
          }}
        >
          + Create New Test
        </button>
      )}

      {creatingFor && (
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8,
          padding: 20,
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <select
            value={creatingFor}
            onChange={(e) => setCreatingFor(e.target.value as EmailType)}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 4,
              padding: '8px 12px',
              color: '#ccc',
              fontFamily: "'Outfit', sans-serif",
              fontSize: 12,
            }}
          >
            {EMAIL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input
            type="text"
            placeholder="Variant name"
            value={newVariant.variant_name}
            onChange={(e) => setNewVariant(v => ({ ...v, variant_name: e.target.value }))}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 4,
              padding: '8px 12px',
              color: '#ccc',
              fontFamily: "'Outfit', sans-serif",
              fontSize: 12,
            }}
          />
          <input
            type="text"
            placeholder="Subject"
            value={newVariant.subject}
            onChange={(e) => setNewVariant(v => ({ ...v, subject: e.target.value }))}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 4,
              padding: '8px 12px',
              color: '#ccc',
              fontFamily: "'Outfit', sans-serif",
              fontSize: 12,
            }}
          />
          <textarea
            placeholder="HTML body"
            value={newVariant.html_body}
            onChange={(e) => setNewVariant(v => ({ ...v, html_body: e.target.value }))}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 4,
              padding: '8px 12px',
              color: '#ccc',
              fontFamily: "monospace",
              fontSize: 12,
              minHeight: 150,
            }}
          />
          <div>
            <label style={{ fontSize: 11, color: '#999' }}>Traffic split: {Math.round(newVariant.traffic_split * 100)}%</label>
            <input
              type="range"
              min="0.1"
              max="0.9"
              step="0.1"
              value={newVariant.traffic_split}
              onChange={(e) => setNewVariant(v => ({ ...v, traffic_split: Number(e.target.value) }))}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleCreateTest}
              style={{
                background: 'rgba(5,150,105,0.4)',
                border: '1px solid #059669',
                borderRadius: 4,
                padding: '8px 16px',
                color: '#059669',
                cursor: 'pointer',
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 600,
                fontSize: 12,
              }}
            >
              Create Test
            </button>
            <button
              onClick={() => setCreatingFor(null)}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 4,
                padding: '8px 16px',
                color: '#ccc',
                cursor: 'pointer',
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 600,
                fontSize: 12,
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tests list */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {tests.map(test => (
          <div
            key={test.id}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              padding: 16,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#059669', textTransform: 'capitalize' }}>{test.email_type}</div>
                <div style={{ fontSize: 11, color: '#999' }}>{test.variant_name}</div>
              </div>
              <div style={{
                fontSize: 10,
                padding: '2px 6px',
                borderRadius: 2,
                background: test.active ? 'rgba(5,150,105,0.2)' : 'rgba(100,100,100,0.2)',
                color: test.active ? '#059669' : '#999',
              }}>
                {test.active ? 'Active' : 'Finished'}
              </div>
            </div>

            <div style={{ fontSize: 11, color: '#999', marginBottom: 12 }}>
              <div>Control: {test.control_sends} sends</div>
              <div>Variant: {test.variant_sends} sends</div>
              <div>Split: {Math.round(test.traffic_split * 100)}%</div>
            </div>

            {test.active && (
              <button
                onClick={() => handleDeclareWinner(test.id)}
                style={{
                  width: '100%',
                  background: 'rgba(5,150,105,0.2)',
                  border: '1px solid #059669',
                  borderRadius: 4,
                  padding: '6px',
                  color: '#059669',
                  cursor: 'pointer',
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: 600,
                  fontSize: 11,
                }}
              >
                Declare Winner
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
