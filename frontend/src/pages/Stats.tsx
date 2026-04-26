import { useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { TrendingUp, TrendingDown, Activity, Target, Zap, AlertTriangle } from 'lucide-react'
import clsx from 'clsx'
import { useApi } from '../hooks/useApi'
import { formatCurrency, formatPct } from '../lib/utils'
import Card from '../components/shared/Card'
import Badge from '../components/shared/Badge'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import EmptyState from '../components/shared/EmptyState'

const API = 'http://localhost:8000'

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string; icon: React.ElementType; color: string
}) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xs text-text2">{label}</p>
        <p className="text-xl font-semibold text-text1">{value}</p>
        {sub && <p className="text-xs text-text2">{sub}</p>}
      </div>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface border border-white/10 rounded-lg px-3 py-2 text-xs">
      <p className="text-text2 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {p.value >= 0 ? '+' : ''}{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
        </p>
      ))}
    </div>
  )
}

export default function Stats() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const buildParams = () => {
    const p = new URLSearchParams()
    if (dateFrom) p.set('from', dateFrom)
    if (dateTo) p.set('to', dateTo)
    return p.toString() ? '?' + p.toString() : ''
  }

  const { data: summary, loading: loadingSummary } = useApi<any>(
    () => fetch(`${API}/api/stats/summary${buildParams()}`).then(r => r.json())
  )
  const { data: equity } = useApi<any>(
    () => fetch(`${API}/api/stats/equity_curve${buildParams()}`).then(r => r.json())
  )
  const { data: byPattern } = useApi<any>(
    () => fetch(`${API}/api/stats/by_pattern`).then(r => r.json())
  )
  const { data: rDist } = useApi<any>(
    () => fetch(`${API}/api/stats/r_distribution`).then(r => r.json())
  )
  const { data: byDow } = useApi<any>(
    () => fetch(`${API}/api/stats/by_day_of_week`).then(r => r.json())
  )
  const { data: byHour } = useApi<any>(
    () => fetch(`${API}/api/stats/by_hour`).then(r => r.json())
  )
  const { data: streaks } = useApi<any>(
    () => fetch(`${API}/api/stats/streaks`).then(r => r.json())
  )
  const { data: hallOfFame } = useApi<any>(
    () => fetch(`${API}/api/stats/hall_of_fame`).then(r => r.json())
  )

  const equityCurve = equity?.equity_curve ?? []
  const patterns = byPattern?.by_pattern ?? []
  const rBuckets = rDist?.r_distribution ?? []
  const dowData = byDow?.by_day_of_week ?? []
  const hourData = byHour?.by_hour ?? []

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text1">Trade Stats</h1>
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="input-base text-xs"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
          />
          <span className="text-text2 text-xs">to</span>
          <input
            type="date"
            className="input-base text-xs"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
          />
        </div>
      </div>

      {/* Stat cards */}
      {loadingSummary ? (
        <LoadingSpinner fullPage />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <StatCard
            label="Total P&L"
            value={formatCurrency(summary?.total_pnl ?? 0)}
            icon={TrendingUp}
            color={(summary?.total_pnl ?? 0) >= 0 ? 'bg-gain/15 text-gain' : 'bg-loss/15 text-loss'}
          />
          <StatCard
            label="Win Rate"
            value={`${summary?.win_rate ?? 0}%`}
            sub={`${summary?.total_trades ?? 0} trades`}
            icon={Target}
            color="bg-accent/15 text-accent"
          />
          <StatCard
            label="Avg R"
            value={`${summary?.avg_r ?? 0}R`}
            icon={Activity}
            color="bg-accent/15 text-accent"
          />
          <StatCard
            label="Total Trades"
            value={String(summary?.total_trades ?? 0)}
            icon={Zap}
            color="bg-white/5 text-text2"
          />
          <StatCard
            label="Current Streak"
            value={`${streaks?.current_streak_type === 'win' ? '+' : streaks?.current_streak_type === 'loss' ? '-' : ''}${streaks?.current_streak ?? 0}`}
            sub={streaks?.current_streak_type ?? 'neutral'}
            icon={streaks?.current_streak_type === 'loss' ? TrendingDown : TrendingUp}
            color={streaks?.current_streak_type === 'win' ? 'bg-gain/15 text-gain' : streaks?.current_streak_type === 'loss' ? 'bg-loss/15 text-loss' : 'bg-white/5 text-text2'}
          />
          <StatCard
            label="Max Drawdown"
            value={formatCurrency(summary?.max_drawdown ?? 0)}
            icon={AlertTriangle}
            color="bg-loss/15 text-loss"
          />
        </div>
      )}

      {/* Equity Curve */}
      <Card title="Equity Curve">
        {equityCurve.length === 0 ? (
          <EmptyState title="No trade data yet" description="Log your first trades to see your equity curve." />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={equityCurve} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00C2CB" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#00C2CB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tick={{ fill: '#9B9BA8', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#9B9BA8', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} width={60} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="cumulative_pnl" name="Cumulative P&L" stroke="#00C2CB" fill="url(#equityGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* R Distribution + Pattern WR */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="R-Multiple Distribution">
          {rBuckets.length === 0 ? (
            <EmptyState title="No R data" description="Log trades with stop losses to see R distribution." />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={rBuckets} margin={{ top: 5, right: 5, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#9B9BA8', fontSize: 10 }} tickLine={false} axisLine={false} angle={-30} textAnchor="end" />
                <YAxis tick={{ fill: '#9B9BA8', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Trades" radius={[3, 3, 0, 0]}>
                  {rBuckets.map((b: any, i: number) => (
                    <Cell key={i} fill={b.label.startsWith('-') || b.label.startsWith('<') ? '#FF4B4B' : '#00C27A'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Win Rate by Pattern">
          {patterns.length === 0 ? (
            <EmptyState title="No pattern data" description="Tag trades with patterns to see breakdown." />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={patterns} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: '#9B9BA8', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                <YAxis dataKey="pattern_name" type="category" tick={{ fill: '#9B9BA8', fontSize: 11 }} tickLine={false} axisLine={false} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="win_rate" name="Win Rate %" fill="#00C2CB" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* P&L by DoW + Hour */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="P&L by Day of Week">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dowData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#9B9BA8', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={d => d.slice(0, 3)} />
              <YAxis tick={{ fill: '#9B9BA8', fontSize: 11 }} tickLine={false} axisLine={false} width={50} tickFormatter={v => `$${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="avg_pnl" name="Avg P&L" radius={[3, 3, 0, 0]}>
                {dowData.map((d: any, i: number) => (
                  <Cell key={i} fill={d.avg_pnl >= 0 ? '#00C27A' : '#FF4B4B'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="P&L by Hour (UTC)">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={hourData.filter((h: any) => h.total_trades > 0)} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="hour" tick={{ fill: '#9B9BA8', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={h => `${h}h`} />
              <YAxis tick={{ fill: '#9B9BA8', fontSize: 11 }} tickLine={false} axisLine={false} width={50} tickFormatter={v => `$${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="total_pnl" name="Total P&L" radius={[3, 3, 0, 0]}>
                {hourData.filter((h: any) => h.total_trades > 0).map((h: any, i: number) => (
                  <Cell key={i} fill={h.total_pnl >= 0 ? '#00C27A' : '#FF4B4B'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Hall of Fame */}
      {hallOfFame && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="🏆 Best Trades">
            {(hallOfFame.best_trades ?? []).length === 0 ? (
              <EmptyState title="No trades yet" />
            ) : (
              <div className="space-y-2">
                {hallOfFame.best_trades.map((t: any, i: number) => (
                  <div key={t.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text2 w-5">#{i + 1}</span>
                      <span className="text-sm font-medium text-text1">{t.asset}</span>
                      <Badge variant={t.direction === 'long' ? 'gain' : 'loss'}>{t.direction}</Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gain">{formatCurrency(t.pnl)}</p>
                      {t.r_multiple && <p className="text-xs text-text2">{t.r_multiple.toFixed(2)}R</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="💀 Worst Trades">
            {(hallOfFame.worst_trades ?? []).length === 0 ? (
              <EmptyState title="No trades yet" />
            ) : (
              <div className="space-y-2">
                {hallOfFame.worst_trades.map((t: any, i: number) => (
                  <div key={t.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text2 w-5">#{i + 1}</span>
                      <span className="text-sm font-medium text-text1">{t.asset}</span>
                      <Badge variant={t.direction === 'long' ? 'gain' : 'loss'}>{t.direction}</Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-loss">{formatCurrency(t.pnl)}</p>
                      {t.r_multiple && <p className="text-xs text-text2">{t.r_multiple.toFixed(2)}R</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
