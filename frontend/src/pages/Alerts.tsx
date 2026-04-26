import { useState } from 'react'
import { Plus, Trash2, Bell, BellOff, Send } from 'lucide-react'
import clsx from 'clsx'
import { useApi } from '../hooks/useApi'
import { useAppStore } from '../store'
import Badge from '../components/shared/Badge'
import Modal from '../components/shared/Modal'
import EmptyState from '../components/shared/EmptyState'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import { format, parseISO } from 'date-fns'

const API = 'http://localhost:8000'

interface Alert {
  id: string
  alert_type: string
  asset: string | null
  condition: string | null
  threshold: number | null
  active: boolean
  telegram_notify: boolean
  browser_notify: boolean
  created_at: string
}

interface AlertHistory {
  id: string
  alert_id: string
  triggered_at: string
  value_at_trigger: number
  message: string
}

const ALERT_TYPES = [
  { value: 'price', label: 'Price Alert' },
  { value: 'funding', label: 'Funding Rate' },
  { value: 'scanner', label: 'Scanner Signal' },
  { value: 'oi_liq', label: 'OI / Liq Cluster' },
]

function AlertTypeBadge({ type }: { type: string }) {
  const map: Record<string, 'accent' | 'gain' | 'loss' | 'neutral'> = {
    price: 'accent',
    funding: 'loss',
    scanner: 'gain',
    oi_liq: 'neutral',
  }
  const labels: Record<string, string> = {
    price: 'Price',
    funding: 'Funding',
    scanner: 'Scanner',
    oi_liq: 'OI/Liq',
  }
  return <Badge variant={map[type] ?? 'neutral'}>{labels[type] ?? type}</Badge>
}

function CreateAlertModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    alert_type: 'price',
    asset: '',
    condition: 'gt',
    threshold: '',
    telegram_notify: true,
    browser_notify: true,
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await fetch(`${API}/api/alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alert_type: form.alert_type,
        asset: form.asset || null,
        condition: form.condition || null,
        threshold: form.threshold ? parseFloat(form.threshold) : null,
        telegram_notify: form.telegram_notify,
        browser_notify: form.browser_notify,
      }),
    })
    setSaving(false)
    onCreated()
    onClose()
  }

  return (
    <Modal title="Create Alert" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs text-text2 mb-1 block">Alert Type</label>
          <select className="input-base w-full" value={form.alert_type} onChange={e => setForm({ ...form, alert_type: e.target.value })}>
            {ALERT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-text2 mb-1 block">Asset (optional)</label>
            <input className="input-base w-full" placeholder="BTC, ETH..." value={form.asset} onChange={e => setForm({ ...form, asset: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-text2 mb-1 block">Condition</label>
            <select className="input-base w-full" value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })}>
              <option value="gt">Above (&gt;)</option>
              <option value="lt">Below (&lt;)</option>
              <option value="crosses">Crosses</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs text-text2 mb-1 block">Threshold</label>
          <input className="input-base w-full" type="number" step="any" placeholder="e.g. 65000 for price, 0.05 for funding %" value={form.threshold} onChange={e => setForm({ ...form, threshold: e.target.value })} />
        </div>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.telegram_notify} onChange={e => setForm({ ...form, telegram_notify: e.target.checked })} className="accent-accent" />
            <span className="text-xs text-text1">Telegram</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.browser_notify} onChange={e => setForm({ ...form, browser_notify: e.target.checked })} className="accent-accent" />
            <span className="text-xs text-text1">Browser push</span>
          </label>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button type="submit" className="btn-primary flex-1" disabled={saving}>
            {saving ? 'Creating...' : 'Create Alert'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default function Alerts() {
  const [showCreate, setShowCreate] = useState(false)

  const { data: alerts, loading, refetch } = useApi<Alert[]>(
    () => fetch(`${API}/api/alerts`).then(r => r.json()),
    { refetchInterval: 15000 }
  )
  const { data: historyData } = useApi<{ history: AlertHistory[] }>(
    () => fetch(`${API}/api/alerts/history?limit=50`).then(r => r.json()),
    { refetchInterval: 30000 }
  )

  const alertList = alerts ?? []
  const history = historyData?.history ?? []

  const handleToggle = async (id: string, current: boolean) => {
    await fetch(`${API}/api/alerts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !current }),
    })
    refetch()
  }

  const handleDelete = async (id: string) => {
    await fetch(`${API}/api/alerts/${id}`, { method: 'DELETE' })
    refetch()
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text1">Alerts</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus size={15} /> Create Alert
        </button>
      </div>

      {/* Telegram status */}
      <div className="card flex items-center gap-3 py-3">
        <Send size={14} className="text-accent flex-shrink-0" />
        <div className="text-xs">
          <span className="text-text2">Telegram: </span>
          <span className="text-text1">Set <code className="bg-muted px-1 rounded text-accent">TELEGRAM_BOT_TOKEN</code> and <code className="bg-muted px-1 rounded text-accent">TELEGRAM_CHAT_ID</code> in your <code className="bg-muted px-1 rounded text-accent">.env</code> to enable push alerts.</span>
        </div>
      </div>

      {/* Active alerts */}
      <div>
        <h2 className="text-sm font-semibold text-text1 mb-3">Active Alerts</h2>
        {loading ? (
          <LoadingSpinner fullPage />
        ) : alertList.length === 0 ? (
          <EmptyState
            title="No alerts set"
            description="Create a price alert, funding rate alert, or scanner signal alert."
            action={<button onClick={() => setShowCreate(true)} className="btn-primary"><Plus size={14} className="inline mr-1" /> Create Alert</button>}
          />
        ) : (
          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-xs text-text2 font-medium px-4 py-3">Type</th>
                  <th className="text-left text-xs text-text2 font-medium px-4 py-3">Asset</th>
                  <th className="text-left text-xs text-text2 font-medium px-4 py-3">Condition</th>
                  <th className="text-left text-xs text-text2 font-medium px-4 py-3 hidden md:table-cell">Notify</th>
                  <th className="text-center text-xs text-text2 font-medium px-4 py-3">Status</th>
                  <th className="text-right text-xs text-text2 font-medium px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {alertList.map(a => (
                  <tr key={a.id} className="border-b border-white/5 last:border-0 hover:bg-white/2 transition-colors">
                    <td className="px-4 py-3"><AlertTypeBadge type={a.alert_type} /></td>
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-text1">{a.asset ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      {a.threshold != null ? (
                        <span className="text-sm text-text2">
                          {a.condition === 'gt' ? '>' : a.condition === 'lt' ? '<' : '≈'} {a.threshold}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex gap-1.5">
                        {a.telegram_notify && <Badge variant="accent"><Send size={10} className="inline mr-1" />TG</Badge>}
                        {a.browser_notify && <Badge variant="neutral"><Bell size={10} className="inline mr-1" />Push</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggle(a.id, a.active)}
                        className={clsx(
                          'px-2 py-1 rounded text-xs font-medium transition-colors',
                          a.active ? 'bg-gain/15 text-gain' : 'bg-muted text-text2',
                        )}
                      >
                        {a.active ? 'Active' : 'Paused'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => handleToggle(a.id, a.active)} className="p-1.5 rounded text-text2 hover:text-accent hover:bg-white/5 transition-colors">
                          {a.active ? <BellOff size={14} /> : <Bell size={14} />}
                        </button>
                        <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded text-text2 hover:text-loss hover:bg-white/5 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Alert history */}
      <div>
        <h2 className="text-sm font-semibold text-text1 mb-3">Alert History</h2>
        {history.length === 0 ? (
          <EmptyState title="No alerts triggered yet" description="When alerts fire, they appear here." />
        ) : (
          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-xs text-text2 font-medium px-4 py-3">Time</th>
                  <th className="text-left text-xs text-text2 font-medium px-4 py-3">Message</th>
                  <th className="text-right text-xs text-text2 font-medium px-4 py-3">Value at Trigger</th>
                </tr>
              </thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.id} className="border-b border-white/5 last:border-0 hover:bg-white/2 transition-colors">
                    <td className="px-4 py-2.5">
                      <span className="text-xs text-text2 whitespace-nowrap">
                        {format(parseISO(h.triggered_at), 'MMM d, HH:mm')}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs text-text1">{h.message}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="text-xs font-mono text-accent">{h.value_at_trigger}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && <CreateAlertModal onClose={() => setShowCreate(false)} onCreated={refetch} />}
    </div>
  )
}
