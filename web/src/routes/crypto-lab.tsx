import { createFileRoute } from '@tanstack/react-router'
import CryptoLabPage from '@/pages/crypto-lab'

export const Route = createFileRoute('/crypto-lab')({
  component: CryptoLabPage,
})
