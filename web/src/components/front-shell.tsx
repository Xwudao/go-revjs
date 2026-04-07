import type { PropsWithChildren } from 'react'
import clsx from 'clsx'
import { Link, useRouterState } from '@tanstack/react-router'
import useAppConfigStore, { type AccentPreset } from '@/store/useAppConfig'
import { useAppConfig } from '@/provider/ConfigProvider'
import classes from './front-shell.module.scss'

type FrontShellProps = PropsWithChildren

const navItems = [
  { key: 'home', label: '首页', to: '/' },
  { key: 'crypto-lab', label: 'Crypto Lab', to: '/crypto-lab' },
  { key: 'js-deob', label: 'JS Deob', to: '/js-deob' },
] as const

type NavKey = (typeof navItems)[number]['key']

export function FrontShell({ children }: FrontShellProps) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const current = pathname.startsWith('/js-deob')
    ? 'js-deob'
    : pathname.startsWith('/crypto-lab')
      ? 'crypto-lab'
      : 'home'

  return (
    <div className={clsx(classes.frontShell)}>
      <FrontHeader current={current} />
      <div className={clsx(classes.frontShellBody, classes.frontShellMain)}>
        <div className={clsx(classes.frontShellOutlet)}>{children}</div>
      </div>
      <FrontFooter />
    </div>
  )
}

export function RoutePending() {
  return (
    <div className={clsx(classes.routePendingViewport)}>
      <div className={clsx(classes.routePendingCard)} role="status" aria-live="polite">
        <span
          className={clsx('i-mdi-loading animate-spin', classes.routePendingIcon)}
          aria-hidden="true"
        />
        <span>页面切换中...</span>
      </div>
    </div>
  )
}

function FrontHeader({ current }: { current: NavKey }) {
  const { theme, accent } = useAppConfig()
  const toggleTheme = useAppConfigStore((state) => state.toggleTheme)
  const setAccent = useAppConfigStore((state) => state.setAccent)

  const accentPresets: { key: AccentPreset; label: string }[] = [
    { key: 'violet', label: '绿色' },
    { key: 'emerald', label: '青绿' },
    { key: 'amber', label: '琥珀' },
  ]

  return (
    <header className={clsx(classes.siteHeader)}>
      <div className={clsx(classes.siteHeaderInner)}>
        <div className={clsx(classes.siteBrand)}>
          <Link to="/" className={clsx(classes.siteBrandLink)}>
            <span className={clsx(classes.siteBrandMark)} aria-hidden="true">
              <span className="i-mdi-code-braces text-[15px]" />
            </span>
            <span>
              <strong>逆向工程中心</strong>
              <span>Reverse Engineering Hub</span>
            </span>
          </Link>
        </div>

        <nav className={clsx(classes.siteNav)} aria-label="Primary">
          {navItems.map((item) => (
            <Link
              key={item.key}
              to={item.to}
              className={clsx(classes.siteNavLink)}
              data-current={current === item.key}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={clsx(classes.siteHeaderTools)}>
          <div className={clsx(classes.siteAccentSwitcher)} role="group" aria-label="主题色">
            {accentPresets.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                className={clsx(classes.siteAccentSwitcherItem)}
                data-active={accent === key}
                aria-label={label}
                aria-pressed={accent === key}
                onClick={() => setAccent(key)}
              >
                <span data-accent={key} aria-hidden="true" />
              </button>
            ))}
          </div>
          <button
            type="button"
            className={clsx(classes.siteToolButton)}
            aria-label={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
            onClick={toggleTheme}
          >
            <span
              className={theme === 'dark' ? 'i-mdi-weather-sunny' : 'i-mdi-weather-night'}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
    </header>
  )
}

function FrontFooter() {
  return (
    <footer className={clsx(classes.siteFooter)}>
      <div className={clsx(classes.siteFooterInner)}>
        <div className={clsx(classes.siteFooterBrand)}>
          <strong>逆向工程中心</strong>
          <span>revjs 当前在线逆向分析工作台入口。</span>
        </div>
      </div>
    </footer>
  )
}
