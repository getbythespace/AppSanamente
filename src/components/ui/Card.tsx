import React from 'react'

type Props = {
  children: React.ReactNode
  className?: string
  variant?: 'glass' | 'solid'
  onClick?: () => void
}

export default function Card({ children, className = '', variant = 'glass', onClick }: Props) {
  const Comp: any = onClick ? 'button' : 'div'
  const base =
    variant === 'glass'
      ? 'border border-white/10 bg-white/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]'
      : 'border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'

  return (
    <Comp
      onClick={onClick}
      className={[
        'rounded-2xl shadow-xl transition-shadow duration-200',
        onClick ? 'cursor-pointer hover:shadow-2xl active:scale-[0.99]' : '',
        base,
        className,
      ].join(' ')}
    >
      {children}
    </Comp>
  )
}
