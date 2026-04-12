import { createFileRoute } from '@tanstack/react-router';
import StringToolsPage from '@/pages/string-tools';
import type { TabKey } from '@/pages/hooks/string-tools.hook';

const VALID_TABS: readonly TabKey[] = ['hash', 'encode', 'transform', 'lines', 'other'];

export const Route = createFileRoute('/string-tools')({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: VALID_TABS.includes(search.tab as TabKey) ? (search.tab as TabKey) : undefined,
    op: typeof search.op === 'string' ? search.op : undefined,
  }),
  component: StringToolsPage,
});
