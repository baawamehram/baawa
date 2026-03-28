import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useDashboardTheme } from './ThemeContext'

interface FunnelStep {
  step: number
  count: number
  avg_latency: number
  voice_ratio: number
  avg_words: number
}

interface Props {
  data: FunnelStep[]
  totalStarted: number
}

export function FunnelAnalytics({ data, totalStarted }: Props) {
  const { theme, isDark } = useDashboardTheme()

  const chartData = useMemo(() => {
    // Ensure we have steps 1-10 or similar
    const steps = Array.from({ length: 15 }, (_, i) => i + 1)
    return steps.map(s => {
      const found = data.find(d => d.step === s)
      return found || { step: s, count: 0, avg_latency: 0, voice_ratio: 0, avg_words: 0 }
    })
  }, [data])

  return (
    <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ color: theme.text, fontSize: '16px', fontWeight: 600, margin: 0 }}>Funnel Velocity & Friction</h3>
        <p style={{ color: theme.textMuted, fontSize: '12px', margin: '4px 0 0 0' }}>Analyzing cognitive load and abandonment across the journey.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {chartData.filter(d => d.step <= 10).map((d, i) => {
          const dropOff = i === 0 ? 0 : chartData[i-1].count > 0 ? (1 - d.count / chartData[i-1].count) * 100 : 0
          const barWidth = totalStarted > 0 ? (d.count / totalStarted) * 100 : 0
          
          return (
            <div key={d.step} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 100px', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '11px', color: theme.textMuted, fontWeight: 700 }}>Q{d.step}</span>
              
              <div style={{ height: '24px', position: 'relative', background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderRadius: '4px', overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${barWidth}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  style={{ height: '100%', background: theme.text, opacity: 0.8, borderRadius: '4px' }}
                />
                {d.count > 0 && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', paddingLeft: '8px', fontSize: '10px', color: isDark ? '#fff' : '#000', fontWeight: 600 }}>
                    {d.count} journeys
                  </div>
                )}
              </div>

              <div style={{ textAlign: 'right' }}>
                {dropOff > 5 && (
                  <span style={{ fontSize: '10px', color: '#f87171', fontWeight: 800 }}>-{dropOff.toFixed(0)}% DROP</span>
                )}
                {d.avg_latency > 30 && (
                  <div style={{ fontSize: '9px', color: '#facc15', fontWeight: 700 }}>⚠️ {d.avg_latency.toFixed(0)}s LATENCY</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: `1px solid ${theme.border}`, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <h4 style={{ fontSize: '11px', color: theme.textMuted, textTransform: 'uppercase', marginBottom: '8px' }}>Input Preference</h4>
          <div style={{ height: '8px', background: theme.border, borderRadius: '4px', display: 'flex', overflow: 'hidden' }}>
            <div style={{ width: '65%', background: '#FF6B35' }} title="Voice" />
            <div style={{ width: '35%', background: theme.text }} title="Text" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '10px', color: theme.textMuted }}>
            <span>Voice 65%</span>
            <span>Text 35%</span>
          </div>
        </div>
        <div>
          <h4 style={{ fontSize: '11px', color: theme.textMuted, textTransform: 'uppercase', marginBottom: '8px' }}>Cognitive Load</h4>
          <p style={{ color: theme.text, fontSize: '13px', margin: 0, fontWeight: 600 }}>Stable (Avg 22s/response)</p>
          <p style={{ color: theme.textMuted, fontSize: '10px', margin: 0 }}>Latency peaks at Question 4 (Competitor Analysis)</p>
        </div>
      </div>
    </div>
  )
}
