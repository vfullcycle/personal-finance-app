import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Modal } from '../../components/Modal'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { bahtToSatang, satangToBaht } from '../../lib/money'
import { todayLocalDateString } from '../../lib/date'
import { useAccounts } from '../accounts/useAccounts'
import { BUDGET_DIRECTION_ACCOUNT_TYPE, BUDGET_DIRECTION_LABEL, BUDGET_FREQUENCY_LABEL, type BudgetDirection, type BudgetFrequency } from './types'
import type { BudgetItemRow } from './useBudgetItems'

export function BudgetItemFormDialog({
  initial,
  mode = 'edit',
  onClose,
  onSaved,
}: {
  initial: BudgetItemRow | null
  mode?: 'edit' | 'duplicate'
  onClose: () => void
  onSaved: () => void
}) {
  const { user } = useAuth()
  const { accounts, loading: accountsLoading } = useAccounts(['income', 'expense', 'asset'])
  const isEdit = !!initial && mode === 'edit'

  const [direction, setDirection] = useState<BudgetDirection>((initial?.direction as BudgetDirection) ?? 'outflow')
  const [name, setName] = useState(initial?.name ?? '')
  const [accountId, setAccountId] = useState(initial?.account_id ?? '')
  const [frequency, setFrequency] = useState<BudgetFrequency>((initial?.frequency as BudgetFrequency) ?? 'monthly')
  const [startDate, setStartDate] = useState(initial?.start_date ?? todayLocalDateString())
  const [noEndDate, setNoEndDate] = useState(!initial?.end_date)
  const [endDate, setEndDate] = useState(initial?.end_date ?? '')
  const [amount, setAmount] = useState(initial ? String(satangToBaht(initial.amount_per_occurrence_satang)) : '')
  const [growthPercent, setGrowthPercent] = useState(initial ? String(initial.growth_percent_per_year) : '0')
  const [isActive, setIsActive] = useState(initial?.is_active ?? true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const filteredAccounts = accounts.filter((a) => a.type_id === BUDGET_DIRECTION_ACCOUNT_TYPE[direction])

  // เคลียร์ accountId เฉพาะตอนวี "เปลี่ยนทิศทางเอง" เท่านั้น — ไม่ใช่ตอน mount/ตอน accounts เพิ่งโหลดเสร็จ
  const prevDirection = useRef(direction)
  useEffect(() => {
    if (prevDirection.current === direction) return
    prevDirection.current = direction
    if (accountId && !filteredAccounts.some((a) => a.id === accountId)) setAccountId('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direction, accounts])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    setError(null)

    if (!accountId) {
      setError('กรุณาเลือกหมวด')
      return
    }
    const amountSatang = bahtToSatang(amount)
    if (amountSatang <= 0) {
      setError('กรุณากรอกจำนวนเงินมากกว่า 0')
      return
    }
    if (!noEndDate && endDate && endDate < startDate) {
      setError('วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่ม')
      return
    }

    setSubmitting(true)
    const payload = {
      user_id: user.id,
      name: name.trim() || null,
      account_id: accountId,
      direction,
      frequency,
      start_date: startDate,
      end_date: frequency === 'onetime' || noEndDate ? null : endDate || null,
      amount_per_occurrence_satang: amountSatang,
      growth_percent_per_year: Number(growthPercent) || 0,
      is_active: isActive,
    }

    const { error: saveError } = isEdit
      ? await supabase.from('budget_items').update(payload).eq('id', initial!.id)
      : await supabase.from('budget_items').insert(payload)

    setSubmitting(false)
    if (saveError) {
      setError(saveError.message)
      return
    }
    onSaved()
  }

  const handleDelete = async () => {
    if (!initial) return
    if (!confirm(`ลบรายการ "${initial.name || initial.accountName}"?`)) return
    setSubmitting(true)
    const { error: deleteError } = await supabase.from('budget_items').delete().eq('id', initial.id)
    setSubmitting(false)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    onSaved()
  }

  const title = isEdit ? 'แก้ไขรายการงบประมาณ' : mode === 'duplicate' ? 'ทำซ้ำรายการงบประมาณ' : 'เพิ่มรายการงบประมาณ'

  return (
    <Modal title={title} onClose={onClose}>
      {error && <div className="banner-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>ทิศทาง</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(Object.entries(BUDGET_DIRECTION_LABEL) as [BudgetDirection, string][]).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={direction === value ? 'btn' : 'btn-secondary btn'}
                style={{ flex: 1 }}
                onClick={() => setDirection(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="budgetItemAccount">หมวด</label>
          <select id="budgetItemAccount" required value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="" disabled>
              เลือกหมวด
            </option>
            {filteredAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="budgetItemFrequency">ความถี่</label>
          <select id="budgetItemFrequency" value={frequency} onChange={(e) => setFrequency(e.target.value as BudgetFrequency)}>
            {(Object.entries(BUDGET_FREQUENCY_LABEL) as [BudgetFrequency, string][]).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <div className="field-hint">
            {frequency === 'monthly'
              ? 'ลงยอดทุกเดือน เหมาะกับรายการสม่ำเสมอ เช่น เงินเดือน, ค่าอาหาร'
              : 'ลงเป็นก้อนเดียวในเดือนของ "วันที่เริ่ม" ด้านล่าง (ไม่เฉลี่ยเป็นรายเดือน)'}
          </div>
        </div>

        <div className="field">
          <label htmlFor="budgetItemAmount">จำนวนเงินต่อครั้ง (บาท)</label>
          <input
            id="budgetItemAmount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="budgetItemStartDate">วันที่เริ่ม</label>
          <input
            id="budgetItemStartDate"
            type="date"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <div className="field-hint">สำหรับความถี่ราย 3/6/12 เดือน เดือนของวันที่นี้คือเดือนที่ตกงวด</div>
        </div>

        {frequency !== 'onetime' && (
          <div className="field">
            <label htmlFor="budgetItemEndDate">วันที่สิ้นสุด</label>
            <div className="checkbox-field">
              <input
                id="budgetItemNoEndDate"
                type="checkbox"
                checked={noEndDate}
                onChange={(e) => setNoEndDate(e.target.checked)}
              />
              <label htmlFor="budgetItemNoEndDate">ไม่มีกำหนดจบ</label>
            </div>
            {!noEndDate && (
              <input id="budgetItemEndDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            )}
          </div>
        )}

        <details className="disclosure">
          <summary>ตัวเลือกเพิ่มเติม</summary>
          <div className="field">
            <label htmlFor="budgetItemName">ชื่อรายการ</label>
            <input
              id="budgetItemName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ไม่กรอก = ใช้ชื่อหมวดแทน"
            />
          </div>
          <div className="field">
            <label htmlFor="budgetItemGrowth">Growth (การเติบโต) %/ปี</label>
            <input
              id="budgetItemGrowth"
              type="number"
              inputMode="decimal"
              step="0.01"
              value={growthPercent}
              onChange={(e) => setGrowthPercent(e.target.value)}
            />
          </div>
          <div className="checkbox-field">
            <input id="budgetItemIsActive" type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <label htmlFor="budgetItemIsActive">ใช้งานอยู่ (นับรวมใน projection)</label>
          </div>
        </details>

        <div className="form-actions">
          <button type="submit" className="btn" disabled={submitting || accountsLoading}>
            {submitting ? 'กำลังบันทึก...' : accountsLoading ? 'กำลังโหลดหมวด...' : 'บันทึก'}
          </button>
        </div>
        {isEdit && (
          <button
            type="button"
            className="btn btn-danger btn-block"
            style={{ marginTop: 10 }}
            onClick={handleDelete}
            disabled={submitting}
          >
            ลบรายการ
          </button>
        )}
      </form>
    </Modal>
  )
}
