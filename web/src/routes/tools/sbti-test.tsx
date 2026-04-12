import { createFileRoute } from '@tanstack/react-router';
import SbtiTestPage from '@/pages/sbti-test';

export const Route = createFileRoute('/tools/sbti-test')({
  component: SbtiTestPage,
});
