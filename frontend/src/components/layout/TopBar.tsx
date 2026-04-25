import { useState } from 'react'
import { Bell, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { useAppStore } from '../../store'
import Modal from '../shared/Modal'

interface TradeModalProps {
  onClose: () => void
}

function QuickAddTradeModal({ onClose }: TradeModalProps) {
  const [form, setForm] = useState({
    asset: '',
    direction: 'long' as 'long' | 'short',
    entry: '',
    exit: '',
    stop: '',
    size: '',
    notes: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // In a real app, this would call createTrade from api.ts
    onClose()
  }

  return (
    <Modal title="Quick Add Trade" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-text2 mb-1 block">Asset</label>
            <input
              className="input-base w-full"
              placeholder="BTC, ETH..."
              value={form.asset}
              onChange={(e) => setForm({ ...form, asset: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-text2 mb-1 block">Direction</label>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setForm({ ...form, direction: 'long' })}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  form.direction === 'long'
                    ? 'bg-gain text-[#0A0A0C]'
                    : 'bg-muted text-text2 hover:text-text1'
                }`}
              >
                Long
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, direction: 'short' })}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  form.direction === 'short'
                    ? 'bg-loss text-white'
                    : 'bg-muted text-text2 hover:text-text1'
                }`}
              >
                Short
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-text2 mb-1 block">Entry Price</label>
            <input
              className="input-base w-full"
              type="number"
              step="any"
              placeholder="0.00"
              value={form.entry}
              onChange={(e) => setForm({ ...form, entry: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-text2 mb-1 block">Exit Price</label>
            <input
              className="input-base w-full"
              type="number"
              step="any"
              placeholder="0.00"
              value={form.exit}
              onChange={(e) => setForm({ ...form, exit: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-text2 mb-1 block">Stop Loss</label>
            <input
              className="input-base w-full"
              type="number"
              step="any"
              placeholder="0.00"
              value={form.stop}
              onChange={(e) => setForm({ ...form, stop: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-text2 mb-1 block">Size (USD)</label>
          <input
            className="input-base w-full"
            type="number"
            step="any"
            placeholder="1000"
            value={form.size}
            onChange={(e) => setForm({ ...form, size: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs text-text2 mb-1 block">Notes</label>
          <textarea
            className="input-base w-full resize-none h-20"
            placeholder="Setup thesis, execution notes..."
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">
            Cancel
          </button>
          <button type="submit" className="btn-primary flex-1">
            Log Trade
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default function TopBar() {
  const alertCount = useAppStore((s) => s.alertCount)
  const [showModal, setShowModal] = useState(false)
  const today = new Date()

  return (
    <>
      <header className="h-[52px] border-b border-white/5 flex items-center justify-between px-5 flex-shrink-0 bg-surface/80 backdrop-blur-sm sticky top-0 z-30">
        {/* Date */}
        <span className="text-sm text-text2">
          {format(today, 'EEEE, MMMM d')}
        </span>

        {/* Center-right: Quick Add */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={15} />
            Quick Add Trade
          </button>

          {/* Bell */}
          <button className="relative p-2 rounded-lg hover:bg-white/5 transition-colors text-text2 hover:text-text1">
            <Bell size={18} />
            {alertCount > 0 && (
              <span className="absolute top-1 right-1 bg-accent text-[#0A0A0C] text-[10px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-0.5">
                {alertCount > 99 ? '99+' : alertCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {showModal && <QuickAddTradeModal onClose={() => setShowModal(false)} />}
    </>
  )
}
