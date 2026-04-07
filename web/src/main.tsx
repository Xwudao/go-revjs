import { StrictMode } from 'react'
import { RouterProvider } from '@tanstack/react-router'
import { createRoot } from 'react-dom/client'
import { ConfigProvider } from '@/provider/ConfigProvider'
import { router } from '@/router'
import 'virtual:uno.css'
import '@/styles/index.scss'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider>
      <RouterProvider router={router} />
    </ConfigProvider>
  </StrictMode>,
)
