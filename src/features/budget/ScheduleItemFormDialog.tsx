import { useEffect, useState, type FormEvent } from 'react'
import { Modal } from '../../components/Modal'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { bahtToSatang, satangToBaht } from '../../lib/money'
import { useAccounts } from '../accounts/useAccounts'
import {
  BUDGET_DIRECTION_ACCOUNT_TYPE,
  BUDGET_DIRECTION_LABEL,
  BUDGET_FREQUENCY_LABEL,
  MONTH_LABEL_TH,
  type BudgetDirection,
  type BudgetFrequency,
} from './types'
import type { BudgetScheduleRow } from './useBudgetSchedule'

const currentBEYear = () => new Date().getFullYear() + 543
const currentMonth = () => new Date().getMonth() + 1

export function ScheduleItemFormDialog({
  initial,
  onClose,
  onSaved,
}: {
  initial: BudgetScheduleRow | null
  onClose: () => void
  onSaved: () => void
}) {
  const { user } = useAuth()
  const { accounts } = useAccounts(['income', 'expense', 'asset'])
  const isEdit = !!initial

  const [direction, setDirection] = useState<BudgetDirection>((initial?.direction as BudgetDirection) ?? 'outflow')
  const [name, setName] = useState(initial?.name ?? '')
  const [accountId, setAccountId] = useState(initial?.account_id ?? '')
  const [frequency, setFrequency] = useState<BudgetFrequency>((initial?.frequency as BudgetFrequency) ?? 'monthly')
  const [yearStart, setYearStart] = useState(String(initial?.year_start ?? currentBEYear()))
  const [yearEnd, setYearEnd] = useState(String(initial?.year_end ?? currentBEYear()))
  const [amount, setAmount] = useState(initial ? String(satangToBaht(initial.amount_per_occurrence_satang)) : '')
  const [growthPercent, setGrowthPercent] = useState(initial ? String(initial.growth_percent_per_year) : '0')
  const [startMonth, setStartMonth] = useState<string>(String(initial?.start_month ?? currentMonth()))
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const filteredAccounts = accounts.filter((a) => a.type_id === BUDGET_DIRECTION_ACCOUNT_TYPE[direction])

  // เปลี่ยนทิศทางแล้วบัญชีเดิมไม่ตรง type อีกต่อไป — เคลียร์ทิ้งกันส่งค่าที่ผ่าน constraint DB ไม่ได้
  useEffect(() => {
    if (accountId && !filteredAccounts.some((a) => a.id === accountId)) setAccountId('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direction, accounts])

  // ครั้งเดียว = เกิดปีเดียว บังคับ year_end ให้เท่ากับ year_start เสมอ
  useEffect(() => {
    if (frequency === 'onetime') setYearEnd(yearStart)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frequency, yearStart])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    setError(null)

    if (!name.trim()) {
      setError('กรุณากรอกชื่อรายการ')
      return
    }
    if (!accountId) {
      setError('กรุณาเลือกหมวด')
      return
    }
    const amountSatang = bahtToSatang(amount)
    if (amountSatang <= 0) {
      setError('กรุณากรอกจำนวนเงินมากกว่า 0')
      return
    }
    const ys = Number(yearStart)
    const ye = frequency === 'onetime' ? ys : Number(yearEnd)
    if (ye < ys) {
      setError('ปีสิ้นสุดต้องไม่น้อยกว่าปีเริ่ม')
      return
    }

    setSubmitting(true)
    const payload = {
      user_id: user.id,
      name: name.trim(),
      account_id: accountId,
      direction,
      frequency,
      year_start: ys,
      year_end: ye,
      amount_per_occurrence_satang: amountSatang,
      growth_percent_per_year: Number(growthPercent) || 0,
      start_month: startMonth ? Number(startMonth) : null,
    }

    const { error: saveError } = isEdit
      ? await supabase.from('budget_schedule_items').update(payload).eq('id', initial.id)
      : await supabase.from('budget_schedule_items').insert(payload)

    setSubmitting(false)
    if (saveError) {
      setError(saveError.message)
      return
    }
    onSaved()
  }

  const handleDelete = async () => {
    if (!initial) return
    if (!confirm(`ลบรายการ "${initial.name}"?`)) return
    setSubmitting(true)
    const { error: deleteError } = await supabase.from('budget_schedule_items').delete().eq('id', initial.id)
    setSubmitting(false)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    onSaved()
  }

  return (
    <Modal title={isEdit ? 'แก้ไขแผนกำหนดการ' : 'เพิ่มแผนกำหนดการ'} onClose={onClose}>
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
          <label htmlFor="scheduleName">ชื่อรายการ</label>
          <input
            id="scheduleName"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="เช่น เบี้ยประกันชีวิต"
          />
        </div>

        <div className="field">
          <label htmlFor="scheduleAccount">หมวด</label>
          <select id="scheduleAccount" required value={accountId} onChange={(e) => setAccountId(e.target.value)}>
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
          <label htmlFor="scheduleFrequency">ความถี่</label>
          <select id="scheduleFrequency" value={frequency} onChange={(e) => setFrequency(e.target.value as BudgetFrequency)}>
            {(Object.entries(BUDGET_FREQUENCY_LABEL) as [BudgetFrequency, string][]).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="field" style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="scheduleYearStart">ปีเริ่ม (พ.ศ.)</label>
            <input
              id="scheduleYearStart"
              type="number"
              required
              value={yearStart}
              onChange={(e) => setYearStart(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="scheduleYearEnd">ปีจบ (พ.ศ.)</label>
            <input
              id="scheduleYearEnd"
              type="number"
              required
              disabled={frequency === 'onetime'}
              value={frequency === 'onetime' ? yearStart : yearEnd}
              onChange={(e) => setYearEnd(e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="scheduleAmount">จำนวนเงินต่อครั้ง (บาท)</label>
          <input
            id="scheduleAmount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <details className="disclosure">
          <summary>ตัวเลือกเพิ่มเติม</summary>
          <div className="field">
            <label htmlFor="scheduleGrowth">Growth (การเติบโต) %/ปี</label>
            <input
              id="scheduleGrowth"
              type="number"
              inputMode="decimal"
              step="0.01"
              value={growthPercent}
              onChange={(e) => setGrowthPercent(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="scheduleStartMonth">เดือนเริ่มงวด</label>
            <select id="scheduleStartMonth" value={startMonth} onChange={(e) => setStartMonth(e.target.value)}>
              {MONTH_LABEL_TH.map((label, idx) => (
                <option key={label} value={idx + 1}>
                  {label}
                </option>
              ))}
            </select>
            <div className="field-hint">ใช้ระบุว่างวดตกเดือนไหนตอนแสดงจอรายเดือน</div>
          </div>
        </details>

        <div className="form-actions">
          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? 'กำลังบันทึก...' : 'บันทึก'}
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
