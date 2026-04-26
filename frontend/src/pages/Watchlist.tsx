import { useState } from 'react'
import { Plus, Trash2, ExternalLink, BookOpen, TrendingUp } from 'lucide-react'
import clsx from 'clsx'
import { useApi } from '../hooks/useApi'
import { useAppStore } from '../store'
import { formatCurrency } from '../lib/utils'
import Badge from '../components/shared/Badge'
import Modal from '../components/shared/Modal'
import EmptyState from '../components/shared/EmptyState'
import LoadingSpinner from '../components/shared/LoadingSpinner'

const API = 'http://localhost:8000'

interface WatchlistItem {
  id: string
  asset: string
  asset_type: string
  key_levels: any[]
  notes: string | null
  priority: number
  created_at: string
}

function AddItemModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState({
    asset: '',
    asset_type: 'crypto',
    notes: '',
    key_levels_text: '',
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.asset.trim()) return
    setSaving(true)
    const levels = form.key_levels_text
      .split(',')
      .map(l => l.trim())
      .filter(Boolean)
      .map(l => ({ level: parseFloat(l), type: 'level' }))
    await fetch(`${API}/api/watchlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        asset: form.asset.toUpperCase().trim(),
        asset_type: form.asset_type,
        notes: form.notes || null,
        key_levels: levels.length > 0 ? levels : null,
      }),
    })
    setSaving(false)
    onAdded()
    onClose()
  }

  return (
    <Modal title="Add to Watchlist" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-text2 mb-1 block">Asset</label>
            <input
              className="input-base w-full"
              placeholder="BTC, ETH, AAPL..."
              value={form.asset}
              onChange={e => setForm({ ...form, asset: e.target.value })}
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs text-text2 mb-1 block">Type</label>
            <select
              className="input-base w-full"
              value={form.asset_type}
              onChange={e => setForm({ ...form, asset_type: e.target.value })}
            >
              <option value="crypto">Crypto</option>
              <option value="equity">Equity</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs text-text2 mb-1 block">Key Levels (comma-separated prices)</label>
          <input
            className="input-base w-full"
            placeholder="64000, 62500, 60000"
            value={form.key_levels_text}
            onChange={e => setForm({ ...form, key_levels_text: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs text-text2 mb-1 block">Notes / Thesis</label>
          <textarea
            className="input-base w-full resize-none h-20"
            placeholder="Why is this on your watchlist? What setup are you waiting for?"
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
          />
        </div>
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button type="submit" className="btn-primary flex-1" disabled={saving || !form.asset.trim()}>
            {saving ? 'Adding...' : 'Add to Watchlist'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default function Watchlist() {
  const [showAdd, setShowAdd] = useState(false)
  const prices = useAppStore(s => s.prices)

  const { data, loading, refetch } = useApi<WatchlistItem[]>(
    () => fetch(`${API}/api/watchlist`).then(r => r.json()),
    { refetchInterval: 10000 }
  )

  const items = data ?? []

  const handleDelete = async (id: string) => {
    await fetch(`${API}/api/watchlist/${id}`, { method: 'DELETE' })
    refetch()
  }

  const getPrice = (asset: string): number | null => {
    return prices[asset.toUpperCase()] ?? prices[asset] ?? null
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text1">Watchlist</h1>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus size={15} /> Add Asset
        </button>
      </div>

      {loading ? (
        <LoadingSpinner fullPage />
      ) : items.length === 0 ? (
        <EmptyState
          title="Your watchlist is empty"
          description="Add assets you're monitoring and get ready to trade."
          action={
            <button onClick={() => setShowAdd(true)} className="btn-primary">
              <Plus size={14} className="inline mr-1" /> Add First Asset
            </button>
          }
        />
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-xs text-text2 font-medium px-4 py-3">Asset</th>
                <th className="text-right text-xs text-text2 font-medium px-4 py-3">Price</th>
                <th className="text-right text-xs text-text2 font-medium px-4 py-3 hidden md:table-cell">Type</th>
                <th className="text-left text-xs text-text2 font-medium px-4 py-3 hidden lg:table-cell">Key Levels</th>
                <th className="text-left text-xs text-text2 font-medium px-4 py-3 hidden xl:table-cell">Notes</th>
                <th className="text-right text-xs text-text2 font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const price = getPrice(item.asset)
                const levels = Array.isArray(item.key_levels) ? item.key_levels : []

                return (
                  <tr
                    key={item.id}
                    className={clsx(
                      'border-b border-white/5 last:border-0 hover:bg-white/2 transition-colors',
                      i % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.01]',
                    )}
                  >
                    <td className="px-4 py-3">
                      <span className="font-semibold text-text1">{item.asset}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {price != null ? (
                        <span className="font-mono text-text1">${price.toLocaleString()}</span>
                      ) : (
                        <span className="text-text2">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">
                      <Badge variant={item.asset_type === 'crypto' ? 'accent' : 'neutral'}>
                        {item.asset_type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {levels.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {levels.slice(0, 3).map((l: any, i: number) => (
                            <span key={i} className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono text-text2">
                              {typeof l === 'object' ? l.level : l}
                            </span>
                          ))}
                          {levels.length > 3 && (
                            <span className="text-xs text-text2">+{levels.length - 3}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-text2">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell max-w-[200px]">
                      {item.notes ? (
                        <span className="text-xs text-text2 truncate block">{item.notes}</span>
                      ) : (
                        <span className="text-text2">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={`https://www.tradingview.com/chart/?symbol=${item.asset}USDT`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-md text-text2 hover:text-accent hover:bg-white/5 transition-colors"
                          title="Open chart"
                        >
                          <ExternalLink size={14} />
                        </a>
                        <a
                          href={`/journal`}
                          className="p-1.5 rounded-md text-text2 hover:text-gain hover:bg-white/5 transition-colors"
                          title="Log trade"
                        >
                          <BookOpen size={14} />
                        </a>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 rounded-md text-text2 hover:text-loss hover:bg-white/5 transition-colors"
                          title="Remove"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <AddItemModal
          onClose={() => setShowAdd(false)}
          onAdded={refetch}
        />
      )}
    </div>
  )
}
