import { createFileRoute } from '@tanstack/react-router';
import StringToolsPage from '@/pages/string-tools';

export const Route = createFileRoute('/string-tools')({
  component: StringToolsPage,
});
