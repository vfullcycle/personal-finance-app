import { useMemo, useState } from 'react'
import { Modal } from '../../components/Modal'
import { formatSatangAsBaht } from '../../lib/money'
import { todayLocalDateString } from '../../lib/date'
import { ConfirmRecurringDialog } from './ConfirmRecurringDialog'
import { RecurringFormDialog } from './RecurringFormDialog'
import { resolveRecurringLegs } from './recurringLegBuilder'
import { AMOUNT_MODE_LABEL, FLOW_LABEL, FREQUENCY_LABEL, type AmountMode, type FlowType, type Frequency } from './types'
import { detectRecurringFlow, setRecurringActive, useRecurring, type RecurringDetail } from './useRecurring'

const FLOWS: FlowType[] = ['income', 'expense', 'transfer']

function summarize(item: RecurringDetail) {
  const flow = detectRecurringFlow(item.legs)
  if (flow === 'transfer') {
    const dest = item.legs.find((l) => l.sign === 1 && l.account.type_id !== 'expense')
    const source = item.legs.find((l) => l.sign === -1)
    return `${source?.account.name ?? '?'} → ${dest?.account.name ?? '?'}`
  }
  const categoryTypeId = flow === 'income' ? 'income' : 'expense'
  return item.legs.filter((l) => l.account.type_id === categoryTypeId).map((l) => l.account.name).join(', ')
}

// preview ยอดงวดถัดไป — สำหรับผ่อนจ่ายหนี้แบบลดต้นลดดอก ค่านี้เปลี่ยนทุกงวด จึงคำนวณสดจาก next_due_date
// ไม่ใช่อ่านค่า template ที่ตายตัวจากตอนสร้างรายการ (ยอดผันแปรไม่มี preview เพราะยังไม่รู้จำนวน)
function previewNextAmount(item: RecurringDetail): number | null {
  try {
    const legs = resolveRecurringLegs(item.legs, item.next_due_date)
    return legs.filter((l) => l.amount > 0).reduce((sum, l) => sum + l.amount, 0)
  } catch {
    return null
  }
}

export function RecurringPage() {
  const { items, loading, error, refresh } = useRecurring()
  const [addStep, setAddStep] = useState<'closed' | 'pick' | FlowType>('closed')
  const [editing, setEditing] = useState<RecurringDetail | null>(null)
  const [confirming, setConfirming] = useState<RecurringDetail | null>(null)

  const todayIso = todayLocalDateString()
  const pending = useMemo(
    () =>
      items.filter(
        (r) =>
          r.is_active &&
          r.next_due_date <= todayIso &&
          (r.end_date == null || r.next_due_date <= r.end_date) &&
          (r.amount_mode === 'variable' || !r.auto_post),
      ),
    [items, todayIso],
  )

  const handleSaved = () => {
    setAddStep('closed')
    setEditing(null)
    refresh()
  }

  const toggleActive = async (item: RecurringDetail) => {
    await setRecurringActive(item.id, !item.is_active)
    refresh()
  }

  return (
    <div className="page">
      <div className="list-header">
        <h1>รายการประจำ</h1>
        <button type="button" className="btn" onClick={() => setAddStep('pick')}>
          + เพิ่มรายการประจำ
        </button>
      </div>

      {error && <div className="banner-error">{error}</div>}

      {pending.length > 0 && (
        <>
          <div className="group-title">รอยืนยัน ({pending.length})</div>
          <div className="card" style={{ marginBottom: 20 }}>
            {pending.map((item) => (
              <button key={item.id} type="button" className="item-row" onClick={() => setConfirming(item)}>
                <div>
                  <div className="item-row-name">{summarize(item)}</div>
                  <div className="item-row-sub">
                    ถึงกำหนด {item.next_due_date} · {AMOUNT_MODE_LABEL[item.amount_mode as AmountMode]}
                  </div>
                </div>
                <span className="badge">ยืนยัน</span>
              </button>
            ))}
          </div>
        </>
      )}

      {!loading && items.length === 0 && <div className="empty-state">ยังไม่มีรายการประจำ กดปุ่ม + เพื่อเพิ่ม</div>}

      <div className="card">
        {items.map((item) => {
          const flow = detectRecurringFlow(item.legs)
          const nextAmount = previewNextAmount(item)
          return (
            <button key={item.id} type="button" className="item-row" onClick={() => setEditing(item)}>
              <div>
                <div className="item-row-name">
                  {summarize(item)}
                  {!item.is_active && <span className="badge badge-muted">ปิดใช้งาน</span>}
                </div>
                <div className="item-row-sub">
                  {FLOW_LABEL[flow]} · {FREQUENCY_LABEL[item.frequency as Frequency]} · ครบกำหนดถัดไป {item.next_due_date}
                  {item.auto_post ? ' · อัตโนมัติ' : ''}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {nextAmount != null && <span className="item-row-balance">{formatSatangAsBaht(nextAmount)} บาท</span>}
                <span
                  role="button"
                  tabIndex={0}
                  className="btn-secondary btn"
                  style={{ minHeight: 36, padding: '0 12px', fontSize: 13 }}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleActive(item)
                  }}
                >
                  {item.is_active ? 'ปิด' : 'เปิด'}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {addStep === 'pick' && (
        <Modal title="เพิ่มรายการประจำ" onClose={() => setAddStep('closed')}>
          <div className="flow-picker">
            {FLOWS.map((f) => (
              <button key={f} type="button" className="btn btn-block flow-picker-btn" onClick={() => setAddStep(f)}>
                {FLOW_LABEL[f]}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {addStep !== 'closed' && addStep !== 'pick' && (
        <RecurringFormDialog flow={addStep} initial={null} onClose={() => setAddStep('closed')} onSaved={handleSaved} />
      )}

      {editing && (
        <RecurringFormDialog flow={detectRecurringFlow(editing.legs)} initial={editing} onClose={() => setEditing(null)} onSaved={handleSaved} />
      )}

      {confirming && (
        <ConfirmRecurringDialog
          item={confirming}
          onClose={() => setConfirming(null)}
          onConfirmed={() => {
            setConfirming(null)
            refresh()
          }}
        />
      )}
    </div>
  )
}
