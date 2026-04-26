import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { Plus, GitBranch } from 'lucide-react'
import clsx from 'clsx'
import { useApi } from '../hooks/useApi'
import Modal from '../components/shared/Modal'
import EmptyState from '../components/shared/EmptyState'
import LoadingSpinner from '../components/shared/LoadingSpinner'

const API = 'http://localhost:8000'

interface Pair { id: string; asset_a: string; asset_b: string; lookback_days: number; notes: string | null; active: boolean }

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface border border-white/10 rounded-lg px-3 py-2 text-xs">
      <p className="text-text2 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {Number(p.value).toFixed(4)}</p>
      ))}
    </div>
  )
}

function AddPairModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState({ asset_a: '', asset_b: '', lookback_days: '60', notes: '' })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.asset_a || !form.asset_b) return
    setSaving(true)
    await fetch(`${API}/api/pairs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        asset_a: form.asset_a.toUpperCase(),
        asset_b: form.asset_b.toUpperCase(),
        lookback_days: parseInt(form.lookback_days),
        notes: form.notes || null,
      }),
    })
    setSaving(false)
    onAdded()
    onClose()
  }

  return (
    <Modal title="Add Pair" onClose={onClose} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-text2 mb-1 block">Asset A (long leg)</label>
            <input className="input-base w-full" placeholder="BTC" value={form.asset_a} onChange={e => setForm({ ...form, asset_a: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-text2 mb-1 block">Asset B (short leg)</label>
            <input className="input-base w-full" placeholder="ETH" value={form.asset_b} onChange={e => setForm({ ...form, asset_b: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="text-xs text-text2 mb-1 block">Lookback Days</label>
          <input className="input-base w-full" type="number" value={form.lookback_days} onChange={e => setForm({ ...form, lookback_days: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-text2 mb-1 block">Notes</label>
          <textarea className="input-base w-full resize-none h-16" placeholder="Trade thesis..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button type="submit" className="btn-primary flex-1" disabled={saving || !form.asset_a || !form.asset_b}>
            {saving ? 'Adding...' : 'Add Pair'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function ZScoreDisplay({ value }: { value: number | null }) {
  if (value == null) return <span className="text-text2">—</span>
  const color = value > 2 ? 'text-loss' : value < -2 ? 'text-gain' : value > 1.5 || value < -1.5 ? 'text-accent' : 'text-text1'
  const signal = value > 2 ? 'Stretched High — potential short/fade'
    : value < -2 ? 'Stretched Low — potential long/fade'
    : value > 1.5 ? 'Elevated — watch for reversal'
    : value < -1.5 ? 'Depressed — watch for reversal'
    : 'Near mean — no edge'
  return (
    <div className="card text-center py-6">
      <p className="text-xs text-text2 uppercase tracking-wider mb-1">Z-Score</p>
      <p className={clsx('text-5xl font-bold tabular-nums', color)}>
        {value > 0 ? '+' : ''}{value.toFixed(2)}
      </p>
      <p className="text-xs text-text2 mt-2">{signal}</p>
    </div>
  )
}

export default function PairTracker() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  const { data: pairs, loading, refetch } = useApi<Pair[]>(
    () => fetch(`${API}/api/pairs`).then(r => r.json())
  )

  const { data: spreadData, loading: loadingSpread } = useApi<any>(
    () => selectedId ? fetch(`${API}/api/pairs/${selectedId}/spread`).then(r => r.json()) : Promise.resolve(null),
    { enabled: !!selectedId }
  )

  const { data: corrData, loading: loadingCorr } = useApi<any>(
    () => selectedId ? fetch(`${API}/api/pairs/${selectedId}/correlation`).then(r => r.json()) : Promise.resolve(null),
    { enabled: !!selectedId }
  )

  const pairList = pairs ?? []
  const spread = spreadData?.spread ?? []
  const mean = spreadData?.mean_ratio
  const std = spreadData?.std_ratio
  const zScore = spreadData?.current_z_score ?? null

  const selectedPair = pairList.find(p => p.id === selectedId)

  const handleDelete = async (id: string) => {
    await fetch(`${API}/api/pairs/${id}`, { method: 'DELETE' })
    if (selectedId === id) setSelectedId(null)
    refetch()
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text1">Pair Trading Tracker</h1>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus size={15} /> Add Pair
        </button>
      </div>

      {loading ? (
        <LoadingSpinner fullPage />
      ) : pairList.length === 0 ? (
        <EmptyState
          title="No pairs configured"
          description="Add a pair to track spread, correlation, and z-score signals."
          icon={<GitBranch size={22} />}
          action={<button onClick={() => setShowAdd(true)} className="btn-primary">Add First Pair</button>}
        />
      ) : (
        <div className="flex gap-5">
          {/* Pair selector */}
          <div className="w-56 flex-shrink-0 space-y-1">
            {pairList.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={clsx(
                  'w-full text-left p-3 rounded-lg transition-colors border text-sm',
                  selectedId === p.id
                    ? 'bg-surface border-accent/30 border-l-2 border-l-accent'
                    : 'bg-surface border-white/5 hover:border-white/10',
                )}
              >
                <span className="font-semibold text-text1">{p.asset_a}</span>
                <span className="text-text2 mx-1">/</span>
                <span className="font-semibold text-text1">{p.asset_b}</span>
                <p className="text-xs text-text2 mt-0.5">{p.lookback_days}d lookback</p>
              </button>
            ))}
          </div>

          {/* Detail */}
          {!selectedId ? (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState title="Select a pair" description="Click a pair to view its spread and correlation." />
            </div>
          ) : (
            <div className="flex-1 space-y-4">
              {/* Pair header */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-text1">
                  {selectedPair?.asset_a} / {selectedPair?.asset_b}
                </h2>
                <button onClick={() => handleDelete(selectedId)} className="btn-ghost text-loss text-xs">Remove Pair</button>
              </div>

              {/* Z-Score + Correlation stats */}
              <div className="grid grid-cols-3 gap-4">
                <ZScoreDisplay value={zScore} />
                <div className="card text-center py-6">
                  <p className="text-xs text-text2 uppercase tracking-wider mb-1">Correlation</p>
                  <p className={clsx('text-5xl font-bold tabular-nums', (corrData?.correlation ?? 0) > 0.7 ? 'text-gain' : 'text-loss')}>
                    {corrData?.correlation != null ? corrData.correlation.toFixed(2) : '—'}
                  </p>
                  <p className="text-xs text-text2 mt-2">{corrData?.data_points ?? 0} days</p>
                </div>
                <div className="card text-center py-6">
                  <p className="text-xs text-text2 uppercase tracking-wider mb-1">Mean Ratio</p>
                  <p className="text-3xl font-bold tabular-nums text-text1">
                    {mean != null ? mean.toFixed(4) : '—'}
                  </p>
                  {std != null && <p className="text-xs text-text2 mt-2">±{std.toFixed(4)} σ</p>}
                </div>
              </div>

              {/* Spread chart */}
              {loadingSpread ? (
                <LoadingSpinner fullPage />
              ) : spread.length > 0 ? (
                <div className="card">
                  <p className="text-xs font-semibold text-text2 uppercase tracking-wider mb-3">Spread Ratio — {selectedPair?.asset_a}/{selectedPair?.asset_b}</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={spread} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="open_time" tick={{ fill: '#9B9BA8', fontSize: 10 }} tickLine={false} axisLine={false}
                        tickFormatter={v => v ? new Date(v).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : ''} />
                      <YAxis tick={{ fill: '#9B9BA8', fontSize: 11 }} tickLine={false} axisLine={false} width={55} tickFormatter={v => v.toFixed(3)} />
                      <Tooltip content={<CustomTooltip />} />
                      {mean != null && <ReferenceLine y={mean} stroke="#9B9BA8" strokeDasharray="4 4" label={{ value: 'Mean', fill: '#9B9BA8', fontSize: 10 }} />}
                      {mean != null && std != null && <>
                        <ReferenceLine y={mean + 2 * std} stroke="#FF4B4B" strokeDasharray="3 3" opacity={0.6} />
                        <ReferenceLine y={mean - 2 * std} stroke="#00C27A" strokeDasharray="3 3" opacity={0.6} />
                        <ReferenceLine y={mean + std} stroke="#FF4B4B" strokeDasharray="2 2" opacity={0.3} />
                        <ReferenceLine y={mean - std} stroke="#00C27A" strokeDasharray="2 2" opacity={0.3} />
                      </>}
                      <Line type="monotone" dataKey="ratio" name="Ratio" stroke="#00C2CB" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState title="No spread data" description="Could not fetch price history from Binance for this pair." />
              )}

              {/* Notes */}
              {selectedPair?.notes && (
                <div className="card">
                  <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Notes</p>
                  <p className="text-sm text-text1">{selectedPair.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showAdd && <AddPairModal onClose={() => setShowAdd(false)} onAdded={refetch} />}
    </div>
  )
}
