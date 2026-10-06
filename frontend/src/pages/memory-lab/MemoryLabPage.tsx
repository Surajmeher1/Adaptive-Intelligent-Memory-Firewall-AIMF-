import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FlaskConical, Zap, RotateCcw, Copy, Check } from 'lucide-react'
import toast from 'react-hot-toast'

import { analyzeMemoryContent as mockAnalyze } from '@/mock/services'
import { analyzeMemoryContent as realAnalyze } from '@/services/api'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui'
import PipelineVisualizer from './PipelineVisualizer'
import AnalysisResult     from './AnalysisResult'
import SamplePrompts      from './SamplePrompts'

const MAX_CHARS = 1000

export default function MemoryLabPage() {
  const [input, setInput]     = useState('')
  const [copied, setCopied]   = useState(false)
  const resultRef = useRef<HTMLDivElement>(null)
  const isAuth    = useAuthStore((s) => s.isAuthenticated)
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: isAuth ? realAnalyze : mockAnalyze,
    onSuccess: (data) => {
      // Invalidate memory vault & dashboard caches so new memories appear immediately
      queryClient.invalidateQueries({ queryKey: ['memories'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })

      const dec = data.memory.decision
      if (dec === 'REJECT_PRIVACY') {
        toast.error('Privacy violation detected: Memory rejected and NOT persisted.', { duration: 4000 })
      } else if (dec === 'FORGET') {
        toast('Low relevance score: Memory rejected and NOT persisted.', { icon: '🚫', duration: 3500 })
      } else if (dec === 'STORE_ENCRYPTED') {
        toast.success('Memory approved & securely encrypted in Vault!', { duration: 3500 })
      } else {
        toast.success(`Memory analyzed & routed (${dec})`, { duration: 3000 })
      }

      // Scroll to result
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300)
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Analysis failed. Please try again.'),
  })

  const handleAnalyze = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    const trimmed = input.trim()
    if (!trimmed) { toast.error('Please enter some text to analyse.'); return }
    if (trimmed.length < 5) { toast.error('Input is too short. Enter at least 5 characters.'); return }
    mutation.mutate(trimmed)
  }

  const handleReset = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setInput('')
    mutation.reset()
  }

  const handleCopy = () => {
    if (mutation.data?.memory.explanation) {
      navigator.clipboard.writeText(mutation.data.memory.explanation)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleAnalyze()
    }
  }

  const charPct = (input.length / MAX_CHARS) * 100
  const isProcessing = mutation.isPending

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">

      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/30 to-cyan-400/20 border border-indigo-500/25">
          <FlaskConical className="h-5 w-5 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Memory Lab</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Submit any text through the AIMF pipeline to see how it's classified, scored, and routed.
          </p>
        </div>
      </div>

      {/* ── Main Input Card ───────────────────────────────────────────── */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Input Memory Content</h3>
          {!mutation.data && (
            <span className="text-[11px] text-slate-600 font-mono">
              {input.length}/{MAX_CHARS}
            </span>
          )}
        </div>

        {/* Textarea */}
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
            onKeyDown={handleKeyDown}
            placeholder="Enter any text — a preference, a fact, personal data, or a temporal statement…&#10;&#10;Examples:&#10;• My credit card number is 4532 XXXX XXXX 1234&#10;• I prefer Python over JavaScript for backend projects&#10;• Meeting tomorrow at 3pm with the design team"
            disabled={isProcessing}
            rows={7}
            className="w-full rounded-xl border border-white/[0.08] bg-[#0a0d14] px-4 py-3 text-sm text-white placeholder-slate-600 resize-none transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 hover:border-white/[0.14] disabled:opacity-60 disabled:cursor-not-allowed leading-relaxed font-mono"
          />

          {/* Character warning bar */}
          <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl overflow-hidden">
            <motion.div
              className={
                charPct > 90 ? 'h-full bg-red-500' :
                charPct > 70 ? 'h-full bg-amber-400' : 'h-full bg-indigo-500'
              }
              animate={{ width: `${charPct}%` }}
              transition={{ duration: 0.2 }}
            />
          </div>
        </div>

        {/* Sample prompts */}
        {!input && !mutation.data && (
          <SamplePrompts onSelect={setInput} />
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="md"
            icon={<Zap className="h-4 w-4" />}
            onClick={handleAnalyze}
            loading={isProcessing}
            disabled={!input.trim() || isProcessing}
            className="min-w-[140px]"
          >
            {isProcessing ? 'Analysing…' : 'Run Analysis'}
          </Button>

          {(input || mutation.data) && (
            <Button
              variant="ghost"
              size="md"
              icon={<RotateCcw className="h-3.5 w-3.5" />}
              onClick={handleReset}
              disabled={isProcessing}
            >
              Reset
            </Button>
          )}

          {mutation.data && (
            <Button
              variant="ghost"
              size="md"
              icon={copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              onClick={handleCopy}
              className="ml-auto"
            >
              {copied ? 'Copied!' : 'Copy Explanation'}
            </Button>
          )}
        </div>
      </div>

      {/* ── Pipeline + Results ────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {isProcessing && (
          <motion.div
            key="pipeline"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            <PipelineVisualizer />
          </motion.div>
        )}

        {mutation.data && !isProcessing && (
          <motion.div
            key="result"
            ref={resultRef}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <AnalysisResult result={mutation.data} />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
