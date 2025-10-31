import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface AppearanceSettings {
  accentColor: string
  fontSize: 'small' | 'medium' | 'large'
}

interface ThemeContextType {
  settings: AppearanceSettings
  updateSettings: (settings: Partial<AppearanceSettings>) => void
  applySettings: (settings: AppearanceSettings) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppearanceSettings>({
    accentColor: 'blue',
    fontSize: 'medium'
  })

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('appearanceSettings')
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings)
      setSettings(parsed)
      applySettings(parsed)
    }
  }, [])

  // Apply settings to the document
  const applySettings = (newSettings: AppearanceSettings) => {
    const root = document.documentElement
    
    // Apply accent color
    const colors: Record<string, string> = {
      blue: '#3b82f6',
      green: '#10b981',
      purple: '#8b5cf6',
      pink: '#ec4899',
      orange: '#f97316',
      red: '#ef4444',
      teal: '#14b8a6',
      indigo: '#6366f1'
    }
    root.style.setProperty('--accent-color', colors[newSettings.accentColor] || colors.blue)
    
    // Apply font size
    const fontSizes = {
      small: '14px',
      medium: '16px',
      large: '18px'
    }
    root.style.setProperty('--base-font-size', fontSizes[newSettings.fontSize])
    document.body.style.fontSize = fontSizes[newSettings.fontSize]
  }

  const updateSettings = (newSettings: Partial<AppearanceSettings>) => {
    const updated = { ...settings, ...newSettings }
    setSettings(updated)
    localStorage.setItem('appearanceSettings', JSON.stringify(updated))
    applySettings(updated)
  }

  return (
    <ThemeContext.Provider value={{ settings, updateSettings, applySettings }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
