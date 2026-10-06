import './styles/globals.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'

// Configure TanStack Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// Apply persisted theme on first render (before React hydrates)
function applyStoredTheme() {
  try {
    const raw = localStorage.getItem('aimf-theme')
    const stored = raw ? (JSON.parse(raw) as { state?: { resolvedTheme?: string } }) : null
    const theme = (stored?.state?.resolvedTheme ?? 'dark') as 'dark' | 'light'
    document.documentElement.classList.remove('dark', 'light')
    document.documentElement.classList.add(theme)
  } catch {
    document.documentElement.classList.add('dark')
  }
}
applyStoredTheme()


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter
          basename={import.meta.env.BASE_URL}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
)
