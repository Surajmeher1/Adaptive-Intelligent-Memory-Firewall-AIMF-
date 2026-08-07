import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import RootLayout from '@/layouts/RootLayout'
import PageLoader from '@/components/common/PageLoader'

// ─── Public pages (no sidebar) ────────────────────────────────────────────────
const Landing  = lazy(() => import('@/pages/landing/LandingPage'))
const Login    = lazy(() => import('@/pages/auth/LoginPage'))
const Register = lazy(() => import('@/pages/auth/RegisterPage'))

// ─── App pages (inside RootLayout with sidebar) ───────────────────────────────
const Dashboard = lazy(() => import('@/pages/dashboard/DashboardPage'))
const MemoryLab = lazy(() => import('@/pages/memory-lab/MemoryLabPage'))
const MemoryVault = lazy(() => import('@/pages/memory-vault/MemoryVaultPage'))
const Analytics = lazy(() => import('@/pages/analytics/AnalyticsPage'))
const Timeline  = lazy(() => import('@/pages/timeline/TimelinePage'))
const Privacy   = lazy(() => import('@/pages/privacy/PrivacyPage'))
const Comparison = lazy(() => import('@/pages/comparison/ComparisonPage'))
const Settings  = lazy(() => import('@/pages/settings/SettingsPage'))
const About     = lazy(() => import('@/pages/about/AboutPage'))
const NotFound  = lazy(() => import('@/pages/NotFoundPage'))

export default function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ── Public (no sidebar) ─────────────────────────────────── */}
        <Route path="/"         element={<Landing />}  />
        <Route path="/login"    element={<Login />}    />
        <Route path="/register" element={<Register />} />

        {/* ── App (with sidebar + header) ─────────────────────────── */}
        <Route element={<RootLayout />}>
          <Route path="/dashboard" element={<Dashboard />}  />
          <Route path="/lab"       element={<MemoryLab />}  />
          <Route path="/vault"     element={<MemoryVault />} />
          <Route path="/analytics" element={<Analytics />}  />
          <Route path="/timeline"  element={<Timeline />}   />
          <Route path="/privacy"   element={<Privacy />}    />
          <Route path="/compare"   element={<Comparison />} />
          <Route path="/settings"  element={<Settings />}   />
          <Route path="/about"     element={<About />}      />
        </Route>

        {/* ── 404 ─────────────────────────────────────────────────── */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}
