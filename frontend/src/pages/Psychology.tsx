import {
  ScatterChart, Scatter, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { Brain } from 'lucide-react'
import clsx from 'clsx'
import { useApi } from '../hooks/useApi'
import Card from '../components/shared/Card'
import EmptyState from '../components/shared/EmptyState'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import { formatCurrency } from '../lib/utils'

const API = 'http://localhost:8000'

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface border border-white/10 rounded-lg px-3 py-2 text-xs space-y-1">
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</p>
      ))}
    </div>
  )
}

const ScatterTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="bg-surface border border-white/10 rounded-lg px-3 py-2 text-xs">
      <p className="text-text2">{d?.date}</p>
      <p className="text-accent">Mood: {d?.mood}/10</p>
      <p className={d?.daily_pnl >= 0 ? 'text-gain' : 'text-loss'}>P&L: {formatCurrency(d?.daily_pnl)}</p>
    </div>
  )
}

export default function Psychology() {
  const { data: histData, loading } = useApi<any>(
    () => fetch(`${API}/api/psychology/history`).then(r => r.json())
  )
  const { data: corrData } = useApi<any>(
    () => fetch(`${API}/api/psychology/pnl_mood_correlation`).then(r => r.json())
  )
  const { data: mistakeData } = useApi<any>(
    () => fetch(`${API}/api/psychology/mistake_frequency`).then(r => r.json())
  )
  const { data: bestWorstData } = useApi<any>(
    () => fetch(`${API}/api/psychology/best_worst_days`).then(r => r.json())
  )

  const history = histData?.history ?? []
  const mistakes = mistakeData?.mistake_frequency ?? []

  // Mood quintile bucketing for win rate (simulated from scatter data)
  const moodBuckets = [
    { label: '1-2', min: 1, max: 2 },
    { label: '3-4', min: 3, max: 4 },
    { label: '5-6', min: 5, max: 6 },
    { label: '7-8', min: 7, max: 8 },
    { label: '9-10', min: 9, max: 10 },
  ].map(b => {
    const entries = history.filter((h: any) => h.mood != null && h.daily_pnl != null && h.mood >= b.min && h.mood <= b.max)
    const wins = entries.filter((e: any) => e.daily_pnl > 0)
    return {
      label: b.label,
      win_rate: entries.length > 0 ? Math.round(wins.length / entries.length * 100) : 0,
      count: entries.length,
    }
  })

  const scatterData = history.filter((h: any) => h.mood != null && h.daily_pnl != null)

  const avgMood = history.length ? (history.reduce((s: number, h: any) => s + (h.mood ?? 0), 0) / history.length).toFixed(1) : '—'
  const avgConf = history.filter((h: any) => h.confidence != null).length
    ? (history.filter((h: any) => h.confidence != null).reduce((s: number, h: any) => s + h.confidence, 0) / history.filter((h: any) => h.confidence != null).length).toFixed(1)
    : '—'
  const topMistake = mistakes[0]?.mistake ?? '—'
  const bestDayPnl = bestWorstData?.best_days?.[0]?.daily_pnl ?? null

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold text-text1">Psychology</h1>

      {loading ? (
        <LoadingSpinner fullPage />
      ) : history.length === 0 ? (
        <EmptyState
          title="No psychology data yet"
          description="Log your mood and mistakes in the Daily Journal to see patterns here."
          icon={<Brain size={22} />}
        />
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="card text-center">
              <p className="text-xs text-text2 mb-1">Avg Mood</p>
              <p className="text-3xl font-bold text-accent">{avgMood}</p>
              <p className="text-xs text-text2">/ 10</p>
            </div>
            <div className="card text-center">
              <p className="text-xs text-text2 mb-1">Avg Confidence</p>
              <p className="text-3xl font-bold text-accent">{avgConf}</p>
              <p className="text-xs text-text2">/ 10</p>
            </div>
            <div className="card text-center">
              <p className="text-xs text-text2 mb-1">Top Mistake</p>
              <p className="text-sm font-semibold text-loss mt-2 leading-tight">{topMistake}</p>
            </div>
            <div className="card text-center">
              <p className="text-xs text-text2 mb-1">Best Day P&L</p>
              <p className={clsx('text-3xl font-bold', bestDayPnl != null && bestDayPnl >= 0 ? 'text-gain' : 'text-loss')}>
                {bestDayPnl != null ? formatCurrency(bestDayPnl) : '—'}
              </p>
            </div>
          </div>

          {/* Mood-PnL correlation */}
          {corrData && (
            <div className="card">
              <p className="text-xs font-semibold text-text2 uppercase tracking-wider mb-1">Mood ↔ P&L Correlation</p>
              <div className="flex items-center gap-4">
                <span className={clsx('text-4xl font-bold tabular-nums',
                  (corrData.mood_pnl_correlation ?? 0) > 0.2 ? 'text-gain' :
                  (corrData.mood_pnl_correlation ?? 0) < -0.2 ? 'text-loss' : 'text-text2'
                )}>
                  {corrData.mood_pnl_correlation != null ? corrData.mood_pnl_correlation.toFixed(2) : '—'}
                </span>
                <div>
                  <p className="text-sm text-text1 capitalize">{corrData.interpretation}</p>
                  <p className="text-xs text-text2">Based on {corrData.sample_size} trading days</p>
                </div>
              </div>
            </div>
          )}

          {/* Scatter: P&L vs Mood */}
          <Card title="P&L vs Mood (each point = 1 trading day)">
            {scatterData.length < 3 ? (
              <EmptyState title="Not enough data" description="Need at least 3 days with mood + P&L logged." />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <ScatterChart margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="mood" name="Mood" type="number" domain={[0, 10]} tick={{ fill: '#9B9BA8', fontSize: 11 }} tickLine={false} axisLine={false} label={{ value: 'Mood (1-10)', position: 'insideBottom', offset: -2, fill: '#9B9BA8', fontSize: 11 }} />
                  <YAxis dataKey="daily_pnl" name="P&L" tick={{ fill: '#9B9BA8', fontSize: 11 }} tickLine={false} axisLine={false} width={60} tickFormatter={v => `$${v}`} />
                  <Tooltip content={<ScatterTooltip />} />
                  <Scatter data={scatterData} fill="#00C2CB" opacity={0.7} />
                </ScatterChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Mistake frequency + Win rate by mood */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title="Mistake Frequency (last 30 days)">
              {mistakes.length === 0 ? (
                <EmptyState title="No mistakes logged" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={mistakes} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#9B9BA8', fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis dataKey="mistake" type="category" tick={{ fill: '#9B9BA8', fontSize: 10 }} tickLine={false} axisLine={false} width={100} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Count" fill="#FF4B4B" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card title="Win Rate by Mood Quintile">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={moodBuckets} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#9B9BA8', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#9B9BA8', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} width={40} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="win_rate" name="Win Rate %" radius={[3, 3, 0, 0]}>
                    {moodBuckets.map((b, i) => (
                      <Cell key={i} fill={b.win_rate >= 60 ? '#00C27A' : b.win_rate >= 40 ? '#00C2CB' : '#FF4B4B'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Best vs Worst days */}
          {bestWorstData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card title="Best Trading Days — Conditions">
                {(bestWorstData.best_days ?? []).length === 0 ? <EmptyState title="No data yet" /> : (
                  <div className="space-y-2">
                    {bestWorstData.best_days.slice(0, 3).map((d: any) => (
                      <div key={d.date} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                        <div>
                          <p className="text-xs text-text2">{d.date}</p>
                          <p className="text-xs text-text1">Mood: {d.mood ?? '—'}/10 · Conf: {d.confidence ?? '—'}/10</p>
                          <p className="text-xs text-text2 capitalize">{d.bias_direction ?? 'no bias'}</p>
                        </div>
                        <p className="text-sm font-semibold text-gain">{formatCurrency(d.daily_pnl)}</p>
                      </div>
                    ))}
                    <p className="text-xs text-text2">Avg mood on best days: <strong className="text-accent">{bestWorstData.best_days_avg_mood ?? '—'}</strong></p>
                  </div>
                )}
              </Card>
              <Card title="Worst Trading Days — Conditions">
                {(bestWorstData.worst_days ?? []).length === 0 ? <EmptyState title="No data yet" /> : (
                  <div className="space-y-2">
                    {bestWorstData.worst_days.slice(0, 3).map((d: any) => (
                      <div key={d.date} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                        <div>
                          <p className="text-xs text-text2">{d.date}</p>
                          <p className="text-xs text-text1">Mood: {d.mood ?? '—'}/10 · Conf: {d.confidence ?? '—'}/10</p>
                          <p className="text-xs text-text2 capitalize">{d.bias_direction ?? 'no bias'}</p>
                        </div>
                        <p className="text-sm font-semibold text-loss">{formatCurrency(d.daily_pnl)}</p>
                      </div>
                    ))}
                    <p className="text-xs text-text2">Avg mood on worst days: <strong className="text-loss">{bestWorstData.worst_days_avg_mood ?? '—'}</strong></p>
                  </div>
                )}
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  )
}
