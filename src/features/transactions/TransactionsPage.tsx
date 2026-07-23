import { useMemo, useState } from 'react'
import { formatSatangAsBaht } from '../../lib/money'
import { toLocalDateString } from '../../lib/date'
import { TransactionFormDialog } from './TransactionFormDialog'
import { detectFlow, useTransactions, type TransactionDetail } from './useTransactions'

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
  const [editing, setEditing] = useState<TransactionDetail | null>(null)

  const monthLabel = anchor.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })

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

      {error && <div className="banner-error">{error}</div>}

      {!loading && transactions.length === 0 && <div className="empty-state">ยังไม่มีรายการในเดือนนี้ กดปุ่ม + เพื่อเพิ่ม</div>}

      <div className="card">
        {transactions.map((t) => {
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
              <div className={`item-row-balance${flow === 'expense' ? ' negative' : ''}`}>
                {flow === 'expense' ? '-' : flow === 'income' ? '+' : ''}
                {formatSatangAsBaht(amount)} บาท
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
    </div>
  )
}
