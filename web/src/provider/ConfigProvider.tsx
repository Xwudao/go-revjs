import { createContext, useContext, useEffect, type PropsWithChildren } from 'react'
import useAppConfigStore, {
  type AccentPreset,
  type ThemeMode,
} from '@/store/useAppConfig'

type ConfigContextValue = {
  theme: ThemeMode
  accent: AccentPreset
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
  setAccent: (accent: AccentPreset) => void
}

const accentTokens: Record<
  AccentPreset,
  {
    accent: string
    hover: string
    active: string
    soft: string
    border: string
    contrast: string
  }
> = {
  violet: {
    accent: '#aa3bff',
    hover: '#9530e8',
    active: '#7b1fd0',
    soft: 'rgba(170, 59, 255, 0.10)',
    border: 'rgba(170, 59, 255, 0.50)',
    contrast: '#ffffff',
  },
  emerald: {
    accent: '#0f9f6e',
    hover: '#0a8a5e',
    active: '#066c49',
    soft: 'rgba(15, 159, 110, 0.12)',
    border: 'rgba(15, 159, 110, 0.50)',
    contrast: '#f7fffb',
  },
  amber: {
    accent: '#d97706',
    hover: '#b85f00',
    active: '#964a00',
    soft: 'rgba(217, 119, 6, 0.12)',
    border: 'rgba(217, 119, 6, 0.50)',
    contrast: '#fff8ee',
  },
}

const ConfigContext = createContext<ConfigContextValue | null>(null)

export function ConfigProvider({ children }: PropsWithChildren) {
  const theme = useAppConfigStore((state) => state.theme)
  const accent = useAppConfigStore((state) => state.accent)
  const setTheme = useAppConfigStore((state) => state.setTheme)
  const toggleTheme = useAppConfigStore((state) => state.toggleTheme)
  const setAccent = useAppConfigStore((state) => state.setAccent)

  useEffect(() => {
    const root = document.documentElement
    const tokens = accentTokens[accent]

    root.dataset.theme = theme
    root.style.colorScheme = theme
    root.style.setProperty('--color-accent', tokens.accent)
    root.style.setProperty('--color-accent-hover', tokens.hover)
    root.style.setProperty('--color-accent-active', tokens.active)
    root.style.setProperty('--color-accent-soft', tokens.soft)
    root.style.setProperty('--color-accent-border', tokens.border)
    root.style.setProperty('--color-accent-contrast', tokens.contrast)
    root.style.setProperty('--accent', tokens.accent)
    root.style.setProperty('--accent-bg', tokens.soft)
    root.style.setProperty('--accent-border', tokens.border)
  }, [accent, theme])

  return (
    <ConfigContext.Provider
      value={{
        theme,
        accent,
        setTheme,
        toggleTheme,
        setAccent,
      }}
    >
      {children}
    </ConfigContext.Provider>
  )
}

export function useAppConfig() {
  const context = useContext(ConfigContext)

  if (!context) {
    throw new Error('useAppConfig must be used within ConfigProvider')
  }

  return context
}
