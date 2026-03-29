import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface ThemeColors {
  bg: string
  bgMain: string
  sidebar: string
  card: string
  input: string
  border: string
  text: string
  textMuted: string
  primary: string
  primaryText: string
  accent: string
  accentHover: string
  accentMid: string
  accentTintBg: string
  accentTintBorder: string
  accentGlow: string
  gradient: string
  statusPending: string
  statusReviewing: string
  statusSuccess: string
  statusDeferred: string
  statusError: string
}

export const DARK_THEME: ThemeColors = {
  bg: '#111827', // Saturn Charcoal
  bgMain: '#111827',
  sidebar: '#0F1419',
  card: '#1F2937', // Saturn Gray
  input: '#374151',
  border: '#4B5563',
  text: '#F9FAFB', // Saturn White
  textMuted: '#9CA3AF',
  primary: '#F9FAFB',
  primaryText: '#111827',
  accent: '#064E3B', // Saturn Emerald (Deep Forest Green)
  accentHover: '#065F46',
  accentMid: '#059669', // Mid-emerald for gradients
  accentTintBg: 'rgba(52,211,153,0.08)',
  accentTintBorder: 'rgba(52,211,153,0.25)',
  accentGlow: 'rgba(52,211,153,0.4)',
  gradient: 'linear-gradient(135deg,#059669,#064E3B)',
  statusPending: '#FBBF24', // Amber-400
  statusReviewing: '#60A5FA', // Blue-400
  statusSuccess: '#34D399', // Emerald-400
  statusDeferred: '#4B5563', // Muted Saturn Gray
  statusError: '#FB7185' // Rose-400
}

export const LIGHT_THEME: ThemeColors = {
  bg: '#f3f4f6', // gray-100
  bgMain: '#ffffff',
  sidebar: '#ffffff',
  card: '#ffffff',
  input: '#f9fafb', // gray-50
  border: '#e5e7eb', // gray-200
  text: '#111827', // gray-900
  textMuted: '#6b7280', // gray-500
  primary: '#111827',
  primaryText: '#ffffff',
  accent: '#064E3B', // Saturn Emerald
  accentHover: '#065F46',
  accentMid: '#059669',
  accentTintBg: 'rgba(6,78,59,0.08)',
  accentTintBorder: 'rgba(6,78,59,0.25)',
  accentGlow: 'rgba(6,78,59,0.4)',
  gradient: 'linear-gradient(135deg,#059669,#064E3B)',
  statusPending: '#FBBF24',
  statusReviewing: '#60A5FA',
  statusSuccess: '#34D399',
  statusDeferred: '#9CA3AF',
  statusError: '#DC2626' // Red-600 for light mode (darker for contrast)
}

interface ThemeContextType {
  isDark: boolean
  toggleTheme: () => void
  theme: ThemeColors
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function DashboardThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('baawa-dashboard-theme')
    return saved ? saved === 'dark' : true
  })

  useEffect(() => {
    localStorage.setItem('baawa-dashboard-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const toggleTheme = () => setIsDark(!isDark)
  const theme = isDark ? DARK_THEME : LIGHT_THEME

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, theme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useDashboardTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useDashboardTheme must be used within DashboardThemeProvider')
  return context
}
