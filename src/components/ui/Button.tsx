import React from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'accent'
type Size = 'sm' | 'md' | 'lg'

export default function Button({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
}) {
  const sizes: Record<Size, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  }

  const variants: Record<Variant, string> = {
    primary:
      'bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200',
    secondary:
      'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800',
    danger:
      'bg-red-600 text-white hover:bg-red-700',
    ghost:
      'bg-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
    /* Usa el color del rol (CSS var desde RoleClassEffect + global.css) */
    accent:
      'text-[var(--role-accent-contrast)] bg-[var(--role-accent)] hover:brightness-110',
  }

  return (
    <button
      className={[
        'rounded-lg font-medium transition-colors',
        sizes[size],
        variants[variant],
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </button>
  )
}
