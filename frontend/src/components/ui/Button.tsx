import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'success'
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: React.ReactNode
  iconRight?: React.ReactNode
  fullWidth?: boolean
}

const variants: Record<ButtonVariant, string> = {
  primary:   'bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm shadow-indigo-500/20 border border-indigo-500/30',
  secondary: 'bg-white/[0.06] text-slate-200 hover:bg-white/[0.10] border border-white/[0.08] hover:border-white/[0.14]',
  ghost:     'text-slate-400 hover:text-white hover:bg-white/[0.06] border border-transparent',
  danger:    'bg-red-600/90 text-white hover:bg-red-500 border border-red-500/30 shadow-sm shadow-red-500/20',
  outline:   'border border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/10 hover:border-indigo-400/60',
  success:   'bg-emerald-600/90 text-white hover:bg-emerald-500 border border-emerald-500/30 shadow-sm shadow-emerald-500/20',
}

const sizes: Record<ButtonSize, string> = {
  xs: 'h-6 px-2.5 text-[11px] gap-1.5 rounded-lg',
  sm: 'h-8 px-3 text-xs gap-2 rounded-lg',
  md: 'h-9 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-11 px-5 text-sm gap-2.5 rounded-xl',
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      type = 'button',
      loading = false,
      icon,
      iconRight,
      fullWidth = false,
      children,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: isDisabled ? 1 : 0.97 }}
        transition={{ duration: 0.1 }}
        disabled={isDisabled}
        className={clsx(
          'inline-flex items-center justify-center font-medium transition-all duration-150 select-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0a0d14]',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          className
        )}
        {...(props as React.ComponentPropsWithoutRef<typeof motion.button>)}
      >
        {loading ? (
          <Spinner size="sm" className="text-current" />
        ) : (
          icon && <span className="flex-shrink-0">{icon}</span>
        )}
        {children && <span>{children}</span>}
        {!loading && iconRight && <span className="flex-shrink-0">{iconRight}</span>}
      </motion.button>
    )
  }
)
Button.displayName = 'Button'
export { Button }

// ─── Spinner ─────────────────────────────────────────────────────────────────

interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

const spinnerSizes = { xs: 'h-3 w-3', sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-6 w-6' }

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <svg
      className={clsx('animate-spin', spinnerSizes[size], className ?? 'text-indigo-400')}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}
