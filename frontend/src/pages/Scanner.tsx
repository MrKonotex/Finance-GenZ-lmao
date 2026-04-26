import { useState } from 'react'
import { RefreshCw, Plus, BookOpen, TrendingUp, Zap, GitBranch, Flame } from 'lucide-react'
import clsx from 'clsx'
import { useApi } from '../hooks/useApi'
import Badge from '../components/shared/Badge'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import EmptyState from '../components/shared/EmptyState'

const API = 'http://localhost:8000'

type SignalType = 'all' | 'breakout' | 'funding_extreme' | 'pair_divergence'

const SIGNAL_COLORS: Record<string, string> = {
  funding_extreme: 'accent',
  breakout: 'gain',
  pair_divergence: 'neutral',
  custom: 'neutral',
}

const SIGNAL_ICONS: Record<string, React.ElementType> = {
  funding_extreme: Flame,
  breakout: TrendingUp,
  pair_divergence: GitBranch,
  custom: Zap,
}

function StrengthDots({ value = 3 }: { value?: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={clsx(
            'w-1.5 h-1.5 rounded-full',
            i < value ? 'bg-accent' : 'bg-white/10',
          )}
        />
      ))}
    </div>
  )
}

function SignalCard({ signal, onAddToWatchlist, onLogTrade }: {
  signal: any
  onAddToWatchlist: (asset: string) => void
  onLogTrade: (asset: string) => void
}) {
  const Icon = SIGNAL_ICONS[signal.signal_type] ?? Zap
  const colorVariant = (SIGNAL_COLORS[signal.signal_type] ?? 'neutral') as any
  const frPct = signal.funding_rate_pct ?? (signal.funding_rate ? (signal.funding_rate * 100).toFixed(4) : null)

  const strength = signal.signal_type === 'funding_extreme'
    ? Math.min(5, Math.ceil(Math.abs(signal.funding_rate ?? 0) / 0.0001))
    : signal.z_score
    ? Math.min(5, Math.ceil(Math.abs(signal.z_score)))
    : 3

  return (
    <div className="card flex flex-col gap-3 hover:border-white/10 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-lg font-semibold text-text1">{signal.asset}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={colorVariant as any}>
              <Icon size={11} className="mr-1 inline" />
              {signal.signal_type.replace(/_/g, ' ')}
            </Badge>
            <StrengthDots value={strength} />
          </div>
        </div>
        {signal.current_price && (
          <p className="text-sm font-mono text-text1">
            ${Number(signal.current_price).toLocaleString()}
          </p>
        )}
      </div>

      {/* Data row */}
      <div className="space-y-1">
        {frPct && (
          <div className="flex justify-between text-xs">
            <span className="text-text2">Funding rate</span>
            <span className={clsx('font-mono', parseFloat(frPct) > 0 ? 'text-loss' : 'text-gain')}>
              {parseFloat(frPct) > 0 ? '+' : ''}{frPct}%
            </span>
          </div>
        )}
        {signal.z_score !== undefined && (
          <div className="flex justify-between text-xs">
            <span className="text-text2">Z-Score</span>
            <span className={clsx('font-mono', signal.z_score > 0 ? 'text-loss' : 'text-gain')}>
              {signal.z_score > 0 ? '+' : ''}{signal.z_score}
            </span>
          </div>
        )}
        {signal.breakout_pct !== undefined && (
          <div className="flex justify-between text-xs">
            <span className="text-text2">Breakout %</span>
            <span className={clsx('font-mono', signal.direction === 'bullish' ? 'text-gain' : 'text-loss')}>
              {signal.direction === 'bullish' ? '+' : ''}{signal.breakout_pct}%
            </span>
          </div>
        )}
        {signal.note && (
          <p className="text-xs text-text2 pt-1 border-t border-white/5">{signal.note}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onAddToWatchlist(signal.asset)}
          className="btn-ghost flex-1 flex items-center justify-center gap-1 text-xs py-1.5"
        >
          <Plus size={12} /> Watchlist
        </button>
        <button
          onClick={() => onLogTrade(signal.asset)}
          className="btn-primary flex-1 flex items-center justify-center gap-1 text-xs py-1.5"
        >
          <BookOpen size={12} /> Log Trade
        </button>
      </div>
    </div>
  )
}

export default function Scanner() {
  const [filter, setFilter] = useState<SignalType>('all')
  const [lastRefreshed, setLastRefreshed] = useState(new Date())

  const { data: fundingSignals, loading: loadingFunding, refetch: refetchFunding } = useApi<any>(
    () => fetch(`${API}/api/scanner/funding_extremes`).then(r => r.json()),
    { refetchInterval: 60000 }
  )
  const { data: breakoutSignals, loading: loadingBreakout, refetch: refetchBreakout } = useApi<any>(
    () => fetch(`${API}/api/scanner/breakouts`).then(r => r.json()),
    { refetchInterval: 60000 }
  )
  const { data: pairSignals, loading: loadingPairs, refetch: refetchPairs } = useApi<any>(
    () => fetch(`${API}/api/scanner/pair_divergence`).then(r => r.json()),
    { refetchInterval: 60000 }
  )

  const handleRefresh = () => {
    refetchFunding()
    refetchBreakout()
    refetchPairs()
    setLastRefreshed(new Date())
  }

  const allSignals = [
    ...(fundingSignals?.signals ?? []),
    ...(breakoutSignals?.signals ?? []),
    ...(pairSignals?.signals ?? []),
  ]

  const filtered = filter === 'all'
    ? allSignals
    : allSignals.filter(s => s.signal_type === filter || s.signal_type.includes(filter.replace('_', '')))

  const loading = loadingFunding || loadingBreakout || loadingPairs

  const FILTERS: { key: SignalType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'breakout', label: 'Breakout' },
    { key: 'funding_extreme', label: 'Funding Extreme' },
    { key: 'pair_divergence', label: 'Pair Divergence' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text1">Setup Scanner</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text2">
            Updated {lastRefreshed.toLocaleTimeString()}
          </span>
          <button
            onClick={handleRefresh}
            className="btn-ghost flex items-center gap-2 text-xs"
            disabled={loading}
          >
            <RefreshCw size={14} className={clsx(loading && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={clsx(
              'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              filter === f.key
                ? 'bg-surface text-accent shadow-sm'
                : 'text-text2 hover:text-text1',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* TradingView webhook status */}
      <div className="card flex items-center gap-3 py-3">
        <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
        <span className="text-xs text-text2">
          TradingView webhook active at{' '}
          <code className="text-accent bg-muted px-1.5 py-0.5 rounded text-[11px]">
            POST http://localhost:8000/api/scanner/webhook
          </code>
        </span>
      </div>

      {/* Signal cards */}
      {loading ? (
        <LoadingSpinner fullPage />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No signals detected"
          description="The scanner will populate as market conditions develop. Add pairs to the Pair Tracker to enable pair divergence signals."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((signal, i) => (
            <SignalCard
              key={`${signal.asset}-${signal.signal_type}-${i}`}
              signal={signal}
              onAddToWatchlist={(asset) => {
                fetch(`${API}/api/watchlist`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ asset, asset_type: 'crypto' }),
                })
              }}
              onLogTrade={(asset) => {
                window.location.href = `/journal?prefill=${asset}`
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
