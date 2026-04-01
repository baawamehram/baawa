import { motion } from 'framer-motion'
import { usePortalTheme, t } from '../usePortalTheme'

interface AssessmentData {
  id: number
  email: string
  created_at: string
  conversation: Array<{ role: 'user' | 'assistant'; content: string }>
  results_unlocked: boolean
  score: number | null
  score_breakdown: Record<string, number> | null
  score_summary: string | null
  biggest_opportunity: string | null
  biggest_risk: string | null
  problem_domains: Array<{ domain: string; subCategory: string; confidence: number }> | null
}

interface Props {
  assessment: AssessmentData
}

const DIMENSION_LABELS: Record<string, string> = {
  pmf: 'Product-Market Fit',
  validation: 'Validation',
  growth: 'Growth',
  mindset: 'Mindset',
  revenue: 'Revenue',
}

export function AssessmentTab({ assessment }: Props) {
  const { theme } = usePortalTheme()
  const tk = t(theme)

  if (!assessment.results_unlocked) {
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
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 16, fontWeight: 600, color: tk.text, margin: '0 0 8px' }}>
          Results Not Yet Unlocked
        </h3>
        <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, color: tk.textMuted, margin: 0 }}>
          Your assessment results will be available soon. Check back shortly or reach out to your contact.
        </p>
      </motion.div>
    )
  }

  const breakdown = assessment.score_breakdown ?? {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Overall Score */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 120,
              height: 120,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              background: tk.accent,
              fontSize: 48,
              fontWeight: 700,
              color: '#000',
              fontFamily: 'Outfit, sans-serif',
            }}>
              {assessment.score}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 16, fontWeight: 600, color: tk.text, margin: '0 0 12px' }}>
              Overall Assessment Score
            </h3>
            {assessment.score_summary && (
              <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, color: tk.textMuted, margin: 0, lineHeight: 1.6 }}>
                {assessment.score_summary}
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Dimension Breakdown */}
      {Object.keys(breakdown).length > 0 && (
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
          <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 16, fontWeight: 600, color: tk.text, margin: '0 0 16px' }}>
            Score Breakdown
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Object.entries(breakdown).map(([key, value]) => {
              const label = DIMENSION_LABELS[key] || key
              const percentage = Math.round((value / 100) * 100)
              return (
                <div key={key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: tk.text, fontWeight: 500 }}>
                      {label}
                    </span>
                    <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: tk.accent, fontWeight: 600 }}>
                      {Math.round(value)}/100
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
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      style={{
                        height: '100%',
                        background: tk.accent,
                        borderRadius: 4,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Assessment Details */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{
          background: tk.bg2,
          border: `1px solid ${tk.border}`,
          borderRadius: 12,
          padding: 24,
        }}
      >
        <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 16, fontWeight: 600, color: tk.text, margin: '0 0 16px' }}>
          Key Insights
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {assessment.biggest_opportunity && (
            <div style={{ padding: 12, background: tk.input, borderRadius: 8 }}>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 11, color: tk.textMuted, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Biggest Opportunity
              </p>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: tk.text, margin: 0 }}>
                {assessment.biggest_opportunity}
              </p>
            </div>
          )}
          {assessment.biggest_risk && (
            <div style={{ padding: 12, background: tk.input, borderRadius: 8 }}>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 11, color: tk.textMuted, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Biggest Risk
              </p>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: tk.text, margin: 0 }}>
                {assessment.biggest_risk}
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Conversation Transcript */}
      {assessment.conversation && assessment.conversation.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{
            background: tk.bg2,
            border: `1px solid ${tk.border}`,
            borderRadius: 12,
            padding: 24,
          }}
        >
          <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 16, fontWeight: 600, color: tk.text, margin: '0 0 16px' }}>
            Assessment Conversation
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 400, overflowY: 'auto' }}>
            {assessment.conversation.map((msg, idx) => (
              <div key={idx} style={{
                padding: 12,
                background: msg.role === 'assistant' ? tk.input : tk.accent,
                borderRadius: 8,
                color: msg.role === 'assistant' ? tk.text : '#000',
              }}>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, margin: '0 0 4px', fontWeight: 600, opacity: 0.8 }}>
                  {msg.role === 'assistant' ? 'Baawa' : 'You'}
                </p>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                  {msg.content}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
