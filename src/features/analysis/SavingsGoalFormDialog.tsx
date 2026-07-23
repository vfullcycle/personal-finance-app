import { useState, type FormEvent } from 'react'
import { Modal } from '../../components/Modal'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { bahtToSatang, satangToBaht } from '../../lib/money'
import { useAccounts } from '../accounts/useAccounts'
import type { SavingsGoalRow } from './useSavingsGoals'

export function SavingsGoalFormDialog({
  initial,
  onClose,
  onSaved,
}: {
  initial: SavingsGoalRow | null
  onClose: () => void
  onSaved: () => void
}) {
  const { user } = useAuth()
  const { accounts } = useAccounts(['asset'])
  const isEdit = !!initial

  const [accountId, setAccountId] = useState(initial?.account_id ?? '')
  const [name, setName] = useState(initial?.name ?? '')
  const [targetAmount, setTargetAmount] = useState(initial ? String(satangToBaht(initial.target_amount)) : '')
  const [targetDate, setTargetDate] = useState(initial?.target_date ?? '')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    setError(null)

    if (!name.trim()) {
      setError('กรุณากรอกชื่อเป้าหมาย')
      return
    }
    if (!accountId) {
      setError('กรุณาเลือกบัญชีที่ใช้ติดตามความคืบหน้า')
      return
    }
    const targetAmountSatang = bahtToSatang(targetAmount)
    if (targetAmountSatang <= 0) {
      setError('กรุณากรอกจำนวนเงินเป้าหมายมากกว่า 0')
      return
    }

    setSubmitting(true)
    const payload = {
      user_id: user.id,
      account_id: accountId,
      name: name.trim(),
      target_amount: targetAmountSatang,
      target_date: targetDate || null,
    }

    const { error: saveError } = isEdit
      ? await supabase.from('savings_goals').update(payload).eq('id', initial.id)
      : await supabase.from('savings_goals').insert(payload)

    setSubmitting(false)
    if (saveError) {
      setError(saveError.message)
      return
    }
    onSaved()
  }

  const handleDelete = async () => {
    if (!initial) return
    if (!confirm(`ลบเป้าหมาย "${initial.name}"?`)) return
    setSubmitting(true)
    const { error: deleteError } = await supabase.from('savings_goals').delete().eq('id', initial.id)
    setSubmitting(false)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    onSaved()
  }

  return (
    <Modal title={isEdit ? 'แก้ไขเป้าหมายการออม' : 'ตั้งเป้าหมายการออม'} onClose={onClose}>
      {error && <div className="banner-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="goalName">ชื่อเป้าหมาย</label>
          <input id="goalName" required value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น เงินดาวน์บ้าน" />
        </div>

        <div className="field">
          <label htmlFor="goalAccount">บัญชีที่ใช้ติดตามความคืบหน้า</label>
          <select id="goalAccount" required value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="" disabled>
              เลือกบัญชีสินทรัพย์
            </option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <div className="field-hint">ความคืบหน้าอ่านจากยอดคงเหลือจริงของบัญชีนี้ เลือกบัญชีที่ใช้เก็บเงินสำหรับเป้าหมายนี้โดยเฉพาะ</div>
        </div>

        <div className="field">
          <label htmlFor="goalTargetAmount">จำนวนเงินเป้าหมาย (บาท)</label>
          <input
            id="goalTargetAmount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            required
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
          />
        </div>

        <details className="disclosure">
          <summary>ตัวเลือกเพิ่มเติม</summary>
          <div className="field">
            <label htmlFor="goalTargetDate">วันที่ต้องการให้ถึงเป้า</label>
            <input id="goalTargetDate" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
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
            ลบเป้าหมาย
          </button>
        )}
      </form>
    </Modal>
  )
}
