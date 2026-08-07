import clsx from 'clsx'

// ─── Card ─────────────────────────────────────────────────────────────────────

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  glow?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
  onClick?: () => void
}

const paddings = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6' }

export function Card({ children, className, hover = false, glow = false, padding = 'md', onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'rounded-xl border border-white/[0.07] bg-white/[0.03]',
        paddings[padding],
        hover && 'cursor-pointer transition-all duration-200 hover:border-indigo-500/25 hover:bg-white/[0.05] hover:shadow-lg hover:shadow-indigo-500/5',
        glow && 'shadow-lg shadow-indigo-500/10',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  )
}

// ─── Card Header/Body/Footer helpers ─────────────────────────────────────────

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx('flex items-center justify-between mb-4', className)}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={clsx('text-sm font-semibold text-white', className)}>{children}</h3>
}

export function CardDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={clsx('text-xs text-slate-500', className)}>{children}</p>
}
