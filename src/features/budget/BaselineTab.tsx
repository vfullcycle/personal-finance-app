import { useState } from 'react'
import { formatSatangAsBaht } from '../../lib/money'
import { BUDGET_PERIOD_LABEL, type BudgetPeriod } from './types'
import { useBudgetBaseline, type BudgetBaselineRow } from './useBudgetBaseline'
import { BaselineItemFormDialog } from './BaselineItemFormDialog'

const DIRECTION_LABEL_BY_TYPE: Record<string, string> = {
  income: 'รับเข้า',
  expense: 'จ่ายออก',
  asset: 'โยกเข้าสินทรัพย์',
}

export function BaselineTab() {
  const { items, loading, error, refresh } = useBudgetBaseline()
  const [editing, setEditing] = useState<BudgetBaselineRow | 'new' | null>(null)

  const handleSaved = () => {
    setEditing(null)
    refresh()
  }

  return (
    <div>
      <div className="list-header">
        <h2 style={{ margin: 0, fontSize: 18 }}>งบประจำ (ชั้น A)</h2>
        <button type="button" className="btn" onClick={() => setEditing('new')}>
          + เพิ่มรายการ
        </button>
      </div>
      <div className="field-hint">รายการสม่ำเสมอ ไม่มีปีเริ่ม-จบ ใช้ตลอดช่วงคาดการณ์ เช่น เงินเดือน, ค่าอาหาร, เงินออม PVD</div>

      {error && <div className="banner-error">{error}</div>}
      {!loading && items.length === 0 && <div className="empty-state">ยังไม่มีรายการงบประจำ กดปุ่ม + เพื่อเพิ่ม</div>}

      {items.length > 0 && (
        <div className="card">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="report-row"
              style={{ width: '100%', textAlign: 'left', opacity: item.is_active ? 1 : 0.5 }}
              onClick={() => setEditing(item)}
            >
              <div className="report-row-name">
                {item.accountName}
                <span className="report-row-pct">
                  {DIRECTION_LABEL_BY_TYPE[item.accountTypeId] ?? ''}
                  {!item.is_active ? ' · ปิดใช้งาน' : ''}
                </span>
              </div>
              <div className="report-row-values">
                <span className="report-row-amount">
                  {formatSatangAsBaht(item.amount_per_period_satang)} บาท / {BUDGET_PERIOD_LABEL[item.period as BudgetPeriod]}
                </span>
                {item.growth_percent_per_year !== 0 && (
                  <span className="report-row-pct">+{item.growth_percent_per_year}%/ปี</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {editing && (
        <BaselineItemFormDialog initial={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={handleSaved} />
      )}
    </div>
  )
}
