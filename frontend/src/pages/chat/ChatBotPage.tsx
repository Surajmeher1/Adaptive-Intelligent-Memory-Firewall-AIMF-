/**
 * AIMF Modern Chatbot Page
 * =========================
 * Full-featured ChatGPT-like AI experience for USER-role accounts:
 * - Real progressive token streaming via Server-Sent Events (SSE)
 * - AI thinking state animation
 * - Clean Markdown formatting (headings, lists, bold/italics, links, blockquotes, tables)
 * - Code blocks with language badge and "Copy code" button
 * - Assistant action bar: "Copy response" and "Regenerate"
 * - Prominent "Stop generating" button while streaming
 * - Intelligent auto-scroll with manual scroll override
 * - Preserves AIMF/AMGS governance server-side without exposing raw rationale to users
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare,
  Send,
  Plus,
  Trash2,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Clock,
  Brain,
  AlertTriangle,
  Menu,
  X,
  LogOut,
  Loader2,
  Sparkles,
  Bot,
  User as UserIcon,
  Copy,
  Check,
  RotateCcw,
  Square,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import {
  createChatSession,
  listChatSessions,
  deleteChatSession,
  getChatHistory,
  streamChatMessage,
} from '@/services/chatApi'
import type { ChatSession, ChatMessage } from '@/types'
import { MarkdownContent } from '@/components/chat/MarkdownContent'
import { ThinkingAnimation } from '@/components/chat/ThinkingAnimation'

// ─── Governance Decision Badge (User Prompt Only) ───────────────────────────

function DecisionBadge({ decision, score }: { decision: string | null; score: string | null }) {
  if (!decision) return null

  const badges: Record<
    string,
    { icon: React.ComponentType<{ className?: string; size?: number | string }>; label: string; color: string; bg: string }
  > = {
    STORE:           { icon: ShieldCheck,  label: 'Stored',       color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    STORE_LONG_TERM: { icon: ShieldCheck,  label: 'Long-term',    color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    STORE_ENCRYPT:   { icon: Lock,         label: 'Encrypted',    color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
    STORE_TEMPORARY: { icon: Clock,        label: 'Temporary',    color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    SUMMARIZE:       { icon: Brain,        label: 'Summarized',   color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
    REJECT:          { icon: AlertTriangle, label: 'Not stored',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    REJECT_PRIVACY:  { icon: ShieldAlert,  label: 'Privacy blocked', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
    HOLD_FOR_REVIEW: { icon: Clock,        label: 'Under review', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  }

  const badge = badges[decision] || { icon: Shield, label: decision, color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' }
  const Icon = badge.icon

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all"
      style={{ color: badge.color, backgroundColor: badge.bg, border: `1px solid ${badge.color}25` }}
    >
      <Icon size={12} />
      <span>{badge.label}</span>
      {score && (
        <span className="opacity-60 ml-0.5">
          ({parseFloat(score).toFixed(2)})
        </span>
      )}
    </div>
  )
}

// ─── Assistant Message Action Bar ────────────────────────────────────────────

function AssistantActions({
  content,
  isLast,
  isStreaming,
  onRegenerate,
}: {
  content: string
  isLast: boolean
  isStreaming: boolean
  onRegenerate: () => void
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy response:', err)
    }
  }

  if (isStreaming || !content.trim()) return null

  return (
    <div className="flex items-center gap-1 mt-2.5 text-xs text-slate-400">
      <button
        onClick={handleCopy}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-slate-800/80 hover:text-slate-200 transition cursor-pointer"
        title="Copy response"
      >
        {copied ? (
          <>
            <Check size={13} className="text-emerald-400" />
            <span className="text-[11px] text-emerald-400">Copied</span>
          </>
        ) : (
          <>
            <Copy size={13} />
            <span className="text-[11px]">Copy</span>
          </>
        )}
      </button>

      {isLast && (
        <button
          onClick={onRegenerate}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-slate-800/80 hover:text-slate-200 transition cursor-pointer"
          title="Regenerate response"
        >
          <RotateCcw size={13} />
          <span className="text-[11px]">Regenerate</span>
        </button>
      )}
    </div>
  )
}

// ─── Message Item Component ──────────────────────────────────────────────────

function ChatMessageItem({
  message,
  isLast,
  isStreaming,
  isThinking,
  onRegenerate,
}: {
  message: ChatMessage
  isLast: boolean
  isStreaming: boolean
  isThinking: boolean
  onRegenerate: () => void
}) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex gap-3 justify-end items-start"
      >
        <div className="flex flex-col items-end max-w-[80%] md:max-w-[70%]">
          <div
            className="rounded-2xl px-4 py-3 text-sm leading-relaxed text-slate-100"
            style={{
              background: 'linear-gradient(135deg, rgba(79,70,229,0.3), rgba(6,182,212,0.2))',
              border: '1px solid rgba(99,102,241,0.3)',
              borderBottomRightRadius: '4px',
            }}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>

          {/* AIMF Governance Decision Badge */}
          {message.aimf_decision && (
            <div className="mt-1.5 mr-1">
              <DecisionBadge decision={message.aimf_decision} score={message.amgs_score} />
            </div>
          )}

          <span className="text-[10px] text-slate-500 mt-1 px-1">
            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* User Avatar */}
        <div
          className="flex-shrink-0 h-8 w-8 rounded-xl flex items-center justify-center mt-1"
          style={{ background: 'linear-gradient(135deg, #4f46e5, #06b6d4)' }}
        >
          <UserIcon size={14} className="text-white" />
        </div>
      </motion.div>
    )
  }

  // Assistant Message
  const showThinking = isLast && isThinking && !message.content

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex gap-3 justify-start items-start"
    >
      {/* Bot Avatar */}
      <div
        className="flex-shrink-0 h-8 w-8 rounded-xl flex items-center justify-center mt-1"
        style={{
          background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
          border: '1px solid rgba(99,102,241,0.25)',
          boxShadow: '0 0 16px rgba(99,102,241,0.15)',
        }}
      >
        <Bot size={15} className="text-indigo-300" />
      </div>

      {/* Message Content Container */}
      <div className="flex flex-col items-start flex-1 min-w-0 max-w-[90%] md:max-w-[85%]">
        <div
          className="w-full rounded-2xl px-4 py-3 text-sm leading-relaxed"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderBottomLeftRadius: '4px',
          }}
        >
          {showThinking ? (
            <ThinkingAnimation />
          ) : (
            <MarkdownContent
              content={message.content}
              isStreaming={isLast && isStreaming}
            />
          )}
        </div>

        {/* Action Bar (Copy / Regenerate) */}
        <AssistantActions
          content={message.content}
          isLast={isLast}
          isStreaming={isStreaming && isLast}
          onRegenerate={onRegenerate}
        />

        <span className="text-[10px] text-slate-500 mt-1 px-1">
          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </motion.div>
  )
}

