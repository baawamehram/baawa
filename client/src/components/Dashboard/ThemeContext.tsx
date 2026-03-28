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
}

export const DARK_THEME: ThemeColors = {
  bg: '#000000',
  bgMain: '#000000',
  sidebar: '#111111',
  card: '#111111',
  input: '#1a1a1a',
  border: '#333333',
  text: '#ffffff',
  textMuted: '#aaaaaa',
  primary: '#ffffff',
  primaryText: '#000000',
  accent: '#FF6B35'
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
  accent: '#FF6B35'
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
