import { useState, useCallback } from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'portal_theme'

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark') return 'dark'
  } catch {
    // localStorage unavailable
  }
  return 'light'
}

export function usePortalTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'light' ? 'dark' : 'light'
      try { localStorage.setItem(STORAGE_KEY, next) } catch { /* ignore */ }
      return next
    })
  }, [])

  return { theme, toggleTheme }
}

export const LIGHT: Record<string, string> = {
  bg: '#F9FAFB', // Saturn White
  bg2: '#FFFFFF',
  border: 'rgba(0,0,0,0.08)',
  text: '#111827', // Saturn Charcoal
  textMuted: 'rgba(17,24,39,0.5)',
  accent: '#064E3B', // Saturn Emerald
  accentLight: 'rgba(52,211,153,0.08)', // Emerald-400 tint
  accentBorder: 'rgba(52,211,153,0.25)',
  riskBg: 'rgba(75,85,99,0.05)',
  riskBorder: 'rgba(75,85,99,0.2)',
  riskText: '#4B5563', // Muted Saturn Gray
  msgTeamBg: 'rgba(6,78,59,0.08)',
  msgProspectBg: '#F3F4F6',
  inputBg: '#F3F4F6',
  statusPending: '#FBBF24',
  statusReviewing: '#60A5FA',
  statusSuccess: '#34D399',
  statusDeferred: '#9CA3AF',
  statusError: '#DC2626',
}

export const DARK: Record<string, string> = {
  bg: '#111827', // Saturn Charcoal
  bg2: '#1F2937', // Saturn Gray
  border: 'rgba(255,255,255,0.06)',
  text: '#F9FAFB', // Saturn White
  textMuted: 'rgba(249,250,251,0.45)',
  accent: '#064E3B', // Saturn Emerald
  accentLight: 'rgba(52,211,153,0.08)', // Emerald-400 tint (visible on dark)
  accentBorder: 'rgba(52,211,153,0.25)', // Emerald-400 border
  riskBg: 'rgba(75,85,99,0.08)',
  riskBorder: 'rgba(75,85,99,0.25)',
  riskText: '#9CA3AF', // Muted Light Saturn Gray
  msgTeamBg: 'rgba(6,78,59,0.12)',
  msgProspectBg: 'rgba(255,255,255,0.04)',
  inputBg: 'rgba(255,255,255,0.02)',
  statusPending: '#FBBF24',
  statusReviewing: '#60A5FA',
  statusSuccess: '#34D399',
  statusDeferred: '#4B5563',
  statusError: '#FB7185',
}

export function t(theme: Theme): Record<string, string> {
  return theme === 'light' ? LIGHT : DARK
}