// ─── Session List Item ───────────────────────────────────────────────────────

function SessionItem({
  session,
  isActive,
  onSelect,
  onDelete,
}: {
  session: ChatSession
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
}) {
  return (
    <div
      onClick={onSelect}
      className="group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200"
      style={{
        background: isActive ? 'rgba(79,70,229,0.15)' : 'transparent',
        border: isActive ? '1px solid rgba(79,70,229,0.25)' : '1px solid transparent',
      }}
      onMouseEnter={(e) => {
        if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.background = 'transparent'
      }}
    >
      <MessageSquare size={14} className="flex-shrink-0 text-slate-400" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-200 truncate">{session.title}</p>
        <p className="text-[10px] text-slate-500">
          {new Date(session.updated_at).toLocaleDateString()}
        </p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg transition-all hover:bg-red-500/20"
        title="Delete session"
      >
        <Trash2 size={12} className="text-red-400" />
      </button>
    </div>
  )
}

// ─── Main ChatBot Page ───────────────────────────────────────────────────────

export default function ChatBotPage() {
  const navigate = useNavigate()
  const { user, isAuthenticated, logout } = useAuthStore()

  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [isLoadingSessions, setIsLoadingSessions] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const isNearBottomRef = useRef(true)

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) navigate('/login')
  }, [isAuthenticated, navigate])

  useEffect(() => {
    document.title = 'Chat — AIMF'
  }, [])

  // Track if user is scrolled near bottom
  const handleScroll = () => {
    if (!scrollContainerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight
    isNearBottomRef.current = distanceFromBottom < 100
  }

  // Scroll to bottom helper
  const scrollToBottom = useCallback((smooth = true) => {
    if (isNearBottomRef.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })
    }
  }, [])

  // Scroll on messages change
  useEffect(() => {
    scrollToBottom(true)
  }, [messages, isThinking, scrollToBottom])

  // Load sessions
  const loadSessions = useCallback(async () => {
    try {
      setIsLoadingSessions(true)
      const data = await listChatSessions()
      setSessions(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions')
    } finally {
      setIsLoadingSessions(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) loadSessions()
  }, [isAuthenticated, loadSessions])

  // Load messages when active session changes
  useEffect(() => {
    if (!activeSession) {
      setMessages([])
      return
    }

    // Abort any ongoing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsStreaming(false)
      setIsThinking(false)
    }

    let cancelled = false
    async function load() {
      try {
        setIsLoadingMessages(true)
        const history = await getChatHistory(activeSession!.id)
        if (!cancelled) {
          setMessages(history.messages)
          isNearBottomRef.current = true
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load messages')
      } finally {
        if (!cancelled) setIsLoadingMessages(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [activeSession])

  // Create new session
  async function handleNewSession() {
    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
      setIsStreaming(false)
      setIsThinking(false)

      const session = await createChatSession()
      setSessions((prev) => [session, ...prev])
      setActiveSession(session)
      setMessages([])
      setTimeout(() => inputRef.current?.focus(), 100)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session')
    }
  }

  // Delete session
  async function handleDeleteSession(sessionId: string) {
    try {
      if (activeSession?.id === sessionId && abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
      await deleteChatSession(sessionId)
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
      if (activeSession?.id === sessionId) {
        setActiveSession(null)
        setMessages([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete session')
    }
  }

  // Stop generating
  function handleStopGenerating() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsStreaming(false)
    setIsThinking(false)
  }

  // Core stream runner
  const executeStream = async (session: ChatSession, content: string, existingUserMsgId?: string) => {
    setError(null)
    setIsStreaming(true)
    setIsThinking(true)
    isNearBottomRef.current = true

    // Optimistic user message if not already present
    const userMsgId = existingUserMsgId || `tmp-u-${Date.now()}`
    if (!existingUserMsgId) {
      const optimisticUserMsg: ChatMessage = {
        id: userMsgId,
        session_id: session.id,
        role: 'user',
        content,
        aimf_decision: null,
        amgs_score: null,
        memory_id: null,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, optimisticUserMsg])
    }

    // Optimistic assistant placeholder
    const assistantMsgId = `tmp-a-${Date.now()}`
    const optimisticAssistantMsg: ChatMessage = {
      id: assistantMsgId,
      session_id: session.id,
      role: 'assistant',
      content: '',
      aimf_decision: null,
      amgs_score: null,
      memory_id: null,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimisticAssistantMsg])

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      await streamChatMessage(
        session.id,
        content,
        {
          onGovernance: (gov) => {
            // Update user message badge
            setMessages((prev) =>
              prev.map((m) =>
                m.id === userMsgId
                  ? {
                      ...m,
                      aimf_decision: gov.aimf_decision,
                      amgs_score: gov.amgs_score != null ? String(gov.amgs_score) : null,
                      memory_id: gov.memory_id,
                    }
                  : m
              )
            )
          },
          onToken: (token) => {
            setIsThinking(false)
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, content: m.content + token }
                  : m
              )
            )
          },
          onDone: ({ assistant_message }) => {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantMsgId ? assistant_message : m))
            )
            // Update session title in list if first message
            const newTitle = content.slice(0, 50)
            setSessions((prev) =>
              prev.map((s) =>
                s.id === session.id
                  ? { ...s, title: newTitle, updated_at: new Date().toISOString() }
                  : s
              )
            )
            setActiveSession((prev) =>
              prev && prev.id === session.id
                ? { ...prev, title: newTitle, updated_at: new Date().toISOString() }
                : prev
            )
          },
          onError: (err) => {
            if (err.name !== 'AbortError') {
              setError(err.message || 'Stream connection error')
            }
          },
        },
        controller.signal
      )
    } catch (err: unknown) {
      const errorObj = err as Error
      if (errorObj.name !== 'AbortError') {
        setError(errorObj.message || 'Failed to send message')
      }
    } finally {
      setIsStreaming(false)
      setIsThinking(false)
      abortControllerRef.current = null
      inputRef.current?.focus()
    }
  }

  // Send message
  async function handleSendMessage() {
    if (!inputValue.trim() || isStreaming) return

    const content = inputValue.trim()
    setInputValue('')
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
    }

    let session = activeSession
    if (!session) {
      try {
        session = await createChatSession()
        setSessions((prev) => [session!, ...prev])
        setActiveSession(session)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create session')
        return
      }
    }

    await executeStream(session, content)
  }

  // Regenerate last response
  async function handleRegenerate() {
    if (isStreaming || !activeSession || messages.length === 0) return

    // Find the last user message and the last assistant message
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')
    if (!lastUserMsg) return

    // Remove the trailing assistant message(s) after that user message
    const userIndex = messages.findIndex((m) => m.id === lastUserMsg.id)
    if (userIndex === -1) return

    const trimmedMessages = messages.slice(0, userIndex + 1)
    setMessages(trimmedMessages)

    await executeStream(activeSession, lastUserMsg.content, lastUserMsg.id)
  }

  // Handle Enter key
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  if (!isAuthenticated) return null

  return (
    <div className="flex h-dvh overflow-hidden" style={{ backgroundColor: '#0a0d14' }}>

      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex-shrink-0 flex flex-col h-full border-r overflow-hidden"
            style={{
              backgroundColor: '#08090f',
              borderColor: 'rgba(255,255,255,0.06)',
            }}
          >
            {/* Sidebar header */}
            <div className="flex items-center justify-between px-4 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2.5">
                <div
                  className="h-8 w-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #4f46e5, #06b6d4)', boxShadow: '0 0 20px rgba(79,70,229,0.3)' }}
                >
                  <Shield size={14} className="text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">AIMF Chat</h2>
                  <p className="text-[10px] text-slate-500">Governed AI Assistant</p>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/5 transition cursor-pointer"
                title="Close sidebar"
              >
                <X size={14} className="text-slate-400" />
              </button>
            </div>

            {/* New chat button */}
            <div className="px-3 py-3">
              <button
                onClick={handleNewSession}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200 cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, rgba(79,70,229,0.2), rgba(6,182,212,0.15))',
                  border: '1px solid rgba(79,70,229,0.3)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(79,70,229,0.35), rgba(6,182,212,0.25))' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(79,70,229,0.2), rgba(6,182,212,0.15))' }}
              >
                <Plus size={14} />
                New Conversation
              </button>
            </div>

            {/* Sessions list */}
            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
              {isLoadingSessions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={20} className="animate-spin text-slate-500" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <MessageSquare size={28} className="text-slate-600 mb-2" />
                  <p className="text-sm text-slate-500">No conversations yet</p>
                  <p className="text-[11px] text-slate-600 mt-1">Start a new chat above</p>
                </div>
              ) : (
                sessions.map((s) => (
                  <SessionItem
                    key={s.id}
                    session={s}
                    isActive={activeSession?.id === s.id}
                    onSelect={() => setActiveSession(s)}
                    onDelete={() => handleDeleteSession(s.id)}
                  />
                ))
              )}
            </div>

            {/* User profile footer */}
            <div className="px-3 py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-3 px-2">
                <div
                  className="h-8 w-8 rounded-xl flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)' }}
                >
                  {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 truncate">{user?.full_name || user?.email}</p>
                  <p className="text-[10px] text-slate-500">{user?.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg hover:bg-red-500/15 transition cursor-pointer"
                  title="Logout"
                >
                  <LogOut size={14} className="text-slate-400 hover:text-red-400" />
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Main Chat Area ─────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Chat header */}
        <header
          className="flex items-center gap-3 px-5 py-3.5 border-b"
          style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(8,9,15,0.85)', backdropFilter: 'blur(12px)' }}
        >
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-lg hover:bg-white/5 transition cursor-pointer"
              title="Open sidebar"
            >
              <Menu size={16} className="text-slate-400" />
            </button>
          )}
          <div className="flex items-center gap-2.5">
            <Sparkles size={16} className="text-indigo-400" />
            <h1 className="text-sm font-semibold text-white truncate max-w-[280px] md:max-w-md">
              {activeSession?.title || 'AIMF Governed Chat'}
            </h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium"
              style={{ color: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}
            >
              <ShieldCheck size={11} />
              <span>AIMF Firewall Active</span>
            </div>
          </div>
        </header>

        {/* Messages scroll area */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 py-6"
        >
          {!activeSession ? (
            /* Empty state: no session selected */
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center max-w-lg"
              >
                <div
                  className="h-16 w-16 rounded-2xl flex items-center justify-center mb-5"
                  style={{
                    background: 'linear-gradient(135deg, rgba(79,70,229,0.2), rgba(6,182,212,0.15))',
                    border: '1px solid rgba(79,70,229,0.3)',
                    boxShadow: '0 0 40px rgba(79,70,229,0.2)',
                  }}
                >
                  <Bot size={30} className="text-indigo-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">AIMF Intelligence Chat</h2>
                <p className="text-sm text-slate-400 mb-1">
                  Experience modern, real-time conversational AI governed by the Adaptive Memory Firewall.
                </p>
                <p className="text-xs text-slate-500 mb-6">
                  Every response is streamed live with full markdown, code syntax support, and privacy governance.
                </p>

                <div className="grid grid-cols-3 gap-3 w-full mb-6">
                  {[
                    { icon: ShieldCheck, label: 'Privacy Defense', desc: 'PII blocked automatically' },
                    { icon: Sparkles,    label: 'Real Streaming',  desc: 'Fast token generation' },
                    { icon: Lock,        label: 'Secure Memory',   desc: 'AES-256 encrypted storage' },
                  ].map(({ icon: Icon, label, desc }) => (
                    <div
                      key={label}
                      className="flex flex-col items-center p-3 rounded-xl text-center"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <Icon size={18} className="text-indigo-400 mb-1.5" />
                      <p className="text-xs font-medium text-slate-200">{label}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{desc}</p>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleNewSession}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium text-white transition-all cursor-pointer"
                  style={{
                    background: 'linear-gradient(135deg, #4f46e5, #06b6d4)',
                    boxShadow: '0 0 25px rgba(79,70,229,0.3)',
                  }}
                >
                  <Plus size={14} />
                  Start New Chat
                </button>
              </motion.div>
            </div>
          ) : isLoadingMessages ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 size={24} className="animate-spin text-slate-500" />
            </div>
          ) : messages.length === 0 ? (
            /* Empty session state */
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div
                className="h-12 w-12 rounded-2xl flex items-center justify-center mb-3"
                style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}
              >
                <Bot size={24} className="text-indigo-400" />
              </div>
              <p className="text-sm font-medium text-slate-300">How can I help you today?</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Ask a question, request code, or explore ideas. Your conversation is dynamically governed by AIMF.
              </p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-5">
              {messages.map((msg, index) => {
                const isLast = index === messages.length - 1
                return (
                  <ChatMessageItem
                    key={msg.id}
                    message={msg}
                    isLast={isLast}
                    isStreaming={isStreaming}
                    isThinking={isThinking}
                    onRegenerate={handleRegenerate}
                  />
                )
              })}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="mx-4 mb-2 flex items-center gap-2 px-4 py-2 rounded-xl text-xs"
              style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}
            >
              <AlertTriangle size={12} className="flex-shrink-0" />
              <span className="flex-1">{error}</span>
              <button onClick={() => setError(null)} className="p-0.5 hover:text-white transition cursor-pointer">
                <X size={12} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating "Stop generating" button while streaming */}
        <AnimatePresence>
          {isStreaming && (
            <div className="flex justify-center -mb-2 z-10">
              <motion.button
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                onClick={handleStopGenerating}
                className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium text-slate-200 bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/70 shadow-lg backdrop-blur-md transition-all cursor-pointer"
              >
                <Square size={11} className="fill-current text-rose-400" />
                <span>Stop generating</span>
              </motion.button>
            </div>
          )}
        </AnimatePresence>

        {/* Input area */}
        <div className="px-4 pb-4 pt-2">
          <div
            className="max-w-3xl mx-auto flex items-end gap-3 p-3 rounded-2xl"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 -4px 24px rgba(0,0,0,0.2)',
            }}
          >
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything… (Shift+Enter for new line)"
              rows={1}
              className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 resize-none outline-none py-1.5 px-1 max-h-36"
              style={{ scrollbarWidth: 'thin' }}
              onInput={(e) => {
                const target = e.currentTarget
                target.style.height = 'auto'
                target.style.height = Math.min(target.scrollHeight, 144) + 'px'
              }}
            />

            {isStreaming ? (
              <button
                type="button"
                onClick={handleStopGenerating}
                className="flex-shrink-0 h-9 w-9 rounded-xl flex items-center justify-center bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-400 transition cursor-pointer"
                title="Stop generating"
              >
                <Square size={13} className="fill-current" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSendMessage}
                disabled={!inputValue.trim()}
                className="flex-shrink-0 h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer"
                style={{
                  background: inputValue.trim()
                    ? 'linear-gradient(135deg, #4f46e5, #06b6d4)'
                    : 'rgba(255,255,255,0.06)',
                  opacity: inputValue.trim() ? 1 : 0.4,
                  cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
                }}
                title="Send message"
              >
                <Send size={14} className="text-white" />
              </button>
            )}
          </div>
          <p className="text-center text-[10px] text-slate-500 mt-2">
            AIMF Adaptive Intelligent Memory Firewall active • Contextually secured
          </p>
        </div>
      </div>
    </div>
  )
}
