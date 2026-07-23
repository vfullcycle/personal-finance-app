import { useMemo, useState, type FormEvent } from 'react'
import { Modal } from '../../components/Modal'
import { useAuth } from '../../context/AuthContext'
import { bahtToSatang, formatSatangAsBaht } from '../../lib/money'
import { emitTransactionsChanged } from './events'
import { postRecurringOccurrence } from './postRecurring'
import { resolveRecurringLegs } from './recurringLegBuilder'
import { FLOW_LABEL, type Frequency, type LegInput } from './types'
import { detectRecurringFlow, type RecurringDetail } from './useRecurring'

export function ConfirmRecurringDialog({
  item,
  onClose,
  onConfirmed,
}: {
  item: RecurringDetail
  onClose: () => void
  onConfirmed: () => void
}) {
  const { user } = useAuth()
  const flow = detectRecurringFlow(item.legs)
  const isVariable = item.amount_mode === 'variable'
  const [occurredOn, setOccurredOn] = useState(item.next_due_date)
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // ยอดคงที่ (รวมกรณีผ่อนจ่ายหนี้ที่ตั้งค่าเงินกู้ไว้) คำนวณ preview สดตามวันที่ที่เลือก
  // ยอดผันแปรยังไม่มีตัวเลขจนกว่าผู้ใช้จะกรอก จึงไม่มี preview
  const preview: LegInput[] | null = useMemo(() => {
    if (isVariable) return null
    try {
      return resolveRecurringLegs(item.legs, occurredOn)
    } catch {
      return null
    }
  }, [item.legs, occurredOn, isVariable])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    setError(null)

    let confirmedAmount: number | undefined
    if (isVariable) {
      confirmedAmount = bahtToSatang(amount)
      if (confirmedAmount <= 0) {
        setError('กรุณากรอกจำนวนเงิน')
        return
      }
    }

    let legs: LegInput[]
    try {
      legs = resolveRecurringLegs(item.legs, occurredOn, confirmedAmount)
    } catch {
      setError('ข้อมูลรายการประจำไม่ครบ กรุณาแก้ไขรายการประจำนี้ก่อน')
      return
    }

    setSubmitting(true)
    const { error: postError } = await postRecurringOccurrence({
      userId: user.id,
      recurringId: item.id,
      occurredOn,
      frequency: item.frequency as Frequency,
      payee: item.payee,
      note: item.note,
      legs,
    })
    setSubmitting(false)

    if (postError) {
      setError(postError.message)
      return
    }
    emitTransactionsChanged()
    onConfirmed()
  }

  const summary = preview?.map((l) => `${l.amount > 0 ? '+' : ''}${formatSatangAsBaht(l.amount)}`).join(' / ') ?? null

  return (
    <Modal title={`ยืนยันรายการประจำ: ${FLOW_LABEL[flow]}`} onClose={onClose}>
      {error && <div className="banner-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="occurredOn">วันที่</label>
          <input id="occurredOn" type="date" required value={occurredOn} onChange={(e) => setOccurredOn(e.target.value)} />
        </div>

        {isVariable ? (
          <div className="field">
            <label htmlFor="confirmAmount">จำนวนเงิน (บาท)</label>
            <input
              id="confirmAmount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              required
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        ) : (
          <div className="field-hint">ยอด: {summary ?? '?'} บาท</div>
        )}

        <div className="form-actions">
          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? 'กำลังบันทึก...' : 'ยืนยันบันทึก'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
