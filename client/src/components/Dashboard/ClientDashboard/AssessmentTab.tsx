import { useDashboardTheme } from '../ThemeContext'

interface AssessmentTabProps {
  clientId: number
  isAdmin: boolean
  onClose?: () => void
}

export function AssessmentTab({ clientId: _clientId, isAdmin: _isAdmin, onClose: _onClose }: AssessmentTabProps) {
  const { theme } = useDashboardTheme()

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif" }}>
      <h3 style={{ fontSize: '20px', fontWeight: 600, color: theme.text, margin: '0 0 16px 0', letterSpacing: '0.05em' }}>ASSESSMENT</h3>
      <div style={{ color: theme.textMuted, padding: '24px', background: theme.card, borderRadius: '8px', border: `1px solid ${theme.border}` }}>
        Content coming soon
      </div>
    </div>
  )
}
