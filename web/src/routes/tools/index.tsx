import { createFileRoute } from '@tanstack/react-router';
import ToolsHubPage from '@/pages/tools-hub';

export const Route = createFileRoute('/tools/')({
  component: ToolsHubPage,
});
