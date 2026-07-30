import { useState } from 'react'
import { formatSatangAsBaht } from '../../lib/money'
import { BUDGET_DIRECTION_LABEL, BUDGET_FREQUENCY_LABEL, type BudgetDirection, type BudgetFrequency } from './types'
import { useBudgetItems, type BudgetItemRow } from './useBudgetItems'
import { BudgetItemFormDialog } from './BudgetItemFormDialog'

export function BudgetItemsTab() {
  const { items, loading, error, refresh } = useBudgetItems()
  const [editing, setEditing] = useState<BudgetItemRow | 'new' | null>(null)
  const [duplicating, setDuplicating] = useState<BudgetItemRow | null>(null)

  const handleSaved = () => {
    setEditing(null)
    setDuplicating(null)
    refresh()
  }

  return (
    <div>
      <div className="list-header">
        <h2 style={{ margin: 0, fontSize: 18 }}>รายการงบประมาณ</h2>
        <button type="button" className="btn" onClick={() => setEditing('new')}>
          + เพิ่มรายการ
        </button>
      </div>
      <div className="field-hint">
        เป็นฐานคำนวณของ "คาดการณ์" — ไม่มีกำหนดจบ = รายการสม่ำเสมอ (เช่น เงินเดือน), มีกำหนดจบ = แผนช่วงเวลาเฉพาะ (เช่น เบี้ยประกัน)
        หนี้ที่ตั้งค่าเงินกู้ครบแล้วไม่ต้องเพิ่มที่นี่ (ระบบดึงจากตารางผ่อนชำระอัตโนมัติ)
      </div>

      {error && <div className="banner-error">{error}</div>}
      {!loading && items.length === 0 && <div className="empty-state">ยังไม่มีรายการงบประมาณ กดปุ่ม + เพื่อเพิ่ม</div>}

      {items.length > 0 && (
        <div className="card">
          {items.map((item) => {
            const isExpense = item.direction === 'outflow'
            const isIncome = item.direction === 'inflow'
            return (
              <button
                key={item.id}
                type="button"
                className="item-row"
                style={{ opacity: item.is_active ? 1 : 0.5 }}
                onClick={() => setEditing(item)}
              >
                <div>
                  <div className="item-row-name">
                    {item.name || item.accountName}
                    {!item.is_active && <span className="badge badge-muted">ปิดใช้งาน</span>}
                  </div>
                  <div className="item-row-sub">
                    {item.accountName} · {BUDGET_DIRECTION_LABEL[item.direction as BudgetDirection]} ·{' '}
                    {BUDGET_FREQUENCY_LABEL[item.frequency as BudgetFrequency]} · เริ่ม {item.start_date}
                    {item.end_date ? ` · จบ ${item.end_date}` : ' · ไม่มีกำหนดจบ'}
                    {item.growth_percent_per_year !== 0 ? ` · +${item.growth_percent_per_year}%/ปี` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className={`item-row-balance${isExpense ? ' negative' : ''}`}>
                    {isExpense ? '-' : isIncome ? '+' : ''}
                    {formatSatangAsBaht(item.amount_per_occurrence_satang)} บาท/ครั้ง
                  </div>
                  <span
                    role="button"
                    tabIndex={0}
                    className="btn-secondary btn"
                    style={{ minHeight: 36, padding: '0 12px', fontSize: 13 }}
                    onClick={(e) => {
                      e.stopPropagation()
                      setDuplicating(item)
                    }}
                  >
                    ทำซ้ำ
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {editing && (
        <BudgetItemFormDialog initial={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={handleSaved} />
      )}
      {duplicating && (
        <BudgetItemFormDialog initial={duplicating} mode="duplicate" onClose={() => setDuplicating(null)} onSaved={handleSaved} />
      )}
    </div>
  )
}
