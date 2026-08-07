import clsx from 'clsx'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// ─── Table ────────────────────────────────────────────────────────────────────

interface TableProps<T> {
  columns: TableColumn<T>[]
  data: T[]
  keyExtractor: (item: T) => string
  emptyMessage?: string
  isLoading?: boolean
  className?: string
  onRowClick?: (item: T) => void
}

interface TableColumn<T> {
  key: string
  header: string
  width?: string
  align?: 'left' | 'center' | 'right'
  render: (item: T) => React.ReactNode
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'No data available',
  isLoading = false,
  className,
  onRowClick,
}: TableProps<T>) {
  return (
    <div className={clsx('w-full overflow-hidden rounded-xl border border-white/[0.07]', className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.07] bg-white/[0.02]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  className={clsx(
                    'px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center',
                    col.align === 'left' && 'text-left',
                    !col.align && 'text-left'
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <div className="skeleton h-4 rounded" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-slate-600">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr
                  key={keyExtractor(item)}
                  onClick={() => onRowClick?.(item)}
                  className={clsx(
                    'transition-colors',
                    onRowClick && 'cursor-pointer hover:bg-white/[0.03]'
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={clsx(
                        'px-4 py-3 text-sm text-slate-300',
                        col.align === 'right' && 'text-right',
                        col.align === 'center' && 'text-center'
                      )}
                    >
                      {col.render(item)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

export function Pagination({ page, totalPages, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
  const visiblePages = pages.filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1
  )

  return (
    <div className={clsx('flex items-center justify-center gap-1', className)}>
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {visiblePages.map((p, i) => {
        const prevPage = visiblePages[i - 1]
        const showEllipsis = prevPage !== undefined && p - prevPage > 1
        return (
          <span key={p} className="flex items-center gap-1">
            {showEllipsis && (
              <span className="px-1 text-sm text-slate-600">…</span>
            )}
            <button
              onClick={() => onPageChange(p)}
              className={clsx(
                'flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-all',
                p === page
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                  : 'border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.06]'
              )}
            >
              {p}
            </button>
          </span>
        )
      })}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
