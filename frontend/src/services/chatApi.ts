/**
 * AIMF Chat API Service
 * ======================
 * Client-side API calls for the USER chatbot interface.
 * All requests include the JWT bearer token from the auth store.
 */

import { authHeaders, useAuthStore } from '@/store/authStore'
import type { ChatSession, ChatSendResponse, ChatHistoryResponse } from '@/types'

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8000' : '')

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    if (res.status === 401) {
      useAuthStore.getState().logout()
    }
    const body = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }))
    throw new Error(body.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

// ─── Session API ──────────────────────────────────────────────────────────────

export async function createChatSession(title?: string): Promise<ChatSession> {
  const res = await fetch(`${API_BASE}/api/v1/chat/sessions`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ title: title || 'New Conversation' }),
  })
  return handleResponse<ChatSession>(res)
}

export async function listChatSessions(
  limit = 20,
  offset = 0,
): Promise<ChatSession[]> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
  const res = await fetch(`${API_BASE}/api/v1/chat/sessions?${params}`, {
    headers: authHeaders(),
  })
  return handleResponse<ChatSession[]>(res)
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/chat/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  await handleResponse(res)
}

// ─── Message API ──────────────────────────────────────────────────────────────

export async function getChatHistory(sessionId: string): Promise<ChatHistoryResponse> {
  const res = await fetch(`${API_BASE}/api/v1/chat/sessions/${sessionId}/messages`, {
    headers: authHeaders(),
  })
  return handleResponse<ChatHistoryResponse>(res)
}

export async function sendChatMessage(
  sessionId: string,
  content: string,
): Promise<ChatSendResponse> {
  const res = await fetch(`${API_BASE}/api/v1/chat/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ content }),
  })
  return handleResponse<ChatSendResponse>(res)
}

export interface StreamCallbacks {
  onGovernance?: (data: {
    user_message: import('@/types').ChatMessage
    aimf_decision: string
    amgs_score: number | null
    memory_persisted: boolean
    memory_id: string | null
    rationale: string
  }) => void
  onToken?: (token: string) => void
  onDone?: (data: { assistant_message: import('@/types').ChatMessage }) => void
  onError?: (error: Error) => void
}

export async function streamChatMessage(
  sessionId: string,
  content: string,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/chat/sessions/${sessionId}/messages/stream`, {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
    signal,
  })

  if (!res.ok) {
    if (res.status === 401) {
      useAuthStore.getState().logout()
    }
    const body = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }))
    throw new Error(body.detail || `HTTP ${res.status}`)
  }

  if (!res.body) {
    throw new Error('ReadableStream not supported in response.')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const blocks = buffer.split('\n\n')
      buffer = blocks.pop() || ''

      for (const block of blocks) {
        if (!block.trim()) continue
        const blockLines = block.split('\n')
        let event = 'message'
        let data = ''

        for (const line of blockLines) {
          if (line.startsWith('event: ')) {
            event = line.slice(7).trim()
          } else if (line.startsWith('data: ')) {
            data = line.slice(6).trim()
          }
        }

        if (data) {
          try {
            const parsed = JSON.parse(data)
            if (event === 'governance') {
              callbacks.onGovernance?.(parsed)
            } else if (event === 'token') {
              callbacks.onToken?.(parsed.token)
            } else if (event === 'done') {
              callbacks.onDone?.(parsed)
            } else if (event === 'error') {
              callbacks.onError?.(new Error(parsed.error || 'Stream error'))
            }
          } catch {
            // Ignore JSON parse errors on partial chunks
          }
        }
      }
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return
    }
    callbacks.onError?.(err instanceof Error ? err : new Error(String(err)))
    throw err
  }
}
