import { useEffect, useRef, useState } from 'react'
import { Outlet, createRootRoute, useRouterState } from '@tanstack/react-router'
import { FrontShell } from '@/components/front-shell'

function RootLayout() {
  const isPending = useRouterState({
    select: (state) =>
      state.status === 'pending' || state.isLoading || state.isTransitioning,
  })
  const [isPendingVisible, setIsPendingVisible] = useState(false)
  const shownAtRef = useRef<number | null>(null)

  useEffect(() => {
    const minimumVisibleMs = 240

    if (isPending) {
      shownAtRef.current = Date.now()
      setIsPendingVisible(true)
      return
    }

    if (!shownAtRef.current) {
      setIsPendingVisible(false)
      return
    }

    const elapsed = Date.now() - shownAtRef.current
    const remaining = Math.max(0, minimumVisibleMs - elapsed)
    const timer = window.setTimeout(() => {
      shownAtRef.current = null
      setIsPendingVisible(false)
    }, remaining)

    return () => window.clearTimeout(timer)
  }, [isPending])

  return (
    <FrontShell isPending={isPendingVisible}>
      <Outlet />
    </FrontShell>
  )
}

export const Route = createRootRoute({
  component: RootLayout,
})
