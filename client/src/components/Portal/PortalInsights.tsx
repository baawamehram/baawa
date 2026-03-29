import { useState, useEffect, useCallback } from 'react'
import { portalFetch } from '../../lib/portalApi'
import { t } from './usePortalTheme'

interface Insight {
  id: number
  content: string
  source_name: string
  source_url: string | null
  ingested_at: string
}

interface Props {
  theme: 'light' | 'dark'
  on401: () => void
  problemDomains?: Array<{ domain: string; subCategory: string }>
}

export function PortalInsights({ theme, on401, problemDomains = [] }: Props) {
  const tk = t(theme)
  const [insights, setInsights] = useState<Insight[] | null>(null)

  const load = useCallback(async () => {
    const res = await portalFetch('/api/portal/insights', on401)
    if (!res || !res.ok) { setInsights([]); return }
    setInsights(await res.json())
  }, [on401])

  useEffect(() => { void load() }, [load])

  const SOURCE_COLORS: Record<string, string> = {
    'Harvard Business Review': '#C8102E',
    'McKinsey Quarterly': '#00A9E0',
    'BCG Insights': '#009A44',
    'Bain Insights': '#CC0000',
    'Deloitte Insights': '#86BC25',
    'Strategy+Business (PwC)': '#E0301E',
    'MIT Sloan Management Review': '#8A1538',
    'Accenture Insights': '#A100FF',
  }

  if (!insights) return <p style={{ color: tk.textMuted, fontFamily: 'Outfit,sans-serif', fontSize: 14 }}>Loading insights…</p>

  return (
    <div>
      {/* Domain pills */}
      {problemDomains.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
          <span style={{ fontFamily: 'Outfit,sans-serif', fontSize: 11, color: tk.textMuted, alignSelf: 'center' }}>Your focus areas:</span>
          {problemDomains.map(d => (
            <span key={d.domain} style={{ fontFamily: 'Outfit,sans-serif', fontSize: 11, background: 'rgba(52,211,153,0.12)', color: '#A78BFA', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 4, padding: '2px 8px', fontWeight: 600 }}>
              {d.domain} · {d.subCategory}
            </span>
          ))}
        </div>
      )}

      {insights.length === 0 ? (
        <div style={{ background: tk.bg2, border: `1px solid ${tk.border}`, borderRadius: 10, padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📚</div>
          <p style={{ fontFamily: 'Outfit,sans-serif', color: tk.textMuted, fontSize: 13, margin: 0 }}>
            Insights will appear here once our knowledge base is synced. Check back soon.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {insights.map(insight => {
            const color = SOURCE_COLORS[insight.source_name] ?? '#A78BFA'
            // Extract first 300 chars as a preview
            const preview = insight.content.replace(/^\[.*?\]\s*/u, '').slice(0, 280)
            return (
              <div key={insight.id} style={{ background: tk.bg2, border: `1px solid ${tk.border}`, borderRadius: 8, padding: 16, borderLeft: `3px solid ${color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontFamily: 'Outfit,sans-serif', fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {insight.source_name}
                  </span>
                  <span style={{ fontFamily: 'Outfit,sans-serif', fontSize: 10, color: tk.textMuted }}>
                    {new Date(insight.ingested_at).toLocaleDateString()}
                  </span>
                </div>
                <p style={{ fontFamily: 'Outfit,sans-serif', fontSize: 13, color: tk.text, margin: '0 0 10px', lineHeight: 1.65 }}>
                  {preview}{insight.content.length > 280 ? '…' : ''}
                </p>
                {insight.source_url && (
                  <a href={insight.source_url} target="_blank" rel="noopener noreferrer"
                    style={{ fontFamily: 'Outfit,sans-serif', fontSize: 12, color: tk.accent, textDecoration: 'none' }}>
                    Read full article →
                  </a>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
