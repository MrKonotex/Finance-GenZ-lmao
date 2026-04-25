const API = 'http://localhost:8000'

async function req<T>(path: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${API}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
    if (!res.ok) return null
    return res.json() as Promise<T>
  } catch {
    return null
  }
}

// ─── Journal ────────────────────────────────────────────────────────────────

export async function getJournalEntry(date: string) {
  return req<JournalEntry>(`/api/journal/${date}`)
}

export async function upsertJournalEntry(date: string, data: Partial<JournalEntry>) {
  return req<JournalEntry>(`/api/journal/${date}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function getJournalCalendar(year: number, month: number) {
  return req<CalendarDay[]>(`/api/journal/calendar?year=${year}&month=${month}`)
}

// ─── Trades ─────────────────────────────────────────────────────────────────

export async function getTradesForDate(date: string) {
  return req<Trade[]>(`/api/trades?date=${date}`)
}

export async function createTrade(trade: Partial<Trade>) {
  return req<Trade>('/api/trades', { method: 'POST', body: JSON.stringify(trade) })
}

export async function updateTrade(id: string, trade: Partial<Trade>) {
  return req<Trade>(`/api/trades/${id}`, { method: 'PUT', body: JSON.stringify(trade) })
}

export async function deleteTrade(id: string) {
  return req<void>(`/api/trades/${id}`, { method: 'DELETE' })
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export async function getStats(params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  return req<StatsData>(`/api/stats${qs}`)
}

export async function getEquityCurve(params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  return req<EquityPoint[]>(`/api/stats/equity${qs}`)
}

export async function getPatternStats() {
  return req<PatternStat[]>('/api/stats/patterns')
}

export async function getPnlByDow() {
  return req<DowStat[]>('/api/stats/pnl-by-dow')
}

export async function getPnlByHour() {
  return req<HourStat[]>('/api/stats/pnl-by-hour')
}

export async function getHallOfFame() {
  return req<HallOfFame>('/api/stats/hall-of-fame')
}

export async function getRMultipleDistribution() {
  return req<RBucket[]>('/api/stats/r-distribution')
}

// ─── Scanner ─────────────────────────────────────────────────────────────────

export async function getScannerSignals(type?: string) {
  const qs = type && type !== 'all' ? `?type=${type}` : ''
  return req<ScannerSignal[]>(`/api/scanner${qs}`)
}

// ─── Watchlist ────────────────────────────────────────────────────────────────

export async function getWatchlist() {
  return req<WatchlistItem[]>('/api/watchlist')
}

export async function addToWatchlist(item: Partial<WatchlistItem>) {
  return req<WatchlistItem>('/api/watchlist', { method: 'POST', body: JSON.stringify(item) })
}

export async function updateWatchlistItem(id: string, item: Partial<WatchlistItem>) {
  return req<WatchlistItem>(`/api/watchlist/${id}`, {
    method: 'PUT',
    body: JSON.stringify(item),
  })
}

export async function removeFromWatchlist(id: string) {
  return req<void>(`/api/watchlist/${id}`, { method: 'DELETE' })
}

// ─── Patterns ────────────────────────────────────────────────────────────────

export async function getPatterns() {
  return req<Pattern[]>('/api/patterns')
}

export async function getPattern(id: string) {
  return req<Pattern>(`/api/patterns/${id}`)
}

export async function createPattern(pattern: Partial<Pattern>) {
  return req<Pattern>('/api/patterns', { method: 'POST', body: JSON.stringify(pattern) })
}

export async function updatePattern(id: string, pattern: Partial<Pattern>) {
  return req<Pattern>(`/api/patterns/${id}`, {
    method: 'PUT',
    body: JSON.stringify(pattern),
  })
}

export async function deletePattern(id: string) {
  return req<void>(`/api/patterns/${id}`, { method: 'DELETE' })
}

// ─── Pairs ───────────────────────────────────────────────────────────────────

export async function getPairs() {
  return req<Pair[]>('/api/pairs')
}

export async function getPairData(id: string) {
  return req<PairData>(`/api/pairs/${id}/data`)
}

export async function createPair(pair: Partial<Pair>) {
  return req<Pair>('/api/pairs', { method: 'POST', body: JSON.stringify(pair) })
}

export async function updatePairNotes(id: string, notes: string) {
  return req<Pair>(`/api/pairs/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ notes }),
  })
}

