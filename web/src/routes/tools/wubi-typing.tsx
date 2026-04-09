import { createFileRoute } from '@tanstack/react-router';
import WubiTypingPage from '@/pages/wubi-typing';

export const Route = createFileRoute('/tools/wubi-typing')({
  component: WubiTypingPage,
});
