import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { RefreshCw, Flame } from 'lucide-react'
import clsx from 'clsx'
import { useApi } from '../hooks/useApi'
import Badge from '../components/shared/Badge'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import EmptyState from '../components/shared/EmptyState'

const API = 'http://localhost:8000'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface border border-white/10 rounded-lg px-3 py-2 text-xs">
      <p className="text-text2 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {(p.value * 100).toFixed(4)}%</p>
      ))}
    </div>
  )
}

function FundingBadge({ rate }: { rate: number }) {
  if (Math.abs(rate) < 0.0001) return <Badge variant="neutral">~0%</Badge>
  const pct = (rate * 100).toFixed(4)
  if (rate > 0.0005) return <Badge variant="loss">+{pct}% 🔥</Badge>
  if (rate > 0) return <Badge variant="neutral">+{pct}%</Badge>
  if (rate < -0.0003) return <Badge variant="gain">{pct}% ❄️</Badge>
  return <Badge variant="neutral">{pct}%</Badge>
}

export default function Funding() {
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null)

  const { data: ratesData, loading, refetch } = useApi<any>(
    () => fetch(`${API}/api/funding/rates`).then(r => r.json()),
    { refetchInterval: 30000 }
  )

  const { data: historyData, loading: loadingHistory } = useApi<any>(
    () => selectedAsset
      ? fetch(`${API}/api/funding/history/${selectedAsset}`).then(r => r.json())
      : Promise.resolve(null),
    { enabled: !!selectedAsset }
  )

  const rates: any[] = ratesData?.rates ?? []
  const history: any[] = historyData?.history ?? []

  // Find top extremes
  const topPositive = [...rates].sort((a, b) => (b.funding_rate ?? 0) - (a.funding_rate ?? 0)).slice(0, 3).map(r => r.asset)
  const topNegative = [...rates].sort((a, b) => (a.funding_rate ?? 0) - (b.funding_rate ?? 0)).slice(0, 3).map(r => r.asset)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text1">Funding / On-chain</h1>
        <button onClick={refetch} className="btn-ghost flex items-center gap-2 text-xs">
          <RefreshCw size={14} className={clsx(loading && 'animate-spin')} /> Refresh
        </button>
      </div>

      {/* Extremes callout */}
      {rates.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="card border-loss/20">
            <p className="text-xs font-semibold text-loss uppercase tracking-wider flex items-center gap-1 mb-2">
              <Flame size={12} /> Extreme Longs — High Funding
            </p>
            <div className="flex gap-2 flex-wrap">
              {topPositive.map(a => (
                <button key={a} onClick={() => setSelectedAsset(a)}
                  className="text-xs bg-loss/10 text-loss px-2 py-1 rounded hover:bg-loss/20 transition-colors font-mono">
                  {a}
                </button>
              ))}
            </div>
            <p className="text-xs text-text2 mt-2">Longs paying premium → potential short fade</p>
          </div>
          <div className="card border-gain/20">
            <p className="text-xs font-semibold text-gain uppercase tracking-wider flex items-center gap-1 mb-2">
              ❄️ Extreme Shorts — Negative Funding
            </p>
            <div className="flex gap-2 flex-wrap">
              {topNegative.map(a => (
                <button key={a} onClick={() => setSelectedAsset(a)}
                  className="text-xs bg-gain/10 text-gain px-2 py-1 rounded hover:bg-gain/20 transition-colors font-mono">
                  {a}
                </button>
              ))}
            </div>
            <p className="text-xs text-text2 mt-2">Shorts paying premium → potential long fade</p>
          </div>
        </div>
      )}

      <div className="flex gap-5">
        {/* Left — rates table */}
        <div className="flex-1 min-w-0 card overflow-hidden p-0">
          {loading ? (
            <LoadingSpinner fullPage />
          ) : rates.length === 0 ? (
            <EmptyState title="No funding data" description="Could not connect to Hyperliquid API." />
          ) : (
            <div className="overflow-y-auto max-h-[500px]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface z-10">
                  <tr className="border-b border-white/5">
                    <th className="text-left text-xs text-text2 font-medium px-4 py-3">Asset</th>
                    <th className="text-right text-xs text-text2 font-medium px-4 py-3">Funding Rate</th>
                    <th className="text-right text-xs text-text2 font-medium px-4 py-3 hidden md:table-cell">Mark Price</th>
                    <th className="text-right text-xs text-text2 font-medium px-4 py-3 hidden lg:table-cell">Open Interest</th>
                  </tr>
                </thead>
                <tbody>
                  {rates.map((r: any) => (
                    <tr
                      key={r.asset}
                      onClick={() => setSelectedAsset(r.asset)}
                      className={clsx(
                        'border-b border-white/5 last:border-0 cursor-pointer transition-colors',
                        selectedAsset === r.asset ? 'bg-accent/5' : 'hover:bg-white/2',
                      )}
                    >
                      <td className="px-4 py-2.5">
                        <span className="font-mono font-semibold text-text1">{r.asset}</span>
                        {topPositive.includes(r.asset) && <span className="ml-2 text-[10px] text-loss">HIGH</span>}
                        {topNegative.includes(r.asset) && <span className="ml-2 text-[10px] text-gain">LOW</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <FundingBadge rate={r.funding_rate ?? 0} />
                      </td>
                      <td className="px-4 py-2.5 text-right hidden md:table-cell">
                        <span className="text-text2 font-mono text-xs">
                          {r.mark_price ? `$${Number(r.mark_price).toLocaleString()}` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right hidden lg:table-cell">
                        <span className="text-text2 font-mono text-xs">
                          {r.open_interest ? `$${(Number(r.open_interest) / 1e6).toFixed(1)}M` : '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right — history chart */}
        <div className="w-80 flex-shrink-0 space-y-3">
          {!selectedAsset ? (
            <div className="card flex items-center justify-center h-64 text-center">
              <p className="text-sm text-text2">Click an asset to see funding history</p>
            </div>
          ) : (
            <div className="card">
              <p className="text-sm font-semibold text-text1 mb-3">
                {selectedAsset} — Funding History
              </p>
              {loadingHistory ? (
                <LoadingSpinner fullPage />
              ) : history.length === 0 ? (
                <EmptyState title="No history" />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={history.slice(-50)} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="time"
                      tick={{ fill: '#9B9BA8', fontSize: 10 }}
                      tickLine={false} axisLine={false}
                      tickFormatter={v => v ? new Date(v).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : ''}
                    />
                    <YAxis tick={{ fill: '#9B9BA8', fontSize: 10 }} tickLine={false} axisLine={false} width={55}
                      tickFormatter={v => `${(v * 100).toFixed(3)}%`} />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
                    <ReferenceLine y={0.0005} stroke="#FF4B4B" strokeDasharray="3 3" opacity={0.5} />
                    <ReferenceLine y={-0.0003} stroke="#00C27A" strokeDasharray="3 3" opacity={0.5} />
                    <Line type="monotone" dataKey="funding_rate" name="Funding" stroke="#00C2CB" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
              <p className="text-xs text-text2 mt-2">
                Red dashed: +0.05% extreme | Green dashed: -0.03% extreme
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
