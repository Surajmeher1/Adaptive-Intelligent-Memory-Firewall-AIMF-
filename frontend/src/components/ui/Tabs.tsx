import clsx from 'clsx'

// ─── Tabs ─────────────────────────────────────────────────────────────────────

interface Tab {
  id: string
  label: string
  icon?: React.ReactNode
  count?: number
}

interface TabsProps {
  tabs: Tab[]
  activeTab: string
  onChange: (id: string) => void
  variant?: 'line' | 'pill'
  className?: string
}

export function Tabs({ tabs, activeTab, onChange, variant = 'line', className }: TabsProps) {
  if (variant === 'pill') {
    return (
      <div className={clsx('flex gap-1 rounded-xl bg-white/[0.04] border border-white/[0.07] p-1', className)}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={clsx(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150',
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span className={clsx(
                'rounded-full px-1.5 py-0.5 text-[10px] font-mono',
                activeTab === tab.id ? 'bg-indigo-500/40 text-indigo-100' : 'bg-white/[0.08] text-slate-500'
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    )
  }

  // Line variant
  return (
    <div className={clsx('flex border-b border-white/[0.07]', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={clsx(
            'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-150 border-b-2 -mb-px',
            activeTab === tab.id
              ? 'border-indigo-400 text-white'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          )}
        >
          {tab.icon}
          {tab.label}
          {tab.count !== undefined && (
            <span className={clsx(
              'rounded-full px-1.5 text-[10px]',
              activeTab === tab.id ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white/[0.06] text-slate-600'
            )}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

// ─── Toggle (Switch) ──────────────────────────────────────────────────────────

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  description?: string
  disabled?: boolean
  size?: 'sm' | 'md'
}

export function Toggle({ checked, onChange, label, description, disabled = false, size = 'md' }: ToggleProps) {
  const trackSize = size === 'sm' ? 'h-4 w-7' : 'h-5 w-9'
  const thumbSize = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'
  const thumbTranslate = size === 'sm' ? 'translate-x-3.5' : 'translate-x-4'

  return (
    <label className={clsx('flex items-start gap-3', disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer')}>
      <div className="flex-shrink-0 mt-0.5">
        <div
          role="switch"
          aria-checked={checked}
          onClick={() => !disabled && onChange(!checked)}
          className={clsx(
            'relative inline-flex items-center rounded-full transition-colors duration-200',
            trackSize,
            checked ? 'bg-indigo-500' : 'bg-white/[0.12]'
          )}
        >
          <span className={clsx(
            'absolute left-0.5 inline-block rounded-full bg-white shadow-sm transition-transform duration-200',
            thumbSize,
            checked ? thumbTranslate : 'translate-x-0.5'
          )} />
        </div>
      </div>
      {(label || description) && (
        <div>
          {label && <p className="text-sm font-medium text-white">{label}</p>}
          {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
        </div>
      )}
    </label>
  )
}

// ─── Select ────────────────────────────────────────────────────────────────────

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  className?: string
}

export function Select({ options, value, onChange, label, placeholder, className }: SelectProps) {
  return (
    <div className={clsx('space-y-1.5', className)}>
      {label && <label className="block text-xs font-medium text-slate-300">{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={clsx(
          'w-full rounded-xl border border-white/[0.08] bg-[#0f1219] px-3 py-2.5 text-sm text-white',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40',
          'hover:border-white/[0.14] transition-all cursor-pointer'
        )}
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[#0f1219]">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
