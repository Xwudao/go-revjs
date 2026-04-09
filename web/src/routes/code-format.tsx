import { createFileRoute } from '@tanstack/react-router';
import CodeFormatPage from '@/pages/code-format';

export const Route = createFileRoute('/code-format')({
  component: CodeFormatPage,
});
