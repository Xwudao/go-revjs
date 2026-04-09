import { Outlet, createRootRoute } from '@tanstack/react-router';
import { FrontShell } from '@/components/front-shell';
import { RouteNotFound } from '@/components/RouteNotFound';
import { RouteError } from '@/components/RouteError';

function RootLayout() {
  return (
    <FrontShell>
      <Outlet />
    </FrontShell>
  );
}

function RootNotFound() {
  return <RouteNotFound />;
}

function RootError({ error }: { error: Error }) {
  return <RouteError error={error} />;
}

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: RootNotFound,
  errorComponent: RootError,
});
