import { motion } from 'framer-motion'
import { usePortalTheme, t } from '../usePortalTheme'

interface Props {
  on401?: () => void
}

export function TasksTab({  }: Props) {
  const { theme } = usePortalTheme()
  const tk = t(theme)

  // Placeholder for tasks functionality
  // This would connect to a tasks API endpoint when available
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
      <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
      <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 16, fontWeight: 600, color: tk.text, margin: '0 0 8px' }}>
        No Tasks Yet
      </h3>
      <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, color: tk.textMuted, margin: 0 }}>
        Tasks will be assigned and appear here as your engagement progresses.
      </p>
    </motion.div>
  )
}
