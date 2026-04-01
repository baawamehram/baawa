import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { portalFetch } from '../../../lib/portalApi'
import { usePortalTheme, t } from '../usePortalTheme'

interface AssessmentData {
  id: number
  email: string
  created_at: string
  results_unlocked: boolean
  score: number | null
  score_breakdown: Record<string, number> | null
  biggest_opportunity: string | null
  biggest_risk: string | null
  problem_domains: Array<{ domain: string; subCategory: string; confidence: number }> | null
}

interface Props {
  assessment: AssessmentData
  on401: () => void
}

interface Deliverable {
  id: number
  title: string
  status: 'pending' | 'in_progress' | 'completed'
  due_date: string
}

const DOMAIN_COLORS: Record<string, string> = {
  Marketing: '#064E3B',
  Sales: '#0A5F48',
  Engineering: '#374151',
  Operations: '#4B5563',
  Strategy: '#0A3B24',
  Finance: '#022C22',
  Research: '#111827',
  Product: '#064E3B',
}

export function OverviewTab({ assessment, on401 }: Props) {
  const { theme } = usePortalTheme()
  const tk = t(theme)
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [loadingDeliverables, setLoadingDeliverables] = useState(false)

  useEffect(() => {
    const loadDeliverables = async () => {
      try {
        setLoadingDeliverables(true)
        const res = await portalFetch('/api/portal/deliverables', on401)
        if (res?.ok) {
          const data = await res.json()
          setDeliverables(data)
        }
      } catch (err) {
        console.error('Failed to load deliverables:', err)
      } finally {
        setLoadingDeliverables(false)
      }
    }
    void loadDeliverables()
  }, [on401])

  const domains = assessment.problem_domains ?? []
  const completedDeliverables = deliverables.filter(d => d.status === 'completed').length
  const totalDeliverables = deliverables.length

  const statusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10b981'
      case 'in_progress':
        return '#f59e0b'
      case 'pending':
        return '#6b7280'
      default:
        return '#9ca3af'
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Assessment Score Summary */}
      {assessment.results_unlocked && assessment.score !== null && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: tk.bg2,
            border: `1px solid ${tk.border}`,
            borderRadius: 12,
            padding: 20,
          }}
        >
          <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, fontWeight: 600, color: tk.text, margin: '0 0 16px' }}>
            Assessment Results
          </h3>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, fontWeight: 700, color: tk.accent, fontFamily: 'Outfit, sans-serif', lineHeight: 1 }}>
                {assessment.score}
              </div>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, color: tk.textMuted, margin: '4px 0 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Score
              </p>
            </div>
            {assessment.biggest_opportunity && (
              <div style={{ flex: 1, minWidth: 200 }}>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 11, color: tk.textMuted, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Biggest Opportunity
                </p>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: tk.text, margin: 0 }}>
                  {assessment.biggest_opportunity}
                </p>
              </div>
            )}
            {assessment.biggest_risk && (
              <div style={{ flex: 1, minWidth: 200 }}>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 11, color: tk.textMuted, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Biggest Risk
                </p>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: tk.text, margin: 0 }}>
                  {assessment.biggest_risk}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Problem Domains */}
      {domains.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            background: tk.bg2,
            border: `1px solid ${tk.border}`,
            borderRadius: 12,
            padding: 20,
          }}
        >
          <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, fontWeight: 600, color: tk.text, margin: '0 0 12px' }}>
            Key Areas of Focus
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {domains.map(d => (
              <div
                key={`${d.domain}-${d.subCategory}`}
                style={{
                  fontFamily: 'Outfit, sans-serif',
                  fontSize: 12,
                  borderRadius: 6,
                  padding: '6px 12px',
                  fontWeight: 500,
                  background: `${DOMAIN_COLORS[d.domain] ?? '#A78BFA'}18`,
                  color: DOMAIN_COLORS[d.domain] ?? '#A78BFA',
                  border: `1px solid ${DOMAIN_COLORS[d.domain] ?? '#A78BFA'}40`,
                }}
              >
                {d.domain} · {d.subCategory}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Deliverables Progress */}
      {totalDeliverables > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            background: tk.bg2,
            border: `1px solid ${tk.border}`,
            borderRadius: 12,
            padding: 20,
          }}
        >
          <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, fontWeight: 600, color: tk.text, margin: '0 0 16px' }}>
            Work Progress
          </h3>
          {loadingDeliverables ? (
            <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: tk.textMuted, margin: 0 }}>Loading…</p>
          ) : (
            <>
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: tk.text }}>
                    Progress
                  </span>
                  <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, color: tk.textMuted }}>
                    {completedDeliverables} of {totalDeliverables}
                  </span>
                </div>
                <div style={{
                  height: 8,
                  background: tk.input,
                  borderRadius: 4,
                  overflow: 'hidden',
                }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${totalDeliverables ? (completedDeliverables / totalDeliverables) * 100 : 0}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    style={{
                      height: '100%',
                      background: tk.accent,
                      borderRadius: 4,
                    }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {['pending', 'in_progress', 'completed'].map(status => {
                  const count = deliverables.filter(d => d.status === status).length
                  return (
                    <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 3,
                          background: statusColor(status),
                        }}
                      />
                      <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, color: tk.textMuted, textTransform: 'capitalize' }}>
                        {status.replace('_', ' ')}: {count}
                      </span>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </motion.div>
      )}

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 12,
        }}
      >
        <div style={{ background: tk.bg2, border: `1px solid ${tk.border}`, borderRadius: 12, padding: 16 }}>
          <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 11, color: tk.textMuted, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Assessment Date
          </p>
          <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: tk.text, margin: 0, fontWeight: 500 }}>
            {new Date(assessment.created_at).toLocaleDateString()}
          </p>
        </div>
        <div style={{ background: tk.bg2, border: `1px solid ${tk.border}`, borderRadius: 12, padding: 16 }}>
          <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 11, color: tk.textMuted, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Focus Areas
          </p>
          <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: tk.text, margin: 0, fontWeight: 500 }}>
            {domains.length} identified
          </p>
        </div>
      </motion.div>
    </div>
  )
}
