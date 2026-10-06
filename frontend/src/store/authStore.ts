/**
 * AIMF Auth Store — Zustand
 * ===========================
 * Manages JWT tokens, user profile, and authentication state.
 * Persists tokens to localStorage for session survival across reloads.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from '@/types'

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8000' : '')

/** Extract a human-readable message from FastAPI error responses. */
function extractErrorMessage(err: unknown, status?: number): string {
  if (status === 401) {
    if (err && typeof err === 'object' && 'detail' in err && typeof (err as Record<string, unknown>).detail === 'string') {
      const detail = (err as Record<string, unknown>).detail as string
      if (detail.toLowerCase().includes('deactivated')) return 'User account is deactivated.'
    }
    return 'Invalid email or password.'
  }
  if (status === 403) {
    return 'You are not authorized to access this dashboard.'
  }
  if (status === 404) {
    return 'Authentication service endpoint not found.'
  }
  if (status === 422) {
    return 'Invalid request format. Please check your email and password.'
  }
  if (status && status >= 500) {
    return 'AIMF server error. Please try again.'
  }
  if (typeof err === 'string') return err
  if (err && typeof err === 'object' && 'detail' in err) {
    const detail = (err as Record<string, unknown>).detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0]
      if (typeof first === 'string') return first
      if (first && typeof first === 'object' && 'msg' in first) return String(first.msg)
    }
  }
  return status ? `HTTP ${status}` : 'Authentication failed'
}

/** Convert network-level errors (like connection refused) into user-friendly messages. */
function handleNetworkError(err: unknown): string {
  if (err instanceof TypeError && err.message.toLowerCase().includes('failed to fetch')) {
    return 'Unable to connect to the AIMF server. Please check that the backend is running.'
  }
  if (err instanceof Error) {
    const lower = err.message.toLowerCase()
    if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('connection refused')) {
      return 'Unable to connect to the AIMF server. Please check that the backend is running.'
    }
    return err.message
  }
  return 'Authentication failed'
}

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName: string) => Promise<void>
  logout: () => void
  clearError: () => void
  setTokens: (access: string, refresh: string, user: AuthUser) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          })
          if (!res.ok) {
            const body = await res.json().catch(() => null)
            throw new Error(extractErrorMessage(body, res.status))
          }
          const data = await res.json()
          set({
            user: data.user,
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (err) {
          const message = handleNetworkError(err)
          set({ isLoading: false, error: message })
          throw new Error(message)
        }
      },

      register: async (email, password, fullName) => {
        set({ isLoading: true, error: null })
        try {
          const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, full_name: fullName }),
          })
          if (!res.ok) {
            const body = await res.json().catch(() => null)
            throw new Error(extractErrorMessage(body, res.status))
          }
          const data = await res.json()
          set({
            user: data.user,
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (err) {
          const message = handleNetworkError(err)
          set({ isLoading: false, error: message })
          throw new Error(message)
        }
      },

      logout: () => {
        try {
          fetch(`${API_BASE}/api/v1/auth/logout`, {
            method: 'POST',
            headers: authHeaders(),
          }).catch(() => {})
        } catch {
          // ignore
        }

        try {
          localStorage.removeItem('aimf-auth')
          sessionStorage.clear()
        } catch {
          // ignore
        }

        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        })
      },

      clearError: () => set({ error: null }),

      setTokens: (access, refresh, user) =>
        set({ accessToken: access, refreshToken: refresh, user, isAuthenticated: true }),
    }),
    {
      name: 'aimf-auth',
      partialize: (s) => ({
        user: s.user,
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
        isAuthenticated: s.isAuthenticated,
      }),
    }
  )
)

/**
 * Helper to get an authenticated fetch header.
 * Use in API services: `headers: authHeaders()`
 */
export function authHeaders(): Record<string, string> {
  const token = useAuthStore.getState().accessToken
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' }
}
