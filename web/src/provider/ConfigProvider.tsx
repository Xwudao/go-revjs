import { createContext, useContext, useEffect, type PropsWithChildren } from 'react'
import useAppConfigStore, {
  type AccentPreset,
} from '@/store/useAppConfig'

type ConfigContextValue = {
  accent: AccentPreset
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
    accent: '#2ee59d',
    hover: '#24cf8c',
    active: '#17a96f',
    soft: 'rgba(46, 229, 157, 0.14)',
    border: 'rgba(46, 229, 157, 0.42)',
    contrast: '#04150e',
  },
  emerald: {
    accent: '#29d9a4',
    hover: '#18c593',
    active: '#11916d',
    soft: 'rgba(41, 217, 164, 0.14)',
    border: 'rgba(41, 217, 164, 0.42)',
    contrast: '#051811',
  },
  amber: {
    accent: '#ffbb56',
    hover: '#f2a52d',
    active: '#d18214',
    soft: 'rgba(255, 187, 86, 0.14)',
    border: 'rgba(255, 187, 86, 0.4)',
    contrast: '#241302',
  },
}

const ConfigContext = createContext<ConfigContextValue | null>(null)

export function ConfigProvider({ children }: PropsWithChildren) {
  const accent = useAppConfigStore((state) => state.accent)

  useEffect(() => {
    const root = document.documentElement
    const tokens = accentTokens[accent]

    root.dataset.theme = 'dark'
    root.style.colorScheme = 'dark'
    root.style.setProperty('--color-accent', tokens.accent)
    root.style.setProperty('--color-accent-hover', tokens.hover)
    root.style.setProperty('--color-accent-active', tokens.active)
    root.style.setProperty('--color-accent-soft', tokens.soft)
    root.style.setProperty('--color-accent-border', tokens.border)
    root.style.setProperty('--color-accent-contrast', tokens.contrast)
    root.style.setProperty('--accent', tokens.accent)
    root.style.setProperty('--accent-bg', tokens.soft)
    root.style.setProperty('--accent-border', tokens.border)
  }, [accent])

  return (
    <ConfigContext.Provider
      value={{
        accent,
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
