import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Modal } from '../../components/Modal'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { bahtToSatang, satangToBaht } from '../../lib/money'
import { todayLocalDateString } from '../../lib/date'
import { useAccounts } from '../accounts/useAccounts'
import { calculateInstallmentSplit, hasLoanTerms, loanTermsFromAccount } from '../accounts/loanAmortization'
import { AccountSelect } from './AccountSelect'
import { CategorySelect } from './CategorySelect'
import { SplitLines, newSplitLine, type SplitLine } from './SplitLines'
import { TagPicker } from './TagPicker'
import { buildDebtPaymentLegs, buildExpenseLegs, buildIncomeLegs, buildTransferLegs } from './legBuilder'
import { FLOW_LABEL, type FlowType } from './types'
import { detectFlow, type TransactionDetail } from './useTransactions'
import { emitTransactionsChanged } from './events'

function splitFromLegs(legs: TransactionDetail['legs'], typeId: string, signPositive: boolean): SplitLine[] {
  const matched = legs.filter((l) => l.account.type_id === typeId)
  if (matched.length === 0) return [newSplitLine()]
  return matched.map((l) => ({
    id: crypto.randomUUID(),
    accountId: l.account_id,
    amount: String(satangToBaht(signPositive ? l.amount : -l.amount)),
    note: l.note ?? '',
  }))
}

