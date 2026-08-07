import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Theme, UserSettings } from '@/types'

// ─── Theme Store ─────────────────────────────────────────────────────────────

interface ThemeStore {
  theme: Theme
  resolvedTheme: 'dark' | 'light'
  setTheme: (theme: Theme) => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'dark',
      resolvedTheme: 'dark',
      setTheme: (theme) => {
        const resolved =
          theme === 'system'
            ? window.matchMedia('(prefers-color-scheme: dark)').matches
              ? 'dark'
              : 'light'
            : theme

        // Always set exactly one class so CSS vars work correctly
        document.documentElement.classList.remove('dark', 'light')
        document.documentElement.classList.add(resolved)
        document.documentElement.style.setProperty('transition', 'background-color 0.3s ease, color 0.3s ease')
        set({ theme, resolvedTheme: resolved })
      },
    }),
    { name: 'aimf-theme' }
  )
)

// ─── Sidebar Store ────────────────────────────────────────────────────────────

interface SidebarStore {
  isCollapsed: boolean
  isMobileOpen: boolean
  toggleCollapse: () => void
  toggleMobile: () => void
  closeMobile: () => void
}

export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set) => ({
      isCollapsed: false,
      isMobileOpen: false,
      toggleCollapse: () => set((s) => ({ isCollapsed: !s.isCollapsed })),
      toggleMobile: () => set((s) => ({ isMobileOpen: !s.isMobileOpen })),
      closeMobile: () => set({ isMobileOpen: false }),
    }),
    { name: 'aimf-sidebar', partialize: (s) => ({ isCollapsed: s.isCollapsed }) }
  )
)

// ─── Settings Store ────────────────────────────────────────────────────────────

const defaultSettings: UserSettings = {
  theme: 'dark',
  sidebar_collapsed: false,
  notifications_enabled: true,
  compact_mode: false,
  animations_enabled: true,
  language: 'en',
  amgs_weights: {
    usefulness: 0.25,
    context: 0.15,
    frequency: 0.15,
    novelty: 0.20,
    redundancy: 0.10,
    privacy: 0.10,
    decay: 0.05,
  },
  thresholds: {
    long_term: 0.75,
    store: 0.50,
    summarize: 0.30,
    forget: 0.15,
    encrypt: 0.85,
    reject_privacy: 0.95,
  },
}

interface SettingsStore {
  settings: UserSettings
  updateSettings: (patch: Partial<UserSettings>) => void
  resetSettings: () => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),
      resetSettings: () => set({ settings: defaultSettings }),
    }),
    { name: 'aimf-settings' }
  )
)

// ─── Notifications Store ──────────────────────────────────────────────────────

interface NotificationStore {
  unreadCount: number
  setUnreadCount: (count: number) => void
  decrementUnread: () => void
  clearUnread: () => void
}

export const useNotificationStore = create<NotificationStore>()((set) => ({
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: count }),
  decrementUnread: () => set((s) => ({ unreadCount: Math.max(0, s.unreadCount - 1) })),
  clearUnread: () => set({ unreadCount: 0 }),
}))
