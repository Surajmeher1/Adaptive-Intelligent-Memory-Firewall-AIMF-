import { Bell, Menu, Search, Moon, Sun, LogOut } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSidebarStore, useThemeStore, useNotificationStore } from '@/store'
import { useAuthStore } from '@/store/authStore'
import clsx from 'clsx'

const ROUTE_TITLES: Record<string, { title: string; sub: string }> = {
  '/dashboard': { title: 'Dashboard',    sub: 'System overview & activity' },
  '/lab':       { title: 'Memory Lab',   sub: 'Analyze and process new memories' },
  '/vault':     { title: 'Memory Vault', sub: 'Browse, search and manage memories' },
  '/analytics': { title: 'Analytics',    sub: 'Charts, trends and statistics' },
  '/timeline':  { title: 'Timeline',     sub: 'Event history and activity log' },
  '/privacy':   { title: 'Privacy',      sub: 'Sensitive data and security status' },
  '/compare':   { title: 'Algorithm Comparison', sub: 'AIMF vs baseline approaches' },
  '/settings':  { title: 'Settings',     sub: 'Preferences and configuration' },
  '/about':     { title: 'About',        sub: 'Project information' },
}

export default function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const { toggleMobile } = useSidebarStore()
  const { resolvedTheme, setTheme } = useThemeStore()
  const { unreadCount } = useNotificationStore()
  const { user, isAuthenticated, logout } = useAuthStore()

  const current = ROUTE_TITLES[location.pathname] ?? { title: 'AIMF', sub: '' }

  return (
    <header
      style={{ backgroundColor: 'var(--color-header-bg)', borderBottomColor: 'var(--color-header-border)' }}
      className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b backdrop-blur-md px-4 md:px-6 flex-shrink-0"
    >
      {/* Mobile hamburger */}
      <button
        onClick={toggleMobile}
        className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* Page title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-semibold text-white truncate">{current.title}</h1>
        <p className="text-[11px] text-slate-500 truncate hidden sm:block">{current.sub}</p>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1.5">
        {/* Search */}
        <button className="hidden sm:flex h-8 items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 text-xs text-slate-500 hover:text-slate-300 hover:border-white/[0.12] transition-all">
          <Search className="h-3.5 w-3.5" />
          <span>Search</span>
          <kbd className="ml-1 font-mono text-[10px] text-slate-600">⌘K</kbd>
        </button>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className={clsx(
            'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
            'text-slate-500 hover:text-slate-200 hover:bg-white/[0.06]'
          )}
          title="Toggle theme"
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>

        {/* Notifications */}
        <button className="relative flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-colors">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-indigo-500 text-[9px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Auth profile & logout */}
        {isAuthenticated && user ? (
          <div className="flex items-center gap-2 pl-2 border-l border-white/[0.08]">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 text-xs font-bold text-white select-none shadow-sm flex-shrink-0"
              title={`${user.full_name || user.email} (${user.role})`}
            >
              {(user.full_name?.[0] || user.email[0] || 'U').toUpperCase()}
            </div>
            <div className="hidden lg:flex flex-col text-left leading-tight">
              <span className="text-xs font-medium text-slate-200 truncate max-w-[120px]">
                {user.full_name || user.email}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {user.role}
              </span>
            </div>
            <button
              onClick={() => {
                logout()
                navigate('/login')
              }}
              className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs text-slate-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 transition-colors"
          >
            Sign in
          </button>
        )}
      </div>
    </header>
  )
}
