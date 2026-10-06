import AppRouter from './routes'
import { useThemeStore } from './store'
import { Toaster } from 'react-hot-toast'

export default function App() {
  useThemeStore() // keeps theme store alive for subscribers
  return (
    <>
      <AppRouter />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#141720',
            color: '#e2e8f0',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '10px',
            fontSize: '13px',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#141720' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#141720' } },
        }}
      />
    </>
  )
}
