import clsx from 'clsx'

interface BadgeProps {
  variant?: 'gain' | 'loss' | 'accent' | 'neutral'
  children: React.ReactNode
  className?: string
}

const variantClasses: Record<string, string> = {
  gain: 'bg-gain/15 text-gain border border-gain/20',
  loss: 'bg-loss/15 text-loss border border-loss/20',
  accent: 'bg-accent/15 text-accent border border-accent/20',
  neutral: 'bg-white/5 text-text2 border border-white/10',
}

export default function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
