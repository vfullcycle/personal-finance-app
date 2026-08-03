import { useState, type FormEvent } from 'react'
import { Modal } from '../../components/Modal'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { archiveAccount, deleteAccountHard, isForeignKeyViolation, unarchiveAccount } from './accountActions'
import { INCOME_TYPE_LABEL, CASHFLOW_CLASS_LABEL, type AccountType, type IncomeType } from './constants'
import type { AccountRow } from './useAccounts'

const INCOME_TYPES = Object.keys(INCOME_TYPE_LABEL) as IncomeType[]

export function CategoryFormDialog({
  typeId,
  parentOptions,
  siblingAccounts,
  initial,
  onClose,
  onSaved,
}: {
  typeId: AccountType
  parentOptions: AccountRow[]
  siblingAccounts: AccountRow[]
  initial: AccountRow | null
  onClose: () => void
  onSaved: () => void
}) {
  const { user } = useAuth()
  const [name, setName] = useState(initial?.name ?? '')
  const [parentId, setParentId] = useState(initial?.parent_id ?? '')
  const [taxable, setTaxable] = useState(initial?.taxable ?? false)
  const [incomeType, setIncomeType] = useState<string>(initial?.income_type ?? '')
  const [cashflowClass, setCashflowClass] = useState<string>(initial?.cashflow_class ?? '')
  const [showMore, setShowMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const isEdit = !!initial
  // ลำดับชั้นจำกัด 2 ชั้น: บัญชีที่มี parent อยู่แล้วเป็นหมวดย่อย ห้ามเลือกเป็น parent ต่อ
  const eligibleParents = parentOptions.filter((p) => !p.parent_id && p.id !== initial?.id)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    setError(null)

    if (!name.trim()) {
      setError('กรุณากรอกชื่อหมวดหมู่')
      return
    }

    setSubmitting(true)

    // ต่อท้ายกลุ่มพี่น้องใหม่เสมอ (ไม่กระโดดมาต้น) — เฉพาะรายการใหม่ หรือย้ายไปคนละ parent
    const newParentId = parentId || null
    const parentChanged = isEdit && (initial.parent_id ?? null) !== newParentId
    const needsSortOrder = !isEdit || parentChanged
    const siblingSortOrder = needsSortOrder
      ? siblingAccounts
          .filter((a) => a.type_id === typeId && (a.parent_id ?? null) === newParentId)
          .reduce((max, a) => Math.max(max, a.sort_order), -1) + 1
      : undefined

    const payload = {
      user_id: user.id,
      type_id: typeId,
      name: name.trim(),
      parent_id: newParentId,
      ...(needsSortOrder ? { sort_order: siblingSortOrder } : {}),
      taxable: typeId === 'income' ? taxable : false,
      income_type: typeId === 'income' && taxable && incomeType ? incomeType : null,
      cashflow_class: typeId === 'expense' && cashflowClass ? cashflowClass : null,
    }

    const { error: saveError } = isEdit
      ? await supabase.from('accounts').update(payload).eq('id', initial.id)
      : await supabase.from('accounts').insert(payload)

    setSubmitting(false)
    if (saveError) {
      setError(saveError.message)
      return
    }
    onSaved()
  }

  const handleArchive = async () => {
    if (!initial) return
    setSubmitting(true)
    const { error: archiveError } = initial.is_active ? await archiveAccount(initial.id) : await unarchiveAccount(initial.id)
    setSubmitting(false)
    if (archiveError) {
      setError(archiveError.message)
      return
    }
    onSaved()
  }

  const handleDelete = async () => {
    if (!initial) return
    if (!confirm(`ลบหมวดหมู่ "${initial.name}" ถาวร?`)) return
    setSubmitting(true)
    const { error: deleteError } = await deleteAccountHard(initial.id)
    setSubmitting(false)
    if (deleteError) {
      if (isForeignKeyViolation(deleteError)) {
        setError('ลบไม่ได้เพราะมีรายการผูกอยู่ ใช้การปิดหมวดหมู่แทน')
      } else {
        setError(deleteError.message)
      }
      return
    }
    onSaved()
  }

  return (
    <Modal title={isEdit ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่'} onClose={onClose}>
      {error && <div className="banner-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="name">ชื่อหมวดหมู่</label>
          <input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        {eligibleParents.length > 0 && (
          <div className="field">
            <label htmlFor="parent">หมวดแม่ (ถ้ามี)</label>
            <select id="parent" value={parentId} onChange={(e) => setParentId(e.target.value)}>
              <option value="">— ไม่มี (เป็นหมวดหลัก) —</option>
              {eligibleParents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {(typeId === 'income' || typeId === 'expense') && (
          <details className="disclosure" open={showMore} onToggle={(e) => setShowMore(e.currentTarget.open)}>
            <summary>ตัวเลือกเพิ่มเติม</summary>

            {typeId === 'income' && (
              <>
                <div className="checkbox-field">
                  <input
                    id="taxable"
                    type="checkbox"
                    checked={taxable}
                    onChange={(e) => setTaxable(e.target.checked)}
                  />
                  <label htmlFor="taxable">ต้องเสียภาษี</label>
                </div>
                {taxable && (
                  <div className="field">
                    <label htmlFor="incomeType">ประเภทเงินได้</label>
                    <select id="incomeType" value={incomeType} onChange={(e) => setIncomeType(e.target.value)}>
                      <option value="">— เลือกประเภท —</option>
                      {INCOME_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {INCOME_TYPE_LABEL[t]}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}

            {typeId === 'expense' && (
              <div className="field">
                <label htmlFor="cashflowClass">ประเภทรายจ่าย (สำหรับวิเคราะห์)</label>
                <select id="cashflowClass" value={cashflowClass} onChange={(e) => setCashflowClass(e.target.value)}>
                  <option value="">— ไม่ระบุ —</option>
                  <option value="fixed">{CASHFLOW_CLASS_LABEL.fixed}</option>
                  <option value="variable">{CASHFLOW_CLASS_LABEL.variable}</option>
                </select>
              </div>
            )}
          </details>
        )}

        <div className="form-actions">
          {isEdit && (
            <button type="button" className="btn btn-secondary" onClick={handleArchive} disabled={submitting}>
              {initial.is_active ? 'ปิดหมวดหมู่' : 'เปิดใช้งานอีกครั้ง'}
            </button>
          )}
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
            ลบถาวร
          </button>
        )}
      </form>
    </Modal>
  )
}
