import { useState } from 'react'
import { Plus, Edit2, Save, X, Trash2, Layers } from 'lucide-react'
import clsx from 'clsx'
import { useApi } from '../hooks/useApi'
import Badge from '../components/shared/Badge'
import Modal from '../components/shared/Modal'
import EmptyState from '../components/shared/EmptyState'
import LoadingSpinner from '../components/shared/LoadingSpinner'

const API = 'http://localhost:8000'

interface Pattern {
  id: string
  name: string
  description: string | null
  entry_criteria: string | null
  exit_criteria: string | null
  invalidation: string | null
  timeframes: string[] | null
  notes: string | null
  trade_stats?: { total_trades: number; win_rate: number; avg_r: number; total_pnl: number }
}

function Section({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm text-text1 leading-relaxed whitespace-pre-wrap">{value}</p>
    </div>
  )
}

function EditableSection({ label, field, value, onChange }: {
  label: string; field: string; value: string; onChange: (f: string, v: string) => void
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">{label}</p>
      <textarea
        className="input-base w-full resize-none"
        rows={3}
        value={value}
        onChange={e => onChange(field, e.target.value)}
        placeholder={`Enter ${label.toLowerCase()}...`}
      />
    </div>
  )
}

export default function PatternLibrary() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Pattern>>({})
  const [showNewModal, setShowNewModal] = useState(false)
  const [newName, setNewName] = useState('')

  const { data: patterns, loading, refetch } = useApi<Pattern[]>(
    () => fetch(`${API}/api/patterns`).then(r => r.json())
  )

  const { data: selected } = useApi<Pattern | null>(
    () => selectedId ? fetch(`${API}/api/patterns/${selectedId}`).then(r => r.json()) : Promise.resolve(null),
    { enabled: !!selectedId }
  )

  const pList = patterns ?? []

  const handleSelect = (id: string) => {
    setSelectedId(id)
    setEditing(false)
  }

  const startEdit = () => {
    if (!selected) return
    setEditForm({
      name: selected.name,
      description: selected.description ?? '',
      entry_criteria: selected.entry_criteria ?? '',
      exit_criteria: selected.exit_criteria ?? '',
      invalidation: selected.invalidation ?? '',
      notes: selected.notes ?? '',
    })
    setEditing(true)
  }

  const handleSave = async () => {
    if (!selectedId) return
    await fetch(`${API}/api/patterns/${selectedId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    })
    setEditing(false)
    refetch()
  }

  const handleDelete = async () => {
    if (!selectedId || !confirm('Delete this pattern?')) return
    await fetch(`${API}/api/patterns/${selectedId}`, { method: 'DELETE' })
    setSelectedId(null)
    refetch()
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    await fetch(`${API}/api/patterns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })
    setNewName('')
    setShowNewModal(false)
    refetch()
  }

  const formChange = (field: string, val: string) => setEditForm(f => ({ ...f, [field]: val }))

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-text1">Pattern Library</h1>
        <button onClick={() => setShowNewModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={15} /> New Pattern
        </button>
      </div>

      {loading ? (
        <LoadingSpinner fullPage />
      ) : (
        <div className="flex gap-5 h-[calc(100vh-180px)]">
          {/* Left — pattern list */}
          <div className="w-72 flex-shrink-0 space-y-1 overflow-y-auto pr-1">
            {pList.length === 0 ? (
              <EmptyState title="No patterns yet" icon={<Layers size={22} />} />
            ) : (
              pList.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleSelect(p.id)}
                  className={clsx(
                    'w-full text-left p-3 rounded-lg transition-colors border',
                    selectedId === p.id
                      ? 'bg-surface border-accent/30 border-l-2 border-l-accent'
                      : 'bg-surface border-white/5 hover:border-white/10',
                  )}
                >
                  <p className="text-sm font-medium text-text1">{p.name}</p>
                  {p.description && (
                    <p className="text-xs text-text2 mt-0.5 line-clamp-2">{p.description}</p>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Right — pattern detail */}
          <div className="flex-1 overflow-y-auto">
            {!selected ? (
              <EmptyState
                title="Select a pattern"
                description="Click a pattern on the left to view its details and stats."
              />
            ) : (
              <div className="card space-y-5">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    {editing ? (
                      <input
                        className="input-base text-lg font-semibold w-full"
                        value={editForm.name ?? ''}
                        onChange={e => formChange('name', e.target.value)}
                      />
                    ) : (
                      <h2 className="text-xl font-semibold text-text1">{selected.name}</h2>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0 ml-4">
                    {editing ? (
                      <>
                        <button onClick={() => setEditing(false)} className="btn-ghost flex items-center gap-1">
                          <X size={14} /> Cancel
                        </button>
                        <button onClick={handleSave} className="btn-primary flex items-center gap-1">
                          <Save size={14} /> Save
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={startEdit} className="btn-ghost flex items-center gap-1">
                          <Edit2 size={14} /> Edit
                        </button>
                        <button onClick={handleDelete} className="btn-ghost flex items-center gap-1 text-loss hover:text-loss">
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Trade stats */}
                {selected.trade_stats && (
                  <div className="grid grid-cols-4 gap-3 p-3 bg-muted rounded-lg">
                    <div className="text-center">
                      <p className="text-xs text-text2">Trades</p>
                      <p className="text-lg font-semibold text-text1">{selected.trade_stats.total_trades}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-text2">Win Rate</p>
                      <p className="text-lg font-semibold text-accent">{selected.trade_stats.win_rate}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-text2">Avg R</p>
                      <p className={clsx('text-lg font-semibold', selected.trade_stats.avg_r >= 0 ? 'text-gain' : 'text-loss')}>
                        {selected.trade_stats.avg_r.toFixed(2)}R
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-text2">Total P&L</p>
                      <p className={clsx('text-lg font-semibold', selected.trade_stats.total_pnl >= 0 ? 'text-gain' : 'text-loss')}>
                        ${selected.trade_stats.total_pnl.toFixed(0)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Content */}
                <div className="space-y-4">
                  {editing ? (
                    <>
                      <EditableSection label="Description" field="description" value={editForm.description ?? ''} onChange={formChange} />
                      <EditableSection label="Entry Criteria" field="entry_criteria" value={editForm.entry_criteria ?? ''} onChange={formChange} />
                      <EditableSection label="Exit Criteria" field="exit_criteria" value={editForm.exit_criteria ?? ''} onChange={formChange} />
                      <EditableSection label="Invalidation" field="invalidation" value={editForm.invalidation ?? ''} onChange={formChange} />
                      <EditableSection label="Notes" field="notes" value={editForm.notes ?? ''} onChange={formChange} />
                    </>
                  ) : (
                    <>
                      <Section label="Description" value={selected.description} />
                      <Section label="Entry Criteria" value={selected.entry_criteria} />
                      <Section label="Exit Criteria" value={selected.exit_criteria} />
                      <Section label="Invalidation" value={selected.invalidation} />
                      {selected.timeframes && selected.timeframes.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Timeframes</p>
                          <div className="flex gap-1.5 flex-wrap">
                            {selected.timeframes.map(tf => (
                              <Badge key={tf} variant="accent">{tf}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      <Section label="Notes" value={selected.notes} />
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showNewModal && (
        <Modal title="New Pattern" onClose={() => setShowNewModal(false)} size="sm">
          <div className="space-y-4">
            <div>
              <label className="text-xs text-text2 mb-1 block">Pattern Name</label>
              <input
                className="input-base w-full"
                placeholder="e.g. VWAP Reclaim"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowNewModal(false)} className="btn-ghost flex-1">Cancel</button>
              <button onClick={handleCreate} className="btn-primary flex-1" disabled={!newName.trim()}>Create</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
