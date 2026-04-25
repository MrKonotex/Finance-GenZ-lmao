import { ReactNode } from 'react'
import { Inbox } from 'lucide-react'
import clsx from 'clsx'

interface EmptyStateProps {
  title?: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
  className?: string
}

export default function EmptyState({
  title = 'Nothing here yet',
  description = 'Add your first entry to get started.',
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center gap-3 py-14 text-center',
        className,
      )}
    >
      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-text2">
        {icon ?? <Inbox size={22} />}
      </div>
      <div>
        <p className="text-sm font-medium text-text1">{title}</p>
        {description && <p className="text-xs text-text2 mt-1 max-w-xs">{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
