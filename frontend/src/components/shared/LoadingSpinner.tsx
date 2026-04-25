import clsx from 'clsx'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  fullPage?: boolean
}

const sizeMap = {
  sm: 'w-4 h-4 border-2',
  md: 'w-7 h-7 border-2',
  lg: 'w-10 h-10 border-[3px]',
}

export default function LoadingSpinner({ size = 'md', className, fullPage }: LoadingSpinnerProps) {
  const spinner = (
    <div
      className={clsx(
        'rounded-full border-transparent border-t-accent animate-spin',
        sizeMap[size],
        className,
      )}
    />
  )

  if (fullPage) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">{spinner}</div>
    )
  }

  return spinner
}
