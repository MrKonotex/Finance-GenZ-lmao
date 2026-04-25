import { format, parseISO } from 'date-fns'

export function formatCurrency(n: number): string {
  const abs = Math.abs(n)
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return n < 0 ? `-$${formatted}` : `$${formatted}`
}

export function formatPct(n: number): string {
  const sign = n >= 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}

export function getRColor(r: number): string {
  if (r >= 1) return 'text-gain'
  if (r <= 0) return 'text-loss'
  return 'text-text2'
}

export function getSessionFromTime(hour: number): 'asia' | 'europe' | 'us' {
  if (hour >= 0 && hour < 8) return 'asia'
  if (hour >= 8 && hour < 14) return 'europe'
  return 'us'
}

export function calcRMultiple(
  entry: number,
  exit: number,
  stop: number,
  direction: 'long' | 'short',
): number {
  if (direction === 'long') {
    const risk = entry - stop
    if (risk === 0) return 0
    return (exit - entry) / risk
  } else {
    const risk = stop - entry
    if (risk === 0) return 0
    return (entry - exit) / risk
  }
}

export function formatDate(d: string | Date): string {
  try {
    const date = typeof d === 'string' ? parseISO(d) : d
    return format(date, 'MMM d, yyyy')
  } catch {
    return String(d)
  }
}

export function formatDateShort(d: string | Date): string {
  try {
    const date = typeof d === 'string' ? parseISO(d) : d
    return format(date, 'MMM d')
  } catch {
    return String(d)
  }
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max)
}
