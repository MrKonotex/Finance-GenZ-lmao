import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Globe, RefreshCw } from 'lucide-react'
import clsx from 'clsx'
import { useApi } from '../hooks/useApi'
import Card from '../components/shared/Card'
import Badge from '../components/shared/Badge'
import LoadingSpinner from '../components/shared/LoadingSpinner'

const API = 'http://localhost:8000'

type BiasDir = 'bullish' | 'bearish' | 'neutral'
type BiasTime = 'intraday' | 'swing'

function GaugeBar({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs">
        <span className="text-text2">{label}</span>
        <span className="font-semibold" style={{ color }}>{value}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

function ImportanceTag({ level }: { level: string }) {
  if (level === 'high') return <Badge variant="loss">High</Badge>
  if (level === 'medium') return <Badge variant="accent">Medium</Badge>
  return <Badge variant="neutral">Low</Badge>
}

const SECTORS = [
  { name: 'XLK (Tech)', change: 1.2 },
  { name: 'XLF (Fin)', change: -0.3 },
  { name: 'XLE (Energy)', change: 2.1 },
  { name: 'XLV (Health)', change: 0.5 },
  { name: 'XLI (Indus)', change: -0.8 },
  { name: 'XLP (Staples)', change: -0.1 },
  { name: 'XLU (Util)', change: 0.7 },
  { name: 'XLB (Matls)', change: 1.4 },
]

export default function Market() {
  const [biasDir, setBiasDir] = useState<BiasDir>('neutral')
  const [biasTime, setBiasTime] = useState<BiasTime>('intraday')
  const [biasConf, setBiasConf] = useState(50)
  const [biasNote, setBiasNote] = useState('')

  const { data: overviewData, loading, refetch } = useApi<any>(
    () => fetch(`${API}/api/market/overview`).then(r => r.json()),
    { refetchInterval: 60000 }
  )
  const { data: fgData } = useApi<any>(
    () => fetch(`${API}/api/market/fear_greed?history=1`).then(r => r.json()),
    { refetchInterval: 300000 }
  )
  const { data: calendarData } = useApi<any>(
    () => fetch(`${API}/api/market/macro_calendar`).then(r => r.json())
  )

  const fg = fgData?.data?.[0] ?? fgData
  const fgValue = parseInt(fg?.value ?? '50')
  const fgLabel = fg?.value_classification ?? 'Neutral'
  const btcDom = overviewData?.btc_dominance ?? null
  const topGainers: any[] = overviewData?.top_gainers ?? []
  const topLosers: any[] = overviewData?.top_losers ?? []
  const events: any[] = calendarData?.events ?? []

  const fgColor = fgValue >= 75 ? '#FF4B4B' : fgValue >= 55 ? '#FF8C00' : fgValue >= 45 ? '#9B9BA8' : fgValue >= 25 ? '#00C2CB' : '#00C27A'

  const handleSyncJournal = async () => {
    const today = new Date().toISOString().split('T')[0]
    await fetch(`${API}/api/journal/${today}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bias_direction: biasDir,
        bias_timeframe: biasTime,
        bias_confidence: biasConf,
        bias_note: biasNote,
      }),
    })
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text1">Market Overview</h1>
        <button onClick={refetch} className="btn-ghost flex items-center gap-2 text-xs">
          <RefreshCw size={14} className={clsx(loading && 'animate-spin')} /> Refresh
        </button>
      </div>

      {/* Daily Bias */}
      <div className="card space-y-4">
        <p className="text-xs font-semibold text-accent uppercase tracking-wider">Daily Bias</p>
        <div className="flex flex-wrap gap-3 items-center">
          {/* Direction */}
          <div className="flex gap-1">
            {(['bullish', 'bearish', 'neutral'] as BiasDir[]).map(d => (
              <button key={d} onClick={() => setBiasDir(d)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors',
                  biasDir === d
                    ? d === 'bullish' ? 'bg-gain text-base' : d === 'bearish' ? 'bg-loss text-white' : 'bg-muted text-text1 border border-accent'
                    : 'bg-muted text-text2 hover:text-text1',
                )}
              >
                {d === 'bullish' ? '↑ ' : d === 'bearish' ? '↓ ' : '→ '}{d}
              </button>
            ))}
          </div>
          {/* Timeframe */}
          <div className="flex gap-1">
            {(['intraday', 'swing'] as BiasTime[]).map(t => (
              <button key={t} onClick={() => setBiasTime(t)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors',
                  biasTime === t ? 'bg-accent text-base' : 'bg-muted text-text2 hover:text-text1',
                )}
              >
                {t}
              </button>
            ))}
          </div>
          {/* Confidence */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-text2">Confidence</span>
            <input type="range" min={0} max={100} value={biasConf} onChange={e => setBiasConf(parseInt(e.target.value))} className="w-24 accent-accent" />
            <span className="text-xs font-medium text-accent w-8">{biasConf}%</span>
          </div>
        </div>
        <div className="flex gap-2">
          <input
            className="input-base flex-1 text-xs"
            placeholder="Short bias note... (e.g. DXY breaking out, risk-off today)"
            value={biasNote}
            onChange={e => setBiasNote(e.target.value)}
          />
          <button onClick={handleSyncJournal} className="btn-primary text-xs whitespace-nowrap">
            Sync to Journal
          </button>
        </div>
      </div>

      {loading ? <LoadingSpinner fullPage /> : (
        <>
          {/* Widget grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* BTC Dominance */}
            <div className="card">
              <p className="text-xs text-text2 mb-2">BTC Dominance</p>
              <p className="text-3xl font-bold text-text1">{btcDom != null ? `${btcDom.toFixed(1)}%` : '—'}</p>
              <p className="text-xs text-text2 mt-1">of total crypto market cap</p>
            </div>

            {/* Crypto Fear & Greed */}
            <div className="card">
              <p className="text-xs text-text2 mb-2">Crypto Fear & Greed</p>
              <div className="space-y-2">
                <GaugeBar value={fgValue} label={fgLabel} color={fgColor} />
              </div>
              <p className="text-xs font-semibold mt-2" style={{ color: fgColor }}>{fgLabel}</p>
            </div>

            {/* ETH Dominance as altseason proxy */}
            <div className="card">
              <p className="text-xs text-text2 mb-2">ETH Dominance</p>
              <p className="text-3xl font-bold text-text1">
                {overviewData?.eth_dominance != null ? `${overviewData.eth_dominance.toFixed(1)}%` : '—'}
              </p>
              <p className="text-xs text-text2 mt-1">Higher = altseason nearing</p>
            </div>

            {/* Market Cap */}
            <div className="card">
              <p className="text-xs text-text2 mb-2">Total Market Cap</p>
              <p className="text-2xl font-bold text-text1">
                {overviewData?.total_market_cap_usd
                  ? `$${(overviewData.total_market_cap_usd / 1e12).toFixed(2)}T`
                  : '—'}
              </p>
              {overviewData?.market_cap_change_24h_pct != null && (
                <p className={clsx('text-xs font-medium mt-1', overviewData.market_cap_change_24h_pct >= 0 ? 'text-gain' : 'text-loss')}>
                  {overviewData.market_cap_change_24h_pct >= 0 ? '+' : ''}{overviewData.market_cap_change_24h_pct.toFixed(2)}% (24h)
                </p>
              )}
            </div>
          </div>

          {/* Sector heatmap + Macro calendar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Sector rotation */}
            <Card title="Sector Rotation (mock — replace with live ETF data)">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={SECTORS} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#9B9BA8', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                  <YAxis dataKey="name" type="category" tick={{ fill: '#9B9BA8', fontSize: 10 }} tickLine={false} axisLine={false} width={80} />
                  <Tooltip formatter={(v: any) => `${v}%`} contentStyle={{ background: '#131316', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="change" name="24h %" radius={[0, 3, 3, 0]}>
                    {SECTORS.map((s, i) => <Cell key={i} fill={s.change >= 0 ? '#00C27A' : '#FF4B4B'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Macro calendar */}
            <Card title="Macro Calendar">
              {events.length === 0 ? (
                <p className="text-sm text-text2">No upcoming events.</p>
              ) : (
                <div className="space-y-2">
                  {events.map((ev, i) => (
                    <div key={i} className="flex items-start justify-between gap-3 py-2 border-b border-white/5 last:border-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <ImportanceTag level={ev.importance} />
                          <span className="text-xs font-medium text-text1 truncate">{ev.event}</span>
                        </div>
                        <p className="text-xs text-text2">{ev.date} {ev.time_utc} UTC</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {ev.forecast && <p className="text-xs text-accent">F: {ev.forecast}</p>}
                        {ev.previous && <p className="text-xs text-text2">P: {ev.previous}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Top movers */}
          {(topGainers.length > 0 || topLosers.length > 0) && (
            <div className="grid grid-cols-2 gap-4">
              <Card title="Top Gainers (24h)">
                <div className="space-y-2">
                  {topGainers.map((c: any) => (
                    <div key={c.id} className="flex justify-between items-center">
                      <span className="text-sm font-mono font-semibold text-text1">{c.symbol?.toUpperCase()}</span>
                      <span className="text-sm font-semibold text-gain">+{c.price_change_24h_pct?.toFixed(2)}%</span>
                    </div>
                  ))}
                </div>
              </Card>
              <Card title="Top Losers (24h)">
                <div className="space-y-2">
                  {topLosers.map((c: any) => (
                    <div key={c.id} className="flex justify-between items-center">
                      <span className="text-sm font-mono font-semibold text-text1">{c.symbol?.toUpperCase()}</span>
                      <span className="text-sm font-semibold text-loss">{c.price_change_24h_pct?.toFixed(2)}%</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  )
}