export function TransactionFormDialog({
  flow: flowProp,
  initial,
  mode = 'edit',
  onClose,
  onSaved,
}: {
  flow: FlowType
  initial: TransactionDetail | null
  mode?: 'edit' | 'duplicate'
  onClose: () => void
  onSaved: () => void
}) {
  const { user } = useAuth()
  const isEdit = !!initial && mode === 'edit'
  const flow = initial ? detectFlow(initial.legs) : flowProp

  const { accounts: assetLiabilityAccounts } = useAccounts(['asset', 'liability'])
  const { accounts: incomeCategories } = useAccounts(['income'])
  const { accounts: expenseCategories } = useAccounts(['expense'])
  const assetAccounts = useMemo(() => assetLiabilityAccounts.filter((a) => a.type_id === 'asset'), [assetLiabilityAccounts])

  const [occurredOn, setOccurredOn] = useState(mode === 'duplicate' ? todayLocalDateString() : (initial?.occurred_on ?? todayLocalDateString()))
  const [payee, setPayee] = useState(initial?.payee ?? '')
  const [note, setNote] = useState(initial?.note ?? '')
  const [tagIds, setTagIds] = useState<string[]>(initial?.tagIds ?? [])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [primaryAccountId, setPrimaryAccountId] = useState(() => {
    if (!initial) return ''
    const categoryTypeId = flow === 'income' ? 'income' : 'expense'
    const primaryLeg = initial.legs.find((l) => l.account.type_id !== categoryTypeId)
    return primaryLeg?.account_id ?? ''
  })
  const [splits, setSplits] = useState<SplitLine[]>(() => {
    if (!initial || flow === 'transfer') return [newSplitLine()]
    return splitFromLegs(initial.legs, flow === 'income' ? 'income' : 'expense', flow === 'expense')
  })

  const destAccountInitial = useMemo(() => {
    if (!initial || flow !== 'transfer') return null
    return initial.legs.find((l) => l.amount > 0 && l.account.type_id !== 'expense') ?? null
  }, [initial, flow])
  const sourceLegInitial = useMemo(() => {
    if (!initial || flow !== 'transfer') return null
    return initial.legs.find((l) => l.amount < 0) ?? null
  }, [initial, flow])
  const interestLegInitial = useMemo(() => {
    if (!initial || flow !== 'transfer') return null
    return initial.legs.find((l) => l.account.type_id === 'expense') ?? null
  }, [initial, flow])

  const [transferSourceId, setTransferSourceId] = useState(sourceLegInitial?.account_id ?? '')
  const [transferDestId, setTransferDestId] = useState(destAccountInitial?.account_id ?? '')
  const [transferAmount, setTransferAmount] = useState(
    destAccountInitial && !interestLegInitial ? String(satangToBaht(destAccountInitial.amount)) : '',
  )
  const [principal, setPrincipal] = useState(destAccountInitial && interestLegInitial ? String(satangToBaht(destAccountInitial.amount)) : '')
  const [interest, setInterest] = useState(interestLegInitial ? String(satangToBaht(interestLegInitial.amount)) : '')
  const [interestCategoryId, setInterestCategoryId] = useState(interestLegInitial?.account_id ?? '')
  const [debtAmountsEdited, setDebtAmountsEdited] = useState(false)

  const destAccount = assetLiabilityAccounts.find((a) => a.id === transferDestId)
  const isDebtPayment = destAccount?.subtype === 'loan'

  // expenseCategories โหลดแบบ async — ตั้งหมวดดอกเบี้ยเริ่มต้นทันทีที่ข้อมูลพร้อม (ตอน useState เริ่มต้น รายการยังว่างเสมอ)
  useEffect(() => {
    if (!isEdit && !interestCategoryId && isDebtPayment && expenseCategories.length > 0) {
      const def = expenseCategories.find((c) => c.name === 'ดอกเบี้ยเงินกู้')
      if (def) setInterestCategoryId(def.id)
    }
  }, [isEdit, interestCategoryId, isDebtPayment, expenseCategories])

  // เลือกบัญชีเงินกู้ปลายทางใหม่ — เริ่มนับ auto-fill ใหม่ (เผื่อผู้ใช้เคยแก้มือของบัญชีเดิมมาก่อน)
  useEffect(() => {
    setDebtAmountsEdited(false)
  }, [transferDestId])

  // ถ้าบัญชีเงินกู้ตั้งค่าเงินกู้ครบ (ยอดกู้/ดอกเบี้ย/ระยะเวลา/วันเริ่ม) คำนวณเงินต้น/ดอกเบี้ยงวดนี้ให้อัตโนมัติ
  // ไม่ทับค่าที่ผู้ใช้แก้มือแล้ว (debtAmountsEdited) และไม่ทำตอนแก้ไขรายการเก่า (isEdit — ต้องคงค่าที่บันทึกไว้จริง)
  useEffect(() => {
    if (isEdit || !isDebtPayment || debtAmountsEdited || !destAccount || !hasLoanTerms(destAccount)) return
    const result = calculateInstallmentSplit(loanTermsFromAccount(destAccount), occurredOn)
    if (result) {
      setPrincipal(String(satangToBaht(result.principal)))
      setInterest(String(satangToBaht(result.interest)))
    }
  }, [isEdit, isDebtPayment, debtAmountsEdited, destAccount, occurredOn])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    setError(null)

    let legs
    if (flow === 'income' || flow === 'expense') {
      if (!primaryAccountId) {
        setError(flow === 'income' ? 'กรุณาเลือกบัญชีที่รับเงิน' : 'กรุณาเลือกบัญชีที่จ่ายเงิน')
        return
      }
      const parsed = splits.map((s) => ({ accountId: s.accountId, amount: bahtToSatang(s.amount), note: s.note.trim() || null }))
      if (parsed.some((s) => !s.accountId || s.amount <= 0)) {
        setError('กรุณากรอกหมวดหมู่และจำนวนเงินให้ครบทุกบรรทัด (จำนวนเงินต้องมากกว่า 0)')
        return
      }
      legs = flow === 'income' ? buildIncomeLegs(primaryAccountId, parsed) : buildExpenseLegs(primaryAccountId, parsed)
    } else {
      if (!transferSourceId || !transferDestId) {
        setError('กรุณาเลือกบัญชีต้นทางและปลายทาง')
        return
      }
      if (transferSourceId === transferDestId) {
        setError('บัญชีต้นทางและปลายทางต้องไม่ใช่บัญชีเดียวกัน')
        return
      }
      if (isDebtPayment) {
        const p = bahtToSatang(principal)
        const i = bahtToSatang(interest)
        if (p <= 0 && i <= 0) {
          setError('กรุณากรอกเงินต้นหรือดอกเบี้ยอย่างน้อยหนึ่งช่อง')
          return
        }
        if (i > 0 && !interestCategoryId) {
          setError('กรุณาเลือกหมวดดอกเบี้ย')
          return
        }
        legs = buildDebtPaymentLegs(transferSourceId, transferDestId, interestCategoryId, p, i)
      } else {
        const amt = bahtToSatang(transferAmount)
        if (amt <= 0) {
          setError('กรุณากรอกจำนวนเงิน')
          return
        }
        legs = buildTransferLegs(transferSourceId, transferDestId, amt)
      }
    }

    setSubmitting(true)

    if (isEdit && initial) {
      await supabase.from('transaction_legs').delete().eq('transaction_id', initial.id)
      await supabase.from('transaction_tags').delete().eq('transaction_id', initial.id)
    }

    const header = {
      user_id: user.id,
      occurred_on: occurredOn,
      payee: payee.trim() || null,
      note: note.trim() || null,
    }

    const { data: txn, error: txnError } =
      isEdit && initial
        ? await supabase.from('transactions').update(header).eq('id', initial.id).select().single()
        : await supabase.from('transactions').insert(header).select().single()

    if (txnError || !txn) {
      setSubmitting(false)
      setError(txnError?.message ?? 'บันทึกไม่สำเร็จ')
      return
    }

    const { error: legsError } = await supabase
      .from('transaction_legs')
      .insert(legs.map((l) => ({ ...l, transaction_id: txn.id, user_id: user.id })))

    if (legsError) {
      setSubmitting(false)
      setError(legsError.message)
      return
    }

    if (tagIds.length > 0) {
      await supabase.from('transaction_tags').insert(tagIds.map((tagId) => ({ transaction_id: txn.id, tag_id: tagId, user_id: user.id })))
    }

    setSubmitting(false)
    emitTransactionsChanged()
    onSaved()
  }

  const handleDelete = async () => {
    if (!initial) return
    if (!confirm('ลบรายการนี้ถาวร?')) return
    setSubmitting(true)
    const { error: deleteError } = await supabase.from('transactions').delete().eq('id', initial.id)
    setSubmitting(false)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    emitTransactionsChanged()
    onSaved()
  }

  const primaryCategories = flow === 'income' ? incomeCategories : expenseCategories

  return (
    <Modal title={isEdit ? `แก้ไข${FLOW_LABEL[flow]}` : mode === 'duplicate' ? `ทำซ้ำ${FLOW_LABEL[flow]}` : FLOW_LABEL[flow]} onClose={onClose}>
      {error && <div className="banner-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="occurredOn">วันที่</label>
          <input id="occurredOn" type="date" required value={occurredOn} onChange={(e) => setOccurredOn(e.target.value)} />
        </div>

        {(flow === 'income' || flow === 'expense') && (
          <>
            <div className="field">
              <label htmlFor="primaryAccount">{flow === 'income' ? 'เข้าบัญชี' : 'จ่ายจากบัญชี'}</label>
              <AccountSelect
                id="primaryAccount"
                accounts={flow === 'income' ? assetAccounts : assetLiabilityAccounts}
                value={primaryAccountId}
                onChange={setPrimaryAccountId}
                required
              />
            </div>
            <SplitLines lines={splits} categories={primaryCategories} onChange={setSplits} />
          </>
        )}

        {flow === 'transfer' && (
          <>
            <div className="field">
              <label htmlFor="transferSource">จากบัญชี</label>
              <AccountSelect id="transferSource" accounts={assetLiabilityAccounts} value={transferSourceId} onChange={setTransferSourceId} required />
            </div>
            <div className="field">
              <label htmlFor="transferDest">ไปบัญชี</label>
              <AccountSelect id="transferDest" accounts={assetLiabilityAccounts} value={transferDestId} onChange={setTransferDestId} required />
            </div>

            {isDebtPayment ? (
              <>
                <div className="banner-info">
                  {destAccount && hasLoanTerms(destAccount)
                    ? 'คำนวณเงินต้น/ดอกเบี้ยงวดนี้ให้อัตโนมัติจากยอดกู้ที่ตั้งไว้ในบัญชี — แก้ตัวเลขทับได้ถ้าไม่ตรงกับ statement'
                    : 'ปลายทางเป็นบัญชีเงินกู้ — แยกเงินต้น/ดอกเบี้ยให้อัตโนมัติ (ตามกฎการคำนวณ net worth) — ไปตั้งค่าเงินกู้ที่หน้าบัญชีเพื่อให้ระบบคำนวณให้เอง'}
                </div>
                <div className="field">
                  <label htmlFor="principal">เงินต้น (บาท)</label>
                  <input
                    id="principal"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={principal}
                    onChange={(e) => {
                      setPrincipal(e.target.value)
                      setDebtAmountsEdited(true)
                    }}
                  />
                </div>
                <div className="field">
                  <label htmlFor="interest">ดอกเบี้ย (บาท)</label>
                  <input
                    id="interest"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={interest}
                    onChange={(e) => {
                      setInterest(e.target.value)
                      setDebtAmountsEdited(true)
                    }}
                  />
                </div>
                <div className="field">
                  <label htmlFor="interestCategory">หมวดดอกเบี้ย</label>
                  <CategorySelect id="interestCategory" accounts={expenseCategories} value={interestCategoryId} onChange={setInterestCategoryId} />
                </div>
              </>
            ) : (
              <div className="field">
                <label htmlFor="transferAmount">จำนวนเงิน (บาท)</label>
                <input
                  id="transferAmount"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  required
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                />
              </div>
            )}
          </>
        )}

        <details className="disclosure">
          <summary>ตัวเลือกเพิ่มเติม</summary>
          <div className="field">
            <label htmlFor="payee">ผู้รับ/ผู้จ่าย (payee)</label>
            <input id="payee" value={payee} onChange={(e) => setPayee(e.target.value)} placeholder="เช่น 7-Eleven" />
          </div>
          <div className="field">
            <label htmlFor="note">โน้ต</label>
            <input id="note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <TagPicker selected={tagIds} onChange={setTagIds} />
        </details>

        <div className="form-actions">
          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
        {isEdit && (
          <button type="button" className="btn btn-danger btn-block" style={{ marginTop: 10 }} onClick={handleDelete} disabled={submitting}>
            ลบถาวร
          </button>
        )}
      </form>
    </Modal>
  )
}
