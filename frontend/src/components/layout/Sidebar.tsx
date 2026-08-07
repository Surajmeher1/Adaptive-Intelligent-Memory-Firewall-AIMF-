import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  FlaskConical,
  Database,
  BarChart3,
  Clock,
  Shield,
  GitCompare,
  Settings,
  Info,
  ChevronLeft,
  Activity,
  Zap,
} from 'lucide-react'
import { useSidebarStore } from '@/store'
import clsx from 'clsx'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard',    sub: 'Overview' },
  { to: '/lab',       icon: FlaskConical,    label: 'Memory Lab',   sub: 'Analyze input' },
  { to: '/vault',     icon: Database,        label: 'Memory Vault', sub: 'Browse & search' },
  { to: '/analytics', icon: BarChart3,       label: 'Analytics',    sub: 'Charts & trends' },
  { to: '/timeline',  icon: Clock,           label: 'Timeline',     sub: 'Event history' },
  { to: '/privacy',   icon: Shield,          label: 'Privacy',      sub: 'Sensitive data' },
  { to: '/compare',   icon: GitCompare,      label: 'Compare',      sub: 'Algorithms' },
]

const BOTTOM_ITEMS = [
  { to: '/settings', icon: Settings, label: 'Settings', sub: 'Preferences' },
  { to: '/about',    icon: Info,     label: 'About',    sub: 'Project info' },
]

export default function Sidebar() {
  const { isCollapsed, isMobileOpen, toggleCollapse, closeMobile } = useSidebarStore()
  const location = useLocation()

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeMobile}
            className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.nav
        animate={{ width: isCollapsed ? 64 : 240 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        style={{ backgroundColor: 'var(--color-bg-sidebar)', borderColor: 'var(--color-divider)' }}
        className={clsx(
          'relative z-40 flex flex-col h-dvh flex-shrink-0',
          'border-r',
          'overflow-hidden',
          // Mobile: absolute positioning
          'max-md:fixed max-md:left-0 max-md:top-0',
          isMobileOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full',
          'transition-transform md:transition-none'
        )}
      >
        {/* Logo / Brand */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 shadow-lg shadow-indigo-500/25">
            <Activity className="h-4.5 w-4.5 text-white" />
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.18 }}
                className="min-w-0"
              >
                <div className="text-sm font-bold tracking-wide text-white">AIMF</div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  Memory Firewall
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Collapse toggle — desktop only */}
          <button
            onClick={toggleCollapse}
            className={clsx(
              'hidden md:flex ml-auto h-6 w-6 flex-shrink-0 items-center justify-center',
              'rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.06]',
              'transition-colors'
            )}
          >
            <motion.div animate={{ rotate: isCollapsed ? 180 : 0 }} transition={{ duration: 0.25 }}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </motion.div>
          </button>
        </div>

        {/* Status pill */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mx-3 mt-3 flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[11px] font-medium text-emerald-400">Pipeline Active</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main nav */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-0.5">
          {NAV_ITEMS.map(({ to, icon: Icon, label, sub }) => (
            <NavLink
              key={to}
              to={to}
              onClick={closeMobile}
              className={({ isActive }) =>
                clsx(
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-150',
                  isActive
                    ? 'bg-indigo-500/12 border border-indigo-500/20 text-white shadow-sm shadow-indigo-500/10'
                    : 'border border-transparent text-slate-400 hover:text-slate-100 hover:bg-white/[0.04] hover:border-white/[0.06]'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={clsx(
                      'h-4 w-4 flex-shrink-0 transition-colors',
                      isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'
                    )}
                  />
                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="min-w-0"
                      >
                        <div className="text-sm font-medium leading-none">{label}</div>
                        <div className="text-[10px] text-slate-600 mt-0.5 uppercase tracking-wider">
                          {sub}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Bottom nav */}
        <div className="px-2 py-3 border-t border-white/[0.06] space-y-0.5">
          {BOTTOM_ITEMS.map(({ to, icon: Icon, label, sub }) => (
            <NavLink
              key={to}
              to={to}
              onClick={closeMobile}
              className={({ isActive }) =>
                clsx(
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-150',
                  isActive
                    ? 'bg-indigo-500/12 border border-indigo-500/20 text-white'
                    : 'border border-transparent text-slate-400 hover:text-slate-100 hover:bg-white/[0.04] hover:border-white/[0.06]'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={clsx(
                      'h-4 w-4 flex-shrink-0 transition-colors',
                      isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'
                    )}
                  />
                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="min-w-0"
                      >
                        <div className="text-sm font-medium leading-none">{label}</div>
                        <div className="text-[10px] text-slate-600 mt-0.5 uppercase tracking-wider">
                          {sub}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </NavLink>
          ))}

          {/* Version tag */}
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-2 flex items-center gap-1.5 px-3"
              >
                <Zap className="h-3 w-3 text-slate-600" />
                <span className="text-[10px] text-slate-600 font-mono">
                  AIMF v1.0 · 2026
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.nav>
    </>
  )
}
