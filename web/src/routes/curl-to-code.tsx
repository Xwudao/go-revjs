import { createFileRoute } from '@tanstack/react-router';
import CurlToCodePage from '@/pages/curl-to-code';

export const Route = createFileRoute('/curl-to-code')({
  component: CurlToCodePage,
});