// ─── Funding ─────────────────────────────────────────────────────────────────

export async function getFundingRates() {
  return req<FundingRate[]>('/api/funding')
}

export async function getFundingHistory(asset: string) {
  return req<FundingHistoryPoint[]>(`/api/funding/${asset}/history`)
}

// ─── Psychology ───────────────────────────────────────────────────────────────

export async function getPsychologyStats(days?: number) {
  return req<PsychologyStats>(`/api/psychology?days=${days ?? 30}`)
}

// ─── Review ───────────────────────────────────────────────────────────────────

export async function getWeeklyReview(weekStart: string) {
  return req<WeeklyReview>(`/api/review/weekly?week=${weekStart}`)
}

export async function saveWeeklyReview(weekStart: string, data: Partial<WeeklyReview>) {
  return req<WeeklyReview>(`/api/review/weekly?week=${weekStart}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function getMonthlyReview(year: number, month: number) {
  return req<MonthlyReview>(`/api/review/monthly?year=${year}&month=${month}`)
}

export async function saveMonthlyReview(
  year: number,
  month: number,
  data: Partial<MonthlyReview>,
) {
  return req<MonthlyReview>(`/api/review/monthly?year=${year}&month=${month}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

// ─── Market ───────────────────────────────────────────────────────────────────

export async function getMarketOverview() {
  return req<MarketOverview>('/api/market')
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

export async function getAlerts() {
  return req<Alert[]>('/api/alerts')
}

export async function createAlert(alert: Partial<Alert>) {
  return req<Alert>('/api/alerts', { method: 'POST', body: JSON.stringify(alert) })
}

export async function updateAlert(id: string, alert: Partial<Alert>) {
  return req<Alert>(`/api/alerts/${id}`, { method: 'PUT', body: JSON.stringify(alert) })
}

export async function deleteAlert(id: string) {
  return req<void>(`/api/alerts/${id}`, { method: 'DELETE' })
}

export async function getAlertHistory() {
  return req<AlertHistoryItem[]>('/api/alerts/history')
}

// ─── Vaults ───────────────────────────────────────────────────────────────────

export async function getVaults() {
  return req<VaultPosition[]>('/api/vaults')
}

export async function getVaultHistory(vaultId: string) {
  return req<VaultHistoryPoint[]>(`/api/vaults/${vaultId}/history`)
}

// ─── Missed Setups ────────────────────────────────────────────────────────────

export async function getMissedSetups(date: string) {
  return req<MissedSetup[]>(`/api/missed-setups?date=${date}`)
}

export async function createMissedSetup(setup: Partial<MissedSetup>) {
  return req<MissedSetup>('/api/missed-setups', {
    method: 'POST',
    body: JSON.stringify(setup),
  })
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JournalEntry {
  date: string
  mood: number
  confidence: number
  mistakes: string[]
  market_context: string
  bias: 'bullish' | 'bearish' | 'neutral'
  bias_timeframe: 'intraday' | 'swing'
  bias_confidence: number
  bias_note: string
  game_plan: string
  daily_pnl: number
}

export interface CalendarDay {
  date: string
  pnl: number
  trades: number
}

export interface Trade {
  id: string
  date: string
  asset: string
  direction: 'long' | 'short'
  entry: number
  exit: number
  stop: number
  size: number
  pnl: number
  r_multiple: number
  pattern: string
  setup_thesis: string
  execution_notes: string
  session: string
  followed_rules: boolean
  rule_violations: string[]
  screenshot?: string
}

export interface StatsData {
  total_pnl: number
  win_rate: number
  avg_r: number
  total_trades: number
  current_streak: number
  max_drawdown: number
}

export interface EquityPoint {
  date: string
  equity: number
  pnl: number
}

export interface PatternStat {
  pattern: string
  trades: number
  win_rate: number
  avg_r: number
}

export interface DowStat {
  day: string
  pnl: number
  trades: number
}

export interface HourStat {
  hour: number
  pnl: number
  trades: number
}

export interface HallOfFame {
  top_wins: Trade[]
  top_losses: Trade[]
}

export interface RBucket {
  range: string
  count: number
  min: number
  max: number
}

export interface ScannerSignal {
  id: string
  asset: string
  type: 'breakout' | 'funding_extreme' | 'pair_divergence' | 'liquidation'
  strength: number
  price: number
  change_pct: number
  funding_rate?: number
  timestamp: string
  extra?: Record<string, unknown>
}

export interface WatchlistItem {
  id: string
  asset: string
  type: string
  key_levels: string
  notes: string
  scanner_signal?: string
  added_at: string
}

export interface Pattern {
  id: string
  name: string
  description: string
  entry_criteria: string
  exit_criteria: string
  invalidation: string
  timeframes: string[]
  notes: string
  screenshots: string[]
  times_traded?: number
  win_rate?: number
  avg_r?: number
}

export interface Pair {
  id: string
  asset_a: string
  asset_b: string
  notes: string
  in_trade: boolean
  trade_side_a?: 'long' | 'short'
  entry_price?: number
  current_pnl?: number
}

export interface PairData {
  spread: { date: string; value: number }[]
  zscore: number
  mean: number
  std: number
  correlation: { date: string; value: number }[]
}

export interface FundingRate {
  asset: string
  rate: number
  rate_24h_high: number
  rate_24h_low: number
  annualized: number
}

export interface FundingHistoryPoint {
  timestamp: string
  rate: number
}

export interface PsychologyStats {
  avg_mood: number
  avg_confidence: number
  most_common_mistake: string
  best_mood_pnl: number
  scatter: { mood: number; pnl: number; date: string }[]
  mistakes: { name: string; count: number }[]
  win_rate_by_mood: { quintile: string; win_rate: number }[]
  equity_with_mood: { date: string; equity: number; mood: number }[]
}

export interface WeeklyReview {
  week_start: string
  pnl: number
  trades: number
  win_rate: number
  best_trade?: Trade
  worst_trade?: Trade
  what_worked: string
  what_didnt: string
  key_violations: string
  notes: string
  pattern_perf: PatternStat[]
}

export interface MonthlyReview {
  year: number
  month: number
  pnl: number
  trades: number
  win_rate: number
  pnl_goal: number
  max_dd_limit: number
  rule_adherence_target: number
  actual_max_dd: number
  actual_rule_adherence: number
  key_lessons: string
  focus_areas: string
  equity: EquityPoint[]
  mom_pnl: { month: string; pnl: number }[]
}

export interface MarketOverview {
  btc_dominance: number
  btc_dominance_sparkline: number[]
  altseason_index: number
  crypto_fear_greed: number
  us_fear_greed: number
  macro_events: MacroEvent[]
}

export interface MacroEvent {
  date: string
  name: string
  importance: 'high' | 'medium' | 'low'
  forecast?: string
  previous?: string
}

export interface Alert {
  id: string
  type: 'price' | 'funding' | 'scanner' | 'oi_liq'
  asset: string
  condition: '>' | '<'
  threshold: number
  telegram_notify: boolean
  browser_notify: boolean
  active: boolean
  created_at: string
}

export interface AlertHistoryItem {
  id: string
  alert_id: string
  asset: string
  type: string
  triggered_at: string
  value_at_trigger: number
  threshold: number
}

export interface VaultPosition {
  id: string
  name: string
  address: string
  deposited: number
  current_value: number
  apr: number
  pnl: number
  role: 'depositor' | 'operator'
  depositors_count?: number
  tvl?: number
  fees_earned?: number
}

export interface VaultHistoryPoint {
  date: string
  apr: number
  tvl: number
}

export interface MissedSetup {
  id: string
  date: string
  asset: string
  pattern: string
  reason: string
  outcome: string
  notes: string
}
