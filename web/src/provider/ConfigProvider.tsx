import { createContext, useContext, useEffect, type PropsWithChildren } from 'react'
import { Toaster } from 'react-hot-toast'
import useAppConfigStore, {
  type AccentPreset,
  type ThemeMode,
} from '@/store/useAppConfig'

type ConfigContextValue = {
  accent: AccentPreset
  theme: ThemeMode
}

type AccentTokenSet = {
  accent: string
  hover: string
  active: string
  soft: string
  border: string
  contrast: string
}

const accentTokens: Record<
  AccentPreset,
  {
    dark: AccentTokenSet
    light: AccentTokenSet
  }
> = {
  violet: {
    dark: {
      accent: '#2ee59d',
      hover: '#24cf8c',
      active: '#17a96f',
      soft: 'rgba(46, 229, 157, 0.14)',
      border: 'rgba(46, 229, 157, 0.42)',
      contrast: '#04150e',
    },
    light: {
      accent: '#0d7f5c',
      hover: '#0b6d4f',
      active: '#08543c',
      soft: 'rgba(13, 127, 92, 0.1)',
      border: 'rgba(13, 127, 92, 0.24)',
      contrast: '#ffffff',
    },
  },
  emerald: {
    dark: {
      accent: '#29d9a4',
      hover: '#18c593',
      active: '#11916d',
      soft: 'rgba(41, 217, 164, 0.14)',
      border: 'rgba(41, 217, 164, 0.42)',
      contrast: '#051811',
    },
    light: {
      accent: '#0f766e',
      hover: '#0d665f',
      active: '#0a514b',
      soft: 'rgba(15, 118, 110, 0.1)',
      border: 'rgba(15, 118, 110, 0.24)',
      contrast: '#ffffff',
    },
  },
  amber: {
    dark: {
      accent: '#ffbb56',
      hover: '#f2a52d',
      active: '#d18214',
      soft: 'rgba(255, 187, 86, 0.14)',
      border: 'rgba(255, 187, 86, 0.4)',
      contrast: '#241302',
    },
    light: {
      accent: '#a16207',
      hover: '#8f5605',
      active: '#784603',
      soft: 'rgba(161, 98, 7, 0.1)',
      border: 'rgba(161, 98, 7, 0.24)',
      contrast: '#ffffff',
    },
  },
}

const ConfigContext = createContext<ConfigContextValue | null>(null)

export function ConfigProvider({ children }: PropsWithChildren) {
  const accent = useAppConfigStore((state) => state.accent)
  const theme = useAppConfigStore((state) => state.theme)

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    root.style.colorScheme = theme
  }, [theme])

  useEffect(() => {
    const root = document.documentElement
    const tokens = accentTokens[accent][theme]

    root.style.setProperty('--color-accent', tokens.accent)
    root.style.setProperty('--color-accent-hover', tokens.hover)
    root.style.setProperty('--color-accent-active', tokens.active)
    root.style.setProperty('--color-accent-soft', tokens.soft)
    root.style.setProperty('--color-accent-border', tokens.border)
    root.style.setProperty('--color-accent-contrast', tokens.contrast)
    root.style.setProperty('--accent', tokens.accent)
    root.style.setProperty('--accent-bg', tokens.soft)
    root.style.setProperty('--accent-border', tokens.border)
    root.style.setProperty('--color-signal', tokens.accent)
    root.style.setProperty('--color-signal-soft', tokens.soft)
  }, [accent, theme])

  return (
    <ConfigContext.Provider
      value={{
        accent,
        theme,
      }}
    >
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--color-surface)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)',
            borderRadius: '8px',
            fontSize: '13px',
            padding: '10px 14px',
          },
          success: {
            iconTheme: {
              primary: 'var(--color-success)',
              secondary: 'var(--color-surface)',
            },
          },
          error: {
            iconTheme: {
              primary: 'var(--color-danger)',
              secondary: 'var(--color-surface)',
            },
          },
          loading: {
            duration: Infinity,
            iconTheme: {
              primary: 'var(--color-accent)',
              secondary: 'var(--color-surface)',
            },
          },
        }}
      />
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
