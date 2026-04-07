import { createBrowserHistory, createRouter } from '@tanstack/react-router'
import { RoutePending } from '@/components/front-shell'
import { routeTree } from './routeTree.gen'

const history = createBrowserHistory()

export const router = createRouter({
  routeTree,
  history,
  defaultPreload: 'intent',
  defaultPendingComponent: RoutePending,
  defaultPendingMs: 120,
  defaultPendingMinMs: 240,
  scrollRestoration: true,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
