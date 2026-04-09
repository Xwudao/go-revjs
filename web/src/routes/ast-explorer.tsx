import { createFileRoute } from '@tanstack/react-router';
import AstExplorerPage from '@/pages/ast-explorer';

export const Route = createFileRoute('/ast-explorer')({
  component: AstExplorerPage,
});
