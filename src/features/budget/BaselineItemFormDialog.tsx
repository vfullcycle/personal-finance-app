import { useState, type FormEvent } from 'react'
import { Modal } from '../../components/Modal'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { bahtToSatang, satangToBaht } from '../../lib/money'
import { useAccounts } from '../accounts/useAccounts'
import { BUDGET_PERIOD_LABEL, type BudgetPeriod } from './types'
import type { BudgetBaselineRow } from './useBudgetBaseline'

export function BaselineItemFormDialog({
  initial,
  onClose,
  onSaved,
}: {
  initial: BudgetBaselineRow | null
  onClose: () => void
  onSaved: () => void
}) {
  const { user } = useAuth()
  const { accounts } = useAccounts(['income', 'expense', 'asset'])
  const isEdit = !!initial

  const incomeAccounts = accounts.filter((a) => a.type_id === 'income')
  const expenseAccounts = accounts.filter((a) => a.type_id === 'expense')
  const savingsAccounts = accounts.filter((a) => a.type_id === 'asset' && a.cashflow_class === 'savings')

  const [accountId, setAccountId] = useState(initial?.account_id ?? '')
  const [amount, setAmount] = useState(initial ? String(satangToBaht(initial.amount_per_period_satang)) : '')
  const [period, setPeriod] = useState<BudgetPeriod>((initial?.period as BudgetPeriod) ?? 'month')
  const [growthPercent, setGrowthPercent] = useState(initial ? String(initial.growth_percent_per_year) : '0')
  const [isActive, setIsActive] = useState(initial?.is_active ?? true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

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

    setSubmitting(true)
    const payload = {
      user_id: user.id,
      account_id: accountId,
      amount_per_period_satang: amountSatang,
      period,
      growth_percent_per_year: Number(growthPercent) || 0,
      is_active: isActive,
    }

    const { error: saveError } = isEdit
      ? await supabase.from('budget_baseline_items').update(payload).eq('id', initial.id)
      : await supabase.from('budget_baseline_items').insert(payload)

    setSubmitting(false)
    if (saveError) {
      setError(saveError.message)
      return
    }
    onSaved()
  }

  const handleDelete = async () => {
    if (!initial) return
    if (!confirm(`ลบรายการ "${initial.accountName}"?`)) return
    setSubmitting(true)
    const { error: deleteError } = await supabase.from('budget_baseline_items').delete().eq('id', initial.id)
    setSubmitting(false)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    onSaved()
  }

  return (
    <Modal title={isEdit ? 'แก้ไขรายการงบประจำ' : 'เพิ่มรายการงบประจำ'} onClose={onClose}>
      {error && <div className="banner-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="baselineAccount">หมวด</label>
          <select id="baselineAccount" required value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="" disabled>
              เลือกหมวด
            </option>
            {incomeAccounts.length > 0 && (
              <optgroup label="รายรับ">
                {incomeAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </optgroup>
            )}
            {expenseAccounts.length > 0 && (
              <optgroup label="รายจ่าย">
                {expenseAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </optgroup>
            )}
            {savingsAccounts.length > 0 && (
              <optgroup label="เงินออม/ลงทุน">
                {savingsAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          <div className="field-hint">รายจ่ายเพื่อการออมอยู่ในกลุ่ม "เงินออม/ลงทุน" (โยกเข้าสินทรัพย์ ไม่ใช่ค่าใช้จ่าย)</div>
        </div>

        <div className="field">
          <label htmlFor="baselineAmount">จำนวนเงิน (บาท)</label>
          <input
            id="baselineAmount"
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
          <label htmlFor="baselinePeriod">ความถี่</label>
          <select id="baselinePeriod" value={period} onChange={(e) => setPeriod(e.target.value as BudgetPeriod)}>
            {(Object.entries(BUDGET_PERIOD_LABEL) as [BudgetPeriod, string][]).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <details className="disclosure">
          <summary>ตัวเลือกเพิ่มเติม</summary>
          <div className="field">
            <label htmlFor="baselineGrowth">Growth (การเติบโต) %/ปี</label>
            <input
              id="baselineGrowth"
              type="number"
              inputMode="decimal"
              step="0.01"
              value={growthPercent}
              onChange={(e) => setGrowthPercent(e.target.value)}
            />
          </div>
          <div className="checkbox-field">
            <input id="baselineIsActive" type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <label htmlFor="baselineIsActive">ใช้งานอยู่ (นับรวมใน projection)</label>
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
