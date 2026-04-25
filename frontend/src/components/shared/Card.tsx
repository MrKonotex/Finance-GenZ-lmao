import { ReactNode } from 'react'
import clsx from 'clsx'

interface CardProps {
  title?: string
  children: ReactNode
  className?: string
  actions?: ReactNode
  noPad?: boolean
}

export default function Card({ title, children, className, actions, noPad }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-surface border border-white/5 rounded-xl',
        !noPad && 'p-4',
        className,
      )}
    >
      {title && (
        <div className="flex items-center justify-between mb-3 px-4 pt-4">
          <h3 className="text-sm font-semibold text-text1 uppercase tracking-wider">{title}</h3>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {title && noPad ? <div>{children}</div> : children}
    </div>
  )
}
