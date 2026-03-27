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
  bg: '#F8F6F3',
  bg2: '#FFFFFF',
  border: 'rgba(0,0,0,0.09)',
  text: '#1A1A1A',
  textMuted: 'rgba(0,0,0,0.45)',
  accent: '#E85520',
  accentLight: 'rgba(232,85,32,0.1)',
  accentBorder: 'rgba(232,85,32,0.25)',
  riskBg: 'rgba(239,68,68,0.05)',
  riskBorder: 'rgba(239,68,68,0.2)',
  riskText: '#dc2626',
  msgTeamBg: 'rgba(232,85,32,0.08)',
  msgProspectBg: '#F0EDE8',
  inputBg: '#F0EDE8',
}

export const DARK: Record<string, string> = {
  bg: '#0A0A0A',
  bg2: 'rgba(255,255,255,0.03)',
  border: 'rgba(255,255,255,0.08)',
  text: '#FDFCFA',
  textMuted: 'rgba(255,176,154,0.55)',
  accent: '#FF6B35',
  accentLight: 'rgba(255,107,53,0.12)',
  accentBorder: 'rgba(255,107,53,0.3)',
  riskBg: 'rgba(239,68,68,0.06)',
  riskBorder: 'rgba(239,68,68,0.18)',
  riskText: '#ef4444',
  msgTeamBg: 'rgba(255,107,53,0.1)',
  msgProspectBg: 'rgba(255,255,255,0.06)',
  inputBg: 'rgba(255,107,53,0.07)',
}

export function t(theme: Theme): Record<string, string> {
  return theme === 'light' ? LIGHT : DARK
}
