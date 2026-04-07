import { Outlet, createRootRoute } from '@tanstack/react-router'
import { FrontShell } from '@/components/front-shell'

function RootLayout() {
  return (
    <FrontShell>
      <Outlet />
    </FrontShell>
  )
}

export const Route = createRootRoute({
  component: RootLayout,
})
