import { useMemo, useState } from 'react'
import { formatSatangAsBaht } from '../../lib/money'
import { toLocalDateString } from '../../lib/date'
import { TransactionFormDialog } from './TransactionFormDialog'
import { detectFlow, useTransactions, type TransactionDetail } from './useTransactions'
import { useTags } from './useTags'

function monthRange(anchor: Date) {
  return {
    from: toLocalDateString(new Date(anchor.getFullYear(), anchor.getMonth(), 1)),
    to: toLocalDateString(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)),
  }
}

function summarize(t: TransactionDetail) {
  const flow = detectFlow(t.legs)
  if (flow === 'income') {
    const amount = t.legs.filter((l) => l.account.type_id === 'income').reduce((sum, l) => sum - l.amount, 0)
    const label = t.legs.filter((l) => l.account.type_id === 'income').map((l) => l.account.name).join(', ')
    return { flow, amount, label }
  }
  if (flow === 'expense') {
    const amount = t.legs.filter((l) => l.account.type_id === 'expense').reduce((sum, l) => sum + l.amount, 0)
    const label = t.legs.filter((l) => l.account.type_id === 'expense').map((l) => l.account.name).join(', ')
    return { flow, amount, label }
  }
  const dest = t.legs.find((l) => l.amount > 0 && l.account.type_id !== 'expense')
  const source = t.legs.find((l) => l.amount < 0)
  const amount = t.legs.filter((l) => l.amount > 0).reduce((sum, l) => sum + l.amount, 0)
  return { flow, amount, label: `${source?.account.name ?? '?'} → ${dest?.account.name ?? '?'}` }
}

export function TransactionsPage() {
  const [anchor, setAnchor] = useState(() => new Date())
  const range = useMemo(() => monthRange(anchor), [anchor])
  const { transactions, loading, error, refresh } = useTransactions(range)
  const { tags } = useTags()
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [editing, setEditing] = useState<TransactionDetail | null>(null)
  const [duplicating, setDuplicating] = useState<TransactionDetail | null>(null)

  const monthLabel = anchor.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })

  const visible = tagFilter ? transactions.filter((t) => t.tagIds.includes(tagFilter)) : transactions

  const filterSummary = useMemo(() => {
    if (!tagFilter) return null
    let totalIncome = 0
    let totalExpense = 0
    for (const t of visible) {
      const { flow, amount } = summarize(t)
      if (flow === 'income') totalIncome += amount
      else if (flow === 'expense') totalExpense += amount
    }
    return { count: visible.length, totalIncome, totalExpense }
  }, [tagFilter, visible])

  return (
    <div className="page">
      <div className="list-header">
        <h1>รายการ</h1>
      </div>

      <div className="list-header">
        <button
          type="button"
          className="btn-secondary btn"
          aria-label="เดือนก่อนหน้า"
          onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1))}
        >
          ‹
        </button>
        <div style={{ fontWeight: 700 }}>{monthLabel}</div>
        <button
          type="button"
          className="btn-secondary btn"
          aria-label="เดือนถัดไป"
          onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1))}
        >
          ›
        </button>
      </div>

      {tags.length > 0 && (
        <div className="radio-group" style={{ marginBottom: 12 }}>
          <button
            type="button"
            className={`radio-chip${tagFilter === null ? ' active' : ''}`}
            onClick={() => setTagFilter(null)}
          >
            ทั้งหมด
          </button>
          {tags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              className={`radio-chip${tagFilter === tag.id ? ' active' : ''}`}
              onClick={() => setTagFilter(tag.id)}
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}

      {filterSummary && (
        <div className="banner-info" style={{ marginBottom: 12 }}>
          {filterSummary.count} รายการ · รายรับ {formatSatangAsBaht(filterSummary.totalIncome)} บาท · รายจ่าย{' '}
          {formatSatangAsBaht(filterSummary.totalExpense)} บาท
        </div>
      )}

      {error && <div className="banner-error">{error}</div>}

      {!loading && visible.length === 0 && (
        <div className="empty-state">
          {tagFilter ? 'ไม่มีรายการที่ติดแท็กนี้ในเดือนนี้' : 'ยังไม่มีรายการในเดือนนี้ กดปุ่ม + เพื่อเพิ่ม'}
        </div>
      )}

      <div className="card">
        {visible.map((t) => {
          const { flow, amount, label } = summarize(t)
          return (
            <button key={t.id} type="button" className="item-row" onClick={() => setEditing(t)}>
              <div>
                <div className="item-row-name">
                  {label || '(ไม่มีหมวดหมู่)'}
                  {t.tagNames.map((name) => (
                    <span key={name} className="badge badge-muted">
                      {name}
                    </span>
                  ))}
                </div>
                <div className="item-row-sub">
                  {t.occurred_on}
                  {t.payee ? ` · ${t.payee}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className={`item-row-balance${flow === 'expense' ? ' negative' : ''}`}>
                  {flow === 'expense' ? '-' : flow === 'income' ? '+' : ''}
                  {formatSatangAsBaht(amount)} บาท
                </div>
                <span
                  role="button"
                  tabIndex={0}
                  className="btn-secondary btn"
                  style={{ minHeight: 36, padding: '0 12px', fontSize: 13 }}
                  onClick={(e) => {
                    e.stopPropagation()
                    setDuplicating(t)
                  }}
                >
                  ทำซ้ำ
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {editing && (
        <TransactionFormDialog
          flow={detectFlow(editing.legs)}
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            refresh()
          }}
        />
      )}

      {duplicating && (
        <TransactionFormDialog
          flow={detectFlow(duplicating.legs)}
          initial={duplicating}
          mode="duplicate"
          onClose={() => setDuplicating(null)}
          onSaved={() => {
            setDuplicating(null)
            refresh()
          }}
        />
      )}
    </div>
  )
}
