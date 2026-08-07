import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Database, LayoutGrid, List, SlidersHorizontal } from 'lucide-react'
import {
  SearchBar, Select, Button,
  EmptySearchState, EmptyState, ErrorState, Pagination, SkeletonCard,
} from '@/components/ui'
import { useMemories } from '@/hooks/useAIMF'
import MemoryCard   from './MemoryCard'
import MemoryRow    from './MemoryRow'
import MemoryDetail from './MemoryDetail'
import type { Memory } from '@/types'

type View = 'grid' | 'list'

const DECISION_OPTIONS = [
  { value: '',               label: 'All Decisions'   },
  { value: 'STORE',          label: 'Store'           },
  { value: 'STORE_ENCRYPTED',label: 'Encrypted'       },
  { value: 'LONG_TERM',      label: 'Long-term'       },
  { value: 'SUMMARIZE',      label: 'Summarise'       },
  { value: 'FORGET',         label: 'Forget'          },
  { value: 'REJECT_PRIVACY', label: 'Rejected'        },
]
const SENSITIVITY_OPTIONS = [
  { value: '',         label: 'All Sensitivities' },
  { value: 'none',     label: 'None'              },
  { value: 'low',      label: 'Low'               },
  { value: 'medium',   label: 'Medium'            },
  { value: 'high',     label: 'High'              },
  { value: 'critical', label: 'Critical'          },
]
const STATUS_OPTIONS = [
  { value: '',          label: 'All Statuses' },
  { value: 'active',    label: 'Active'       },
  { value: 'forgotten', label: 'Forgotten'    },
  { value: 'expired',   label: 'Expired'      },
  { value: 'archived',  label: 'Archived'     },
]
const PAGE_SIZE = 6

export default function MemoryVaultPage() {
  const [search,      setSearch]      = useState('')
  const [decision,    setDecision]    = useState('')
  const [sensitivity, setSensitivity] = useState('')
  const [status,      setStatus]      = useState('')
  const [page,        setPage]        = useState(1)
  const [view,        setView]        = useState<View>('grid')
  const [selected,    setSelected]    = useState<Memory | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // Reset to page 1 whenever filters change
  const handleSearch      = (v: string) => { setSearch(v);      setPage(1) }
  const handleDecision    = (v: string) => { setDecision(v);    setPage(1) }
  const handleSensitivity = (v: string) => { setSensitivity(v); setPage(1) }
  const handleStatus      = (v: string) => { setStatus(v);      setPage(1) }

  const hasActiveFilters = !!(decision || sensitivity || status)

  const { data, isLoading, isError, refetch } = useMemories({
    page, pageSize: PAGE_SIZE, search, decision, sensitivity, status,
  })

  const memories    = data?.items ?? []
  const totalPages  = data ? Math.ceil(data.total / PAGE_SIZE) : 1
  const totalCount  = data?.total ?? 0

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-500/20">
            <Database className="h-4.5 w-4.5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Memory Vault</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isLoading ? 'Loading…' : `${totalCount} memories`}
              {(search || hasActiveFilters) && ' — filtered'}
            </p>
          </div>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
          {(['grid', 'list'] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all ${
                view === v ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-white'
              }`}
            >
              {v === 'grid' ? <LayoutGrid className="h-3.5 w-3.5" /> : <List className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>
      </div>

      {/* ── Search + Filters ────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <SearchBar
            value={search}
            onChange={handleSearch}
            placeholder="Search memory content…"
            className="flex-1"
          />
          <Button
            variant={showFilters || hasActiveFilters ? 'outline' : 'secondary'}
            size="md"
            icon={<SlidersHorizontal className="h-4 w-4" />}
            onClick={() => setShowFilters((s) => !s)}
          >
            Filters
            {hasActiveFilters && (
              <span className="ml-1 h-4 w-4 rounded-full bg-indigo-500 text-[9px] font-bold text-white flex items-center justify-center">
                {[decision, sensitivity, status].filter(Boolean).length}
              </span>
            )}
          </Button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 pt-1">
                <Select options={DECISION_OPTIONS}    value={decision}    onChange={handleDecision}    label="Decision" />
                <Select options={SENSITIVITY_OPTIONS} value={sensitivity} onChange={handleSensitivity} label="Sensitivity" />
                <Select options={STATUS_OPTIONS}      value={status}      onChange={handleStatus}      label="Status" />
              </div>
              {hasActiveFilters && (
                <button
                  onClick={() => { setDecision(''); setSensitivity(''); setStatus(''); setPage(1) }}
                  className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
                >
                  Clear filters
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Content ─────────────────────────────────────────────────── */}
      {isError ? (
        <ErrorState onRetry={refetch} />
      ) : isLoading ? (
        <LoadingSkeleton view={view} />
      ) : memories.length === 0 ? (
        search ? (
          <EmptySearchState query={search} onClear={() => handleSearch('')} />
        ) : (
          <EmptyState
            icon={<Database className="h-7 w-7" />}
            title="No memories found"
            description="No memories match the current filters."
            action={{ label: 'Clear filters', onClick: () => { setDecision(''); setSensitivity(''); setStatus('') } }}
          />
        )
      ) : view === 'grid' ? (
        <GridView memories={memories} onSelect={setSelected} />
      ) : (
        <ListView memories={memories} onSelect={setSelected} />
      )}

      {/* ── Pagination ────────────────────────────────────────────────── */}
      {!isLoading && totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      {/* ── Detail Modal ─────────────────────────────────────────────── */}
      <MemoryDetail memory={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

// ─── View components ──────────────────────────────────────────────────────────

function GridView({ memories, onSelect }: { memories: Memory[]; onSelect: (m: Memory) => void }) {
  return (
    <motion.div
      layout
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <AnimatePresence mode="popLayout">
        {memories.map((m, i) => (
          <motion.div
            key={m.id}
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25, delay: i * 0.04 }}
          >
            <MemoryCard memory={m} onClick={() => onSelect(m)} />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  )
}

function ListView({ memories, onSelect }: { memories: Memory[]; onSelect: (m: Memory) => void }) {
  return (
    <div className="rounded-xl border border-white/[0.07] overflow-hidden divide-y divide-white/[0.05]">
      {memories.map((m, i) => (
        <motion.div
          key={m.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.04 }}
        >
          <MemoryRow memory={m} onClick={() => onSelect(m)} />
        </motion.div>
      ))}
    </div>
  )
}

function LoadingSkeleton({ view }: { view: View }) {
  if (view === 'grid') {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-16 rounded-xl skeleton" />
      ))}
    </div>
  )
}
