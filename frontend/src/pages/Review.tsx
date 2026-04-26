import { useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { format, startOfWeek, addWeeks, subWeeks, addMonths, subMonths, getISOWeek, getYear } from 'date-fns'
import { useApi } from '../hooks/useApi'
import Card from '../components/shared/Card'
import EmptyState from '../components/shared/EmptyState'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import { formatCurrency } from '../lib/utils'

const API = 'http://localhost:8000'

type Tab = 'weekly' | 'monthly'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface border border-white/10 rounded-lg px-3 py-2 text-xs">
      <p className="text-text2 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: ${Number(p.value).toFixed(2)}</p>
      ))}
    </div>
  )
}

function ReflectionBox({ label, placeholder, value, onChange }: {
  label: string; placeholder: string; value: string; onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-accent uppercase tracking-wider mb-1 block">{label}</label>
      <textarea
        className="input-base w-full resize-none h-24"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  )
}

export default function Review() {
  const [tab, setTab] = useState<Tab>('weekly')
  const [weekRef, setWeekRef] = useState(new Date())
  const [monthRef, setMonthRef] = useState(new Date())

  const [weekReflection, setWeekReflection] = useState({ worked: '', didnt: '', violations: '', notes: '' })
  const [monthReflection, setMonthReflection] = useState({ lessons: '', focus: '', pnl_goal: '', dd_limit: '', rule_target: '' })

  const weekStr = `${getYear(startOfWeek(weekRef, { weekStartsOn: 1 }))}-W${String(getISOWeek(weekRef)).padStart(2, '0')}`
  const monthStr = format(monthRef, 'yyyy-MM')

  const { data: weekData, loading: loadingWeek } = useApi<any>(
    () => fetch(`${API}/api/reviews/weekly?week=${weekStr}`).then(r => r.json()),
    { enabled: tab === 'weekly' }
  )
  const { data: monthData, loading: loadingMonth } = useApi<any>(
    () => fetch(`${API}/api/reviews/monthly?month=${monthStr}`).then(r => r.json()),
    { enabled: tab === 'monthly' }
  )

  const loading = tab === 'weekly' ? loadingWeek : loadingMonth
  const data = tab === 'weekly' ? weekData : monthData

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text1">Review</h1>
        <div className="flex gap-1 bg-muted p-1 rounded-lg">
          {(['weekly', 'monthly'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={clsx(
                'px-4 py-1.5 rounded-md text-xs font-medium transition-colors capitalize',
                tab === t ? 'bg-surface text-accent shadow-sm' : 'text-text2 hover:text-text1',
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Period navigator */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => tab === 'weekly' ? setWeekRef(subWeeks(weekRef, 1)) : setMonthRef(subMonths(monthRef, 1))}
          className="btn-ghost p-2"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-medium text-text1 min-w-[160px] text-center">
          {tab === 'weekly'
            ? `Week of ${format(startOfWeek(weekRef, { weekStartsOn: 1 }), 'MMM d, yyyy')}`
            : format(monthRef, 'MMMM yyyy')}
        </span>
        <button
          onClick={() => tab === 'weekly' ? setWeekRef(addWeeks(weekRef, 1)) : setMonthRef(addMonths(monthRef, 1))}
          className="btn-ghost p-2"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {loading ? (
        <LoadingSpinner fullPage />
      ) : !data || data.total_trades === 0 ? (
        <EmptyState title={`No trades for this ${tab === 'weekly' ? 'week' : 'month'}`} description="Log trades in the journal to see your review here." />
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { label: 'Total P&L', value: formatCurrency(data.total_pnl ?? 0), color: (data.total_pnl ?? 0) >= 0 ? 'text-gain' : 'text-loss' },
              { label: 'Win Rate', value: `${data.win_rate ?? 0}%`, color: 'text-accent' },
              { label: 'Avg R', value: `${data.avg_r ?? 0}R`, color: 'text-accent' },
              { label: 'Total Trades', value: String(data.total_trades ?? 0), color: 'text-text1' },
              { label: 'Trading Days', value: String(data.trading_days ?? 0), color: 'text-text1' },
            ].map(s => (
              <div key={s.label} className="card text-center">
                <p className="text-xs text-text2">{s.label}</p>
                <p className={clsx('text-2xl font-bold mt-1', s.color)}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Pattern breakdown */}
          {(data.top_mistakes?.length > 0 || true) && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="card">
                <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-2">Best Day</p>
                <p className={clsx('text-2xl font-bold', (data.best_day_pnl ?? 0) >= 0 ? 'text-gain' : 'text-loss')}>
                  {data.best_day_pnl != null ? formatCurrency(data.best_day_pnl) : '—'}
                </p>
              </div>
              <div className="card">
                <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-2">Worst Day</p>
                <p className={clsx('text-2xl font-bold', (data.worst_day_pnl ?? 0) >= 0 ? 'text-gain' : 'text-loss')}>
                  {data.worst_day_pnl != null ? formatCurrency(data.worst_day_pnl) : '—'}
                </p>
              </div>
              <div className="card">
                <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-2">Avg Daily P&L</p>
                <p className={clsx('text-2xl font-bold', (data.avg_daily_pnl ?? 0) >= 0 ? 'text-gain' : 'text-loss')}>
                  {data.avg_daily_pnl != null ? formatCurrency(data.avg_daily_pnl) : '—'}
                </p>
              </div>
            </div>
          )}

          {/* Top mistakes */}
          {data.top_mistakes?.length > 0 && (
            <Card title="Most Common Mistakes This Period">
              <div className="flex gap-2 flex-wrap">
                {data.top_mistakes.slice(0, 5).map(([mistake, count]: [string, number]) => (
                  <span key={mistake} className="flex items-center gap-1.5 bg-loss/10 text-loss px-3 py-1.5 rounded-lg text-xs">
                    {mistake} <strong className="font-bold">{count}×</strong>
                  </span>
                ))}
              </div>
            </Card>
          )}

          {/* Reflection prompts */}
          <div className="card space-y-4">
            <p className="text-sm font-semibold text-text1">
              {tab === 'weekly' ? 'Weekly Reflection' : 'Monthly Reflection'}
            </p>
            {tab === 'weekly' ? (
              <>
                <ReflectionBox label="What worked?" placeholder="Setups, execution, patterns that were profitable..." value={weekReflection.worked} onChange={v => setWeekReflection(r => ({ ...r, worked: v }))} />
                <ReflectionBox label="What didn't work?" placeholder="Mistakes, missed setups, bad timing..." value={weekReflection.didnt} onChange={v => setWeekReflection(r => ({ ...r, didnt: v }))} />
                <ReflectionBox label="Rule violations" placeholder="Which rules did you break? How many times?" value={weekReflection.violations} onChange={v => setWeekReflection(r => ({ ...r, violations: v }))} />
                <ReflectionBox label="Free notes" placeholder="Anything else about this week..." value={weekReflection.notes} onChange={v => setWeekReflection(r => ({ ...r, notes: v }))} />
              </>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-text2 mb-1 block">P&L Goal ($)</label>
                    <input className="input-base w-full" type="number" placeholder="5000" value={monthReflection.pnl_goal} onChange={e => setMonthReflection(r => ({ ...r, pnl_goal: e.target.value }))} />
                    {monthReflection.pnl_goal && <p className={clsx('text-xs mt-1', (data.total_pnl ?? 0) >= parseFloat(monthReflection.pnl_goal) ? 'text-gain' : 'text-loss')}>
                      Actual: {formatCurrency(data.total_pnl ?? 0)}
                    </p>}
                  </div>
                  <div>
                    <label className="text-xs text-text2 mb-1 block">Max DD Limit ($)</label>
                    <input className="input-base w-full" type="number" placeholder="1000" value={monthReflection.dd_limit} onChange={e => setMonthReflection(r => ({ ...r, dd_limit: e.target.value }))} />
                    {monthReflection.dd_limit && <p className={clsx('text-xs mt-1', (data.max_drawdown ?? 0) <= parseFloat(monthReflection.dd_limit) ? 'text-gain' : 'text-loss')}>
                      Actual DD: {formatCurrency(data.max_drawdown ?? 0)}
                    </p>}
                  </div>
                  <div>
                    <label className="text-xs text-text2 mb-1 block">Rule Adherence Target (%)</label>
                    <input className="input-base w-full" type="number" placeholder="80" value={monthReflection.rule_target} onChange={e => setMonthReflection(r => ({ ...r, rule_target: e.target.value }))} />
                  </div>
                </div>
                <ReflectionBox label="Key Lessons" placeholder="What are the most important things you learned this month?" value={monthReflection.lessons} onChange={v => setMonthReflection(r => ({ ...r, lessons: v }))} />
                <ReflectionBox label="Focus for Next Month" placeholder="What patterns to focus on? What mistakes to eliminate?" value={monthReflection.focus} onChange={v => setMonthReflection(r => ({ ...r, focus: v }))} />
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
