import { useDashboardTheme } from '../ThemeContext'

interface AgreementsTabProps {
  clientId: number
  isAdmin: boolean
  onClose?: () => void
  isLoading?: boolean
  error?: string | null
}

export function AgreementsTab({ clientId: _clientId, isAdmin: _isAdmin, onClose: _onClose, isLoading = false, error = null }: AgreementsTabProps) {
  const { theme } = useDashboardTheme()

  if (isLoading) {
    return (
      <div style={{ fontFamily: "'Outfit', sans-serif", color: theme.text }}>
        Loading...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ fontFamily: "'Outfit', sans-serif", color: theme.statusError }}>
        Error: {error}
      </div>
    )
  }

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif" }}>
      <h3 style={{ fontSize: '20px', fontWeight: 600, color: theme.text, margin: '0 0 16px 0', letterSpacing: '0.05em' }}>AGREEMENTS</h3>
      <div style={{ color: theme.textMuted, padding: '24px', background: theme.card, borderRadius: '8px', border: `1px solid ${theme.border}` }}>
        Content coming soon
      </div>
    </div>
  )
}
