import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { useAuthStore } from './authStore'
import { useSidebarStore, useSettingsStore } from './index'

// In-memory localStorage mock for node environment
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

beforeAll(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    writable: true,
  })
})

describe('useSidebarStore', () => {
  beforeEach(() => {
    useSidebarStore.setState({ isCollapsed: false, isMobileOpen: false })
  })

  it('initializes with default state', () => {
    const state = useSidebarStore.getState()
    expect(state.isCollapsed).toBe(false)
    expect(state.isMobileOpen).toBe(false)
  })

  it('toggles collapse state', () => {
    useSidebarStore.getState().toggleCollapse()
    expect(useSidebarStore.getState().isCollapsed).toBe(true)

    useSidebarStore.getState().toggleCollapse()
    expect(useSidebarStore.getState().isCollapsed).toBe(false)
  })

  it('toggles and closes mobile sidebar', () => {
    useSidebarStore.getState().toggleMobile()
    expect(useSidebarStore.getState().isMobileOpen).toBe(true)

    useSidebarStore.getState().closeMobile()
    expect(useSidebarStore.getState().isMobileOpen).toBe(false)
  })
})

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    })
  })

  it('initializes as unauthenticated', () => {
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.user).toBeNull()
    expect(state.accessToken).toBeNull()
  })

  it('updates state via setTokens', () => {
    const mockUser = {
      id: 'usr-123',
      email: 'user@aimf.local',
      full_name: 'Test User',
      role: 'USER' as const,
      is_active: true,
      created_at: new Date().toISOString(),
      last_login: null,
    }

    useAuthStore.getState().setTokens('access-token-abc', 'refresh-token-xyz', mockUser)

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.accessToken).toBe('access-token-abc')
    expect(state.refreshToken).toBe('refresh-token-xyz')
    expect(state.user?.email).toBe('user@aimf.local')
    expect(state.user?.role).toBe('USER')
  })

  it('clears state on logout', () => {
    const mockUser = {
      id: 'usr-456',
      email: 'admin@aimf.local',
      full_name: 'Admin User',
      role: 'ADMIN' as const,
      is_active: true,
      created_at: new Date().toISOString(),
      last_login: null,
    }

    useAuthStore.getState().setTokens('access', 'refresh', mockUser)
    expect(useAuthStore.getState().isAuthenticated).toBe(true)

    useAuthStore.getState().logout()

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.user).toBeNull()
    expect(state.accessToken).toBeNull()
    expect(state.refreshToken).toBeNull()
  })

  it('clears error messages', () => {
    useAuthStore.setState({ error: 'Invalid credentials' })
    expect(useAuthStore.getState().error).toBe('Invalid credentials')

    useAuthStore.getState().clearError()
    expect(useAuthStore.getState().error).toBeNull()
  })
})

describe('useSettingsStore', () => {
  it('updates notification and AMGS thresholds', () => {
    const settings = useSettingsStore.getState()
    expect(settings.settings).toBeDefined()

    useSettingsStore.getState().updateSettings({ notifications_enabled: false })
    expect(useSettingsStore.getState().settings.notifications_enabled).toBe(false)

    useSettingsStore.getState().updateSettings({ notifications_enabled: true })
    expect(useSettingsStore.getState().settings.notifications_enabled).toBe(true)
  })
})
