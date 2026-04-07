import { createFileRoute } from '@tanstack/react-router'
import TextPipelinePage from '@/pages/text-pipeline'

export const Route = createFileRoute('/text-pipeline')({
  component: TextPipelinePage,
})
