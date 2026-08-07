import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import clsx from 'clsx'
import { Search } from 'lucide-react'

// ─── Input ────────────────────────────────────────────────────────────────────

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: React.ReactNode
  iconRight?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, iconRight, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-slate-300">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-500">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={clsx(
              'w-full rounded-xl border bg-white/[0.04] text-sm text-white placeholder-slate-600',
              'px-3 py-2.5 transition-all duration-150',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50',
              error
                ? 'border-red-500/40 focus:ring-red-500/30 focus:border-red-500/40'
                : 'border-white/[0.08] hover:border-white/[0.14]',
              icon && 'pl-9',
              iconRight && 'pr-9',
              className
            )}
            {...props}
          />
          {iconRight && (
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-500">
              {iconRight}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        {hint && !error && <p className="text-xs text-slate-600">{hint}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

// ─── Textarea ─────────────────────────────────────────────────────────────────

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
  showCount?: boolean
  maxLength?: number
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, showCount, maxLength, className, id, value, ...props }, ref) => {
    const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    const charCount = typeof value === 'string' ? value.length : 0

    return (
      <div className="space-y-1.5">
        {label && (
          <div className="flex items-center justify-between">
            <label htmlFor={textareaId} className="block text-xs font-medium text-slate-300">
              {label}
            </label>
            {showCount && maxLength && (
              <span className={clsx('text-[11px] font-mono', charCount > maxLength * 0.9 ? 'text-amber-400' : 'text-slate-600')}>
                {charCount}/{maxLength}
              </span>
            )}
          </div>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          value={value}
          maxLength={maxLength}
          className={clsx(
            'w-full rounded-xl border bg-white/[0.04] text-sm text-white placeholder-slate-600',
            'px-3 py-2.5 transition-all duration-150 resize-none',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50',
            error
              ? 'border-red-500/40 focus:ring-red-500/30'
              : 'border-white/[0.08] hover:border-white/[0.14]',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        {hint && !error && <p className="text-xs text-slate-600">{hint}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

// ─── SearchBar ────────────────────────────────────────────────────────────────

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SearchBar({ value, onChange, placeholder = 'Search…', className }: SearchBarProps) {
  return (
    <div className={clsx('relative', className)}>
      <Search className="pointer-events-none absolute inset-y-0 left-3 my-auto h-4 w-4 text-slate-500" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={clsx(
          'w-full rounded-xl border border-white/[0.08] bg-white/[0.04] pl-9 pr-3 py-2 text-sm',
          'text-white placeholder-slate-600 transition-all',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40',
          'hover:border-white/[0.14]'
        )}
      />
    </div>
  )
}
