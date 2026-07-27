import { useState } from 'react'
import { formatSatangAsBaht } from '../../lib/money'
import { BUDGET_DIRECTION_LABEL, BUDGET_FREQUENCY_LABEL, type BudgetDirection, type BudgetFrequency } from './types'
import { useBudgetSchedule, type BudgetScheduleRow } from './useBudgetSchedule'
import { ScheduleItemFormDialog } from './ScheduleItemFormDialog'

export function ScheduleTab() {
  const { items, loading, error, refresh } = useBudgetSchedule()
  const [editing, setEditing] = useState<BudgetScheduleRow | 'new' | null>(null)

  const handleSaved = () => {
    setEditing(null)
    refresh()
  }

  return (
    <div>
      <div className="list-header">
        <h2 style={{ margin: 0, fontSize: 18 }}>แผนกำหนดการ (ชั้น B)</h2>
        <button type="button" className="btn" onClick={() => setEditing('new')}>
          + เพิ่มรายการ
        </button>
      </div>
      <div className="field-hint">
        รายการผูกช่วงปีเฉพาะ เช่น เบี้ยประกัน, ซ่อมบ้าน — หนี้ที่ตั้งค่าเงินกู้ครบแล้วไม่ต้องเพิ่มที่นี่ (ระบบดึงจากตารางผ่อนชำระอัตโนมัติ)
      </div>

      {error && <div className="banner-error">{error}</div>}
      {!loading && items.length === 0 && <div className="empty-state">ยังไม่มีแผนกำหนดการ กดปุ่ม + เพื่อเพิ่ม</div>}

      {items.length > 0 && (
        <div className="card">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="report-row"
              style={{ width: '100%', textAlign: 'left' }}
              onClick={() => setEditing(item)}
            >
              <div className="report-row-name">
                {item.name}
                <span className="report-row-pct">
                  {item.accountName} · {BUDGET_DIRECTION_LABEL[item.direction as BudgetDirection]} ·{' '}
                  {BUDGET_FREQUENCY_LABEL[item.frequency as BudgetFrequency]} · {item.year_start}
                  {item.year_end !== item.year_start ? `–${item.year_end}` : ''}
                </span>
              </div>
              <div className="report-row-values">
                <span className="report-row-amount">{formatSatangAsBaht(item.amount_per_occurrence_satang)} บาท/ครั้ง</span>
                {item.growth_percent_per_year !== 0 && (
                  <span className="report-row-pct">+{item.growth_percent_per_year}%/ปี</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {editing && (
        <ScheduleItemFormDialog initial={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={handleSaved} />
      )}
    </div>
  )
}
