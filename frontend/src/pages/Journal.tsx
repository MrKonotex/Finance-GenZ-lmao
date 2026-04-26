import { useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react'
import clsx from 'clsx'
import { useApi } from '../hooks/useApi'
import { formatCurrency, todayISO } from '../lib/utils'
import Card from '../components/shared/Card'
import Modal from '../components/shared/Modal'
import Badge from '../components/shared/Badge'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import EmptyState from '../components/shared/EmptyState'

// ── Types ────────────────────────────────────────────────────────────────────

interface DayData {
  pnl: number
  tradeCount: number
}

interface Trade {
  id: string
  asset: string
  direction: 'long' | 'short'
  entry: number
  exit: number
  stopLoss: number
  size: number
  pnl: number
  r: number
  pattern: string
  thesis: string
  execNotes: string
  session: 'Asia' | 'Europe' | 'US'
  followedRules: boolean
}

interface MissedSetup {
  id: string
  asset: string
  pattern: string
  notes: string
}

interface JournalDay {
  date: string
  pnl: number
  bias: 'bullish' | 'bearish' | 'neutral'
  biasType: 'intraday' | 'swing'
  confidence: number
  mood: number
  confLevel: number
  mistakes: string[]
  marketContext: string
  gamePlan: string
  trades: Trade[]
  missedSetups: MissedSetup[]
}

const MISTAKE_OPTIONS = [
  'Revenge Trade',
  'Oversized',
  'Cut Winners Early',
  'FOMO',
  'Moved Stop',
  "Didn't Follow Plan",
]

const PATTERNS = ['VWAP Reclaim', 'Liq Sweep', 'Funding Fade', 'Range Breakout']

// ── Mini Calendar ────────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

// Fake day data for display
function fakeDayData(year: number, month: number): Record<number, DayData> {
  const days = getDaysInMonth(year, month)
  const data: Record<number, DayData> = {}
  for (let d = 1; d <= days; d++) {
    if (Math.random() > 0.4) {
      const pnl = (Math.random() - 0.45) * 2000
      data[d] = { pnl, tradeCount: Math.floor(Math.random() * 5) + 1 }
    }
  }
  return data
}

// ── Add Trade Modal ──────────────────────────────────────────────────────────

interface AddTradeModalProps {
  date: string
  onClose: () => void
}

function AddTradeModal({ date, onClose }: AddTradeModalProps) {
  const [asset, setAsset] = useState('')
  const [direction, setDirection] = useState<'long' | 'short'>('long')
  const [entry, setEntry] = useState('')
  const [exit, setExit] = useState('')
  const [stopLoss, setStopLoss] = useState('')
  const [size, setSize] = useState('')
  const [pnl, setPnl] = useState('')
  const [pattern, setPattern] = useState(PATTERNS[0])
  const [thesis, setThesis] = useState('')
  const [execNotes, setExecNotes] = useState('')
  const [session, setSession] = useState<'Asia' | 'Europe' | 'US'>('US')
  const [followedRules, setFollowedRules] = useState(true)
  const [saving, setSaving] = useState(false)

  const calcR = () => {
    const e = parseFloat(entry)
    const ex = parseFloat(exit)
    const sl = parseFloat(stopLoss)
    if (!e || !ex || !sl) return null
    const risk = direction === 'long' ? e - sl : sl - e
    if (risk === 0) return null
    const reward = direction === 'long' ? ex - e : e - ex
    return (reward / risk).toFixed(2)
  }

  const rVal = calcR()

  async function handleSave() {
    setSaving(true)
    try {
      await fetch(`/api/journal/${date}/trades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset,
          direction,
          entry: parseFloat(entry),
          exit: parseFloat(exit),
          stopLoss: parseFloat(stopLoss),
          size: parseFloat(size),
          pnl: parseFloat(pnl),
          pattern,
          thesis,
          execNotes,
          session,
          followedRules,
        }),
      })
      onClose()
    } catch {
      // silently fail
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Add Trade" onClose={onClose} size="xl">
      <div className="space-y-4">
        {/* Asset + Direction */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-text2 mb-1 block">Asset</label>
            <input
              className="w-full bg-muted border border-white/5 rounded-lg px-3 py-2 text-sm text-text1 outline-none focus:border-accent/40"
              placeholder="BTC, ETH..."
              value={asset}
              onChange={(e) => setAsset(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-text2 mb-1 block">Direction</label>
            <div className="flex rounded-lg overflow-hidden border border-white/5">
              <button
                onClick={() => setDirection('long')}
                className={clsx(
                  'px-4 py-2 text-sm font-medium transition-colors',
                  direction === 'long' ? 'bg-gain/20 text-gain' : 'bg-muted text-text2',
                )}
              >
                Long
              </button>
              <button
                onClick={() => setDirection('short')}
                className={clsx(
                  'px-4 py-2 text-sm font-medium transition-colors',
                  direction === 'short' ? 'bg-loss/20 text-loss' : 'bg-muted text-text2',
                )}
              >
                Short
              </button>
            </div>
          </div>
        </div>

        {/* Price fields */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Entry Price', val: entry, set: setEntry },
            { label: 'Exit Price', val: exit, set: setExit },
            { label: 'Stop Loss', val: stopLoss, set: setStopLoss },
          ].map(({ label, val, set }) => (
            <div key={label}>
              <label className="text-xs text-text2 mb-1 block">{label}</label>
              <input
                type="number"
                className="w-full bg-muted border border-white/5 rounded-lg px-3 py-2 text-sm text-text1 outline-none focus:border-accent/40"
                placeholder="0.00"
                value={val}
                onChange={(e) => set(e.target.value)}
              />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-text2 mb-1 block">Size</label>
            <input
              type="number"
              className="w-full bg-muted border border-white/5 rounded-lg px-3 py-2 text-sm text-text1 outline-none focus:border-accent/40"
              placeholder="0"
              value={size}
              onChange={(e) => setSize(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-text2 mb-1 block">P&L</label>
            <input
              type="number"
              className="w-full bg-muted border border-white/5 rounded-lg px-3 py-2 text-sm text-text1 outline-none focus:border-accent/40"
              placeholder="0.00"
              value={pnl}
              onChange={(e) => setPnl(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-text2 mb-1 block">R-Multiple</label>
            <div className="w-full bg-muted border border-white/5 rounded-lg px-3 py-2 text-sm font-mono text-accent">
              {rVal !== null ? `${rVal}R` : '—'}
            </div>
          </div>
        </div>

        {/* Pattern + Session */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-text2 mb-1 block">Pattern</label>
            <select
              className="w-full bg-muted border border-white/5 rounded-lg px-3 py-2 text-sm text-text1 outline-none focus:border-accent/40"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
            >
              {PATTERNS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-text2 mb-1 block">Session</label>
            <div className="flex rounded-lg overflow-hidden border border-white/5">
              {(['Asia', 'Europe', 'US'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSession(s)}
                  className={clsx(
                    'flex-1 py-2 text-xs font-medium transition-colors',
                    session === s ? 'bg-accent/20 text-accent' : 'bg-muted text-text2',
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs text-text2 mb-1 block">Setup Thesis</label>
          <textarea
            className="w-full bg-muted border border-white/5 rounded-lg px-3 py-2 text-sm text-text1 outline-none focus:border-accent/40 resize-none"
            rows={2}
            placeholder="Why did you take this trade?"
            value={thesis}
            onChange={(e) => setThesis(e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs text-text2 mb-1 block">Execution Notes</label>
          <textarea
            className="w-full bg-muted border border-white/5 rounded-lg px-3 py-2 text-sm text-text1 outline-none focus:border-accent/40 resize-none"
            rows={2}
            placeholder="How did you execute? Any deviations?"
            value={execNotes}
            onChange={(e) => setExecNotes(e.target.value)}
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="accent-accent"
            checked={followedRules}
            onChange={(e) => setFollowedRules(e.target.checked)}
          />
          <span className="text-sm text-text2">Followed Rules</span>
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-text2 hover:text-text1 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-sm font-medium bg-accent hover:bg-teal-500 text-black rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Trade'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Dot Rater ────────────────────────────────────────────────────────────────

function DotRater({
  label,
  value,
  onChange,
  max = 10,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  max?: number
}) {
  return (
    <div>
      <span className="text-xs text-text2 mr-2">{label}</span>
      <span className="inline-flex gap-1">
        {Array.from({ length: max }, (_, i) => i + 1).map((i) => (
          <button
            key={i}
            onClick={() => onChange(i)}
            className={clsx(
              'w-4 h-4 rounded-full transition-colors',
              i <= value ? 'bg-accent' : 'bg-white/10',
            )}
          />
        ))}
      </span>
      <span className="ml-2 text-xs text-accent font-mono">{value}</span>
    </div>
  )
}

// ── Main Journal Page ────────────────────────────────────────────────────────

export default function Journal() {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState(todayISO())
  const [addTradeOpen, setAddTradeOpen] = useState(false)

  // Journal day state
  const [bias, setBias] = useState<'bullish' | 'bearish' | 'neutral'>('neutral')
  const [biasType, setBiasType] = useState<'intraday' | 'swing'>('intraday')
  const [confidence, setConfidence] = useState(50)
  const [mood, setMood] = useState(7)
  const [confLevel, setConfLevel] = useState(7)
  const [mistakes, setMistakes] = useState<string[]>([])
  const [marketContext, setMarketContext] = useState('')
  const [gamePlan, setGamePlan] = useState('')

  const { data: dayData, loading } = useApi<JournalDay>(
    () => fetch(`/api/journal/${selectedDate}`).then((r) => r.json()),
    {},
  )

  // Month day color data (fake for now)
  const [monthData] = useState(() => fakeDayData(viewYear, viewMonth))

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDow = getFirstDayOfWeek(viewYear, viewMonth)

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11) }
    else setViewMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0) }
    else setViewMonth((m) => m + 1)
  }

  const toggleMistake = (m: string) => {
    setMistakes((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m])
  }

  const dailyPnl = dayData?.pnl ?? 0
  const trades = dayData?.trades ?? []
  const missedSetups = dayData?.missedSetups ?? []

  const formattedDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="bg-base min-h-screen text-text1 font-sans flex">
      {/* ── Sidebar: Mini Calendar ── */}
      <aside className="w-72 shrink-0 border-r border-white/5 p-4 space-y-4">
        {/* Month nav */}
        <div className="flex items-center justify-between">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg hover:bg-white/5 text-text2 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium text-text1">
            {monthNames[viewMonth]} {viewYear}
          </span>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-white/5 text-text2 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Day-of-week labels */}
        <div className="grid grid-cols-7 gap-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} className="text-center text-xs text-text2 py-1">
              {d}
            </div>
          ))}

          {/* Empty cells for offset */}
          {Array.from({ length: firstDow }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {/* Day squares */}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const dayInfo = monthData[day]
            const isSelected = iso === selectedDate
            const isToday = iso === todayISO()

            return (
              <button
                key={day}
                onClick={() => setSelectedDate(iso)}
                className={clsx(
                  'aspect-square rounded-md text-xs flex items-center justify-center transition-all',
                  isSelected && 'ring-2 ring-accent',
                  isToday && !isSelected && 'ring-1 ring-white/20',
                  dayInfo
                    ? dayInfo.pnl > 0
                      ? 'bg-gain/25 text-gain hover:bg-gain/35'
                      : 'bg-loss/25 text-loss hover:bg-loss/35'
                    : 'bg-white/5 text-text2 hover:bg-white/10',
                )}
              >
                {day}
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs text-text2 pt-2">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-gain/25 inline-block" /> Win
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-loss/25 inline-block" /> Loss
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-white/5 inline-block" /> None
          </span>
        </div>

        {/* Monthly summary */}
        <Card className="mt-2">
          <p className="text-xs text-text2 mb-1">Month Summary</p>
          {(() => {
            const totalPnl = Object.values(monthData).reduce((a, d) => a + d.pnl, 0)
            const wins = Object.values(monthData).filter((d) => d.pnl > 0).length
            const total = Object.keys(monthData).length
            return (
              <div className="space-y-1">
                <p className={clsx('text-base font-bold', totalPnl >= 0 ? 'text-gain' : 'text-loss')}>
                  {formatCurrency(totalPnl)}
                </p>
                <p className="text-xs text-text2">
                  {wins}/{total} trading days profitable
                </p>
              </div>
            )
          })()}
        </Card>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 p-6 space-y-5 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-text1">{formattedDate}</h1>
            <p className={clsx('text-2xl font-bold mt-0.5', dailyPnl >= 0 ? 'text-gain' : 'text-loss')}>
              {formatCurrency(dailyPnl)}
            </p>
          </div>
          <button
            onClick={() => setAddTradeOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-teal-500 text-black text-sm font-medium rounded-lg transition-colors"
          >
            <Plus size={16} /> Add Trade
          </button>
        </div>

        {loading && <LoadingSpinner />}

        {/* Bias row */}
        <Card title="Session Bias">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex rounded-lg overflow-hidden border border-white/5">
              {(['bullish', 'bearish', 'neutral'] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => setBias(b)}
                  className={clsx(
                    'px-4 py-1.5 text-sm font-medium capitalize transition-colors',
                    bias === b
                      ? b === 'bullish'
                        ? 'bg-gain/20 text-gain'
                        : b === 'bearish'
                          ? 'bg-loss/20 text-loss'
                          : 'bg-accent/20 text-accent'
                      : 'bg-muted text-text2 hover:text-text1',
                  )}
                >
                  {b === 'bullish' ? <TrendingUp size={14} className="inline mr-1" /> : b === 'bearish' ? <TrendingDown size={14} className="inline mr-1" /> : <Minus size={14} className="inline mr-1" />}
                  {b}
                </button>
              ))}
            </div>

            <div className="flex rounded-lg overflow-hidden border border-white/5">
              {(['intraday', 'swing'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setBiasType(t)}
                  className={clsx(
                    'px-4 py-1.5 text-sm font-medium capitalize transition-colors',
                    biasType === t ? 'bg-accent/20 text-accent' : 'bg-muted text-text2',
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 flex-1">
              <span className="text-xs text-text2 whitespace-nowrap">Confidence</span>
              <input
                type="range"
                min={0}
                max={100}
                value={confidence}
                onChange={(e) => setConfidence(Number(e.target.value))}
                className="flex-1 accent-accent"
              />
              <span className="text-sm font-mono text-accent w-8">{confidence}</span>
            </div>
          </div>
        </Card>

        {/* Psychology row */}
        <Card title="Psychology">
          <div className="space-y-3">
            <DotRater label="Mood" value={mood} onChange={setMood} />
            <DotRater label="Confidence" value={confLevel} onChange={setConfLevel} />
            <div>
              <p className="text-xs text-text2 mb-2">Mistakes</p>
              <div className="flex flex-wrap gap-2">
                {MISTAKE_OPTIONS.map((m) => (
                  <label key={m} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-loss"
                      checked={mistakes.includes(m)}
                      onChange={() => toggleMistake(m)}
                    />
                    <span className="text-xs text-text2">{m}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Market Context */}
        <Card title="Market Context">
          <textarea
            className="w-full bg-muted border border-white/5 rounded-lg px-3 py-2 text-sm text-text1 outline-none focus:border-accent/40 resize-none"
            rows={3}
            placeholder="What was the broader market doing today? Key levels, news, macro context..."
            value={marketContext}
            onChange={(e) => setMarketContext(e.target.value)}
          />
        </Card>

        {/* Trades */}
        <Card title={`Trades (${trades.length})`}>
          {trades.length === 0 ? (
            <EmptyState
              title="No trades logged"
              description="Click 'Add Trade' to log a trade for this day."
            />
          ) : (
            <div className="space-y-2">
              {trades.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between bg-muted rounded-lg px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-text1">{t.asset}</span>
                    <Badge variant={t.direction === 'long' ? 'gain' : 'loss'}>
                      {t.direction.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-text2">{t.pattern}</span>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <span className="text-text2">
                      {t.entry} → {t.exit}
                    </span>
                    <span className={clsx('font-medium', t.pnl >= 0 ? 'text-gain' : 'text-loss')}>
                      {formatCurrency(t.pnl)}
                    </span>
                    <span className={clsx('font-mono text-xs', t.r >= 1 ? 'text-gain' : t.r < 0 ? 'text-loss' : 'text-text2')}>
                      {t.r >= 0 ? '+' : ''}{t.r.toFixed(2)}R
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Missed Setups */}
        <Card title="Missed Setups">
          {missedSetups.length === 0 ? (
            <EmptyState
              title="No missed setups"
              description="Log setups you saw but didn't take."
            />
          ) : (
            <div className="space-y-2">
              {missedSetups.map((s) => (
                <div key={s.id} className="bg-muted rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-text1">{s.asset}</span>
                    <Badge variant="neutral">{s.pattern}</Badge>
                  </div>
                  <p className="text-xs text-text2">{s.notes}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Game Plan */}
        <Card title="Tomorrow's Game Plan">
          <textarea
            className="w-full bg-muted border border-white/5 rounded-lg px-3 py-2 text-sm text-text1 outline-none focus:border-accent/40 resize-none"
            rows={4}
            placeholder="What's the plan for tomorrow? Key levels to watch, setups to look for, rules to focus on..."
            value={gamePlan}
            onChange={(e) => setGamePlan(e.target.value)}
          />
          <div className="flex justify-end mt-2">
            <button className="px-4 py-1.5 text-sm bg-accent/10 hover:bg-accent/20 text-accent rounded-lg transition-colors">
              Save Plan
            </button>
          </div>
        </Card>
      </main>

      {/* Add Trade Modal */}
      {addTradeOpen && (
        <AddTradeModal date={selectedDate} onClose={() => setAddTradeOpen(false)} />
      )}
    </div>
  )
}
