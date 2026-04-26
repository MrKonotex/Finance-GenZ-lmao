import { useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Database } from 'lucide-react'
import clsx from 'clsx'
import { useApi } from '../hooks/useApi'
import Badge from '../components/shared/Badge'
import Modal from '../components/shared/Modal'
import EmptyState from '../components/shared/EmptyState'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import { formatCurrency } from '../lib/utils'

const API = 'http://localhost:8000'

export default function Vaults() {
  const [showCombined, setShowCombined] = useState(false)
  const [selectedVault, setSelectedVault] = useState<string | null>(null)

  const { data: vaultData, loading } = useApi<any>(
    () => fetch(`${API}/api/vaults`).then(r => r.json()),
    { refetchInterval: 60000 }
  )
  const { data: summaryData } = useApi<any>(
    () => fetch(`${API}/api/vaults/summary`).then(r => r.json()),
    { refetchInterval: 60000 }
  )
  const { data: statsData } = useApi<any>(
    () => fetch(`${API}/api/stats/summary`).then(r => r.json())
  )
  const { data: vaultPerf } = useApi<any>(
    () => selectedVault
      ? fetch(`${API}/api/vaults/${selectedVault}/performance`).then(r => r.json())
      : Promise.resolve(null),
    { enabled: !!selectedVault }
  )

  const vaults: any[] = vaultData?.vaults ?? []
  const totalVaultEquity = summaryData?.trading_account_value ?? null
  const totalTradingPnl = statsData?.total_pnl ?? null
  const walletConfigured = !vaultData?.note

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold text-text1">Vault Tracker</h1>

      {/* Wallet not configured */}
      {!walletConfigured && (
        <div className="card border-accent/20 bg-accent/5">
          <p className="text-sm font-semibold text-accent mb-1">Connect Your Hyperliquid Wallet</p>
          <p className="text-xs text-text2 mb-3">Set your wallet address in <code className="bg-muted px-1.5 rounded text-accent">.env</code> to track vault positions and account data.</p>
          <code className="block text-xs bg-muted p-3 rounded-lg text-accent">HL_WALLET_ADDRESS=0x...</code>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-xs text-text2 mb-1">Trading Account Value</p>
          <p className={clsx('text-2xl font-bold', totalVaultEquity != null ? 'text-text1' : 'text-text2')}>
            {totalVaultEquity != null ? formatCurrency(totalVaultEquity) : '—'}
          </p>
          <p className="text-xs text-text2 mt-1">HL margin account</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-text2 mb-1">Active Trading P&L</p>
          <p className={clsx('text-2xl font-bold', (totalTradingPnl ?? 0) >= 0 ? 'text-gain' : 'text-loss')}>
            {totalTradingPnl != null ? formatCurrency(totalTradingPnl) : '—'}
          </p>
          <p className="text-xs text-text2 mt-1">from journal trades</p>
        </div>
        <div className="card text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <p className="text-xs text-text2">Combined Portfolio</p>
            <button
              onClick={() => setShowCombined(v => !v)}
              className={clsx('text-xs px-2 py-0.5 rounded transition-colors', showCombined ? 'bg-accent text-base' : 'bg-muted text-text2')}
            >
              {showCombined ? 'On' : 'Show'}
            </button>
          </div>
          {showCombined && totalVaultEquity != null && totalTradingPnl != null ? (
            <p className={clsx('text-2xl font-bold', (totalVaultEquity + totalTradingPnl) >= 0 ? 'text-gain' : 'text-loss')}>
              {formatCurrency(totalVaultEquity + totalTradingPnl)}
            </p>
          ) : (
            <p className="text-text2 text-2xl font-bold">—</p>
          )}
        </div>
      </div>

      {loading ? (
        <LoadingSpinner fullPage />
      ) : vaults.length === 0 ? (
        <EmptyState
          title="No vault positions found"
          description={walletConfigured ? "Your wallet has no active vault positions." : "Set HL_WALLET_ADDRESS in .env to load vault data."}
          icon={<Database size={22} />}
        />
      ) : (
        <>
          {/* Vault positions table */}
          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-xs text-text2 font-medium px-4 py-3">Vault</th>
                  <th className="text-left text-xs text-text2 font-medium px-4 py-3">Role</th>
                  <th className="text-right text-xs text-text2 font-medium px-4 py-3">Deposited</th>
                  <th className="text-right text-xs text-text2 font-medium px-4 py-3">P&L</th>
                  <th className="text-right text-xs text-text2 font-medium px-4 py-3 hidden md:table-cell">APR</th>
                  <th className="text-right text-xs text-text2 font-medium px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vaults.map((v: any) => {
                  const vaultAddr = v.vault_address ?? v.address ?? v.name ?? 'unknown'
                  const role: 'depositor' | 'operator' = v.role ?? 'depositor'
                  return (
                    <tr key={vaultAddr} className="border-b border-white/5 last:border-0 hover:bg-white/2 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-mono text-xs text-text1 truncate max-w-[150px]">
                          {v.name ?? vaultAddr}
                        </p>
                        {v.name && <p className="text-xs text-text2 font-mono truncate max-w-[150px]">{vaultAddr}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={role === 'operator' ? 'accent' : 'neutral'}>{role}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs font-mono text-text1">
                          {v.deposited != null ? formatCurrency(v.deposited) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={clsx('text-xs font-mono font-semibold', (v.pnl ?? 0) >= 0 ? 'text-gain' : 'text-loss')}>
                          {v.pnl != null ? formatCurrency(v.pnl) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        <span className={clsx('text-xs font-mono', (v.apr ?? v.apy ?? 0) >= 0 ? 'text-gain' : 'text-loss')}>
                          {v.apr != null ? `${v.apr}%` : v.apy != null ? `${parseFloat(v.apy).toFixed(1)}%` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedVault(v.vault_address ?? null)}
                          className="btn-ghost text-xs py-1"
                        >
                          History
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Operator extras */}
          {vaults.some((v: any) => v.role === 'operator') && (
            <div className="card">
              <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-3">Operator Summary</p>
              <div className="grid grid-cols-3 gap-4">
                {vaults.filter((v: any) => v.role === 'operator').map((v: any) => (
                  <div key={v.vault_address ?? v.name} className="bg-muted rounded-lg p-3">
                    <p className="text-xs text-text2 mb-1 truncate">{v.name ?? 'Your Vault'}</p>
                    <p className="text-sm font-semibold text-text1">TVL: {v.tvl ? formatCurrency(v.tvl) : '—'}</p>
                    <p className="text-xs text-text2">Followers: {v.followers ?? '—'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Vault performance modal */}
      {selectedVault && vaultPerf && (
        <Modal title={`Vault Performance — ${vaultPerf.name ?? selectedVault.slice(0, 8) + '...'}`} onClose={() => setSelectedVault(null)} size="lg">
          <div className="space-y-4">
            {vaultPerf.apy != null && (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-xs text-text2">APY</p>
                  <p className="text-xl font-bold text-gain">{parseFloat(vaultPerf.apy).toFixed(1)}%</p>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-xs text-text2">TVL</p>
                  <p className="text-xl font-bold text-text1">{vaultPerf.tvl ? formatCurrency(vaultPerf.tvl) : '—'}</p>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-xs text-text2">Followers</p>
                  <p className="text-xl font-bold text-text1">{vaultPerf.followers ?? '—'}</p>
                </div>
              </div>
            )}
            {vaultPerf.performance?.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={vaultPerf.performance.slice(-60)} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                  <defs>
                    <linearGradient id="vaultGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00C2CB" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#00C2CB" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="0" tick={{ fill: '#9B9BA8', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#9B9BA8', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: '#131316', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="1" name="Value" stroke="#00C2CB" fill="url(#vaultGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="No performance history" />
            )}
            {vaultPerf.description && (
              <p className="text-xs text-text2">{vaultPerf.description}</p>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
