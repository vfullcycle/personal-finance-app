import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Modal } from '../../components/Modal'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { bahtToSatang, satangToBaht } from '../../lib/money'
import { todayLocalDateString } from '../../lib/date'
import { useAccounts } from '../accounts/useAccounts'
import { calculateInstallmentSplit, hasLoanTerms, loanFinalInstallmentDate, loanTermsFromAccount } from '../accounts/loanAmortization'
import { AccountSelect } from './AccountSelect'
import { CategorySelect } from './CategorySelect'
import { buildDebtPaymentTemplate, buildExpenseTemplate, buildIncomeTemplate, buildTransferTemplate } from './recurringLegBuilder'
import { AMOUNT_MODE_LABEL, FLOW_LABEL, FREQUENCY_LABEL, type AmountMode, type FlowType, type Frequency } from './types'
import { deleteRecurring, detectRecurringFlow, type RecurringDetail } from './useRecurring'

const FREQUENCIES: Frequency[] = ['monthly', 'quarterly', 'semiannual', 'annual']
const AMOUNT_MODES: AmountMode[] = ['fixed', 'variable']

export function RecurringFormDialog({
  flow: flowProp,
  initial,
  onClose,
  onSaved,
}: {
  flow: FlowType
  initial: RecurringDetail | null
  onClose: () => void
  onSaved: () => void
}) {
  const { user } = useAuth()
  const isEdit = !!initial
  const flow = initial ? detectRecurringFlow(initial.legs) : flowProp

  const { accounts: assetLiabilityAccounts } = useAccounts(['asset', 'liability'])
  const { accounts: incomeCategories } = useAccounts(['income'])
  const { accounts: expenseCategories } = useAccounts(['expense'])
  const assetAccounts = useMemo(() => assetLiabilityAccounts.filter((a) => a.type_id === 'asset'), [assetLiabilityAccounts])

  const primaryLeg = initial?.legs.find((l) => l.account.type_id !== 'income' && l.account.type_id !== 'expense') ?? null
  const categoryLeg = initial?.legs.find((l) => l.account.type_id === (flow === 'income' ? 'income' : 'expense')) ?? null
  const destLeg = initial?.legs.find((l) => l.sign === 1 && l.account.type_id !== 'expense') ?? null
  const sourceLeg = initial?.legs.find((l) => l.sign === -1) ?? null
  const interestLeg = initial?.legs.find((l) => l.account.type_id === 'expense') ?? null

  const [primaryAccountId, setPrimaryAccountId] = useState(primaryLeg?.account_id ?? '')
  const [categoryId, setCategoryId] = useState(categoryLeg?.account_id ?? '')
  const [transferSourceId, setTransferSourceId] = useState(sourceLeg?.account_id ?? '')
  const [transferDestId, setTransferDestId] = useState(destLeg?.account_id ?? '')
  const [principal, setPrincipal] = useState(destLeg && interestLeg ? String(satangToBaht(destLeg.amount ?? 0)) : '')
  const [interest, setInterest] = useState(interestLeg ? String(satangToBaht(interestLeg.amount ?? 0)) : '')
  const [interestCategoryId, setInterestCategoryId] = useState(interestLeg?.account_id ?? '')
  const [amountMode, setAmountMode] = useState<AmountMode>((initial?.amount_mode as AmountMode) ?? 'fixed')
  const [amount, setAmount] = useState(() => {
    if (!initial) return ''
    if (flow === 'transfer' && interestLeg) return ''
    const leg = flow === 'transfer' ? destLeg : categoryLeg
    return leg?.amount != null ? String(satangToBaht(leg.amount)) : ''
  })
  const [frequency, setFrequency] = useState<Frequency>((initial?.frequency as Frequency) ?? 'monthly')
  const [startDate, setStartDate] = useState(initial?.start_date ?? todayLocalDateString())
  const [endDate, setEndDate] = useState(initial?.end_date ?? '')
  const [autoPost, setAutoPost] = useState(initial?.auto_post ?? false)
  const [payee, setPayee] = useState(initial?.payee ?? '')
  const [note, setNote] = useState(initial?.note ?? '')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const destAccount = assetLiabilityAccounts.find((a) => a.id === transferDestId)
  const isDebtPayment = flow === 'transfer' && destAccount?.subtype === 'loan'
  // มีข้อมูลตั้งค่าเงินกู้ครบ -> ให้ระบบคำนวณเงินต้น/ดอกเบี้ยทุกงวดเองตอน post จริง (ดู useDueRecurring/ConfirmRecurringDialog)
  // ไม่ต้องให้ผู้ใช้กรอกเอง — ค่าที่ template เก็บตรงนี้เป็นแค่ค่าอ้างอิงตั้งต้น (งวดแรก)
  const loanTermsReady = isDebtPayment && !!destAccount && hasLoanTerms(destAccount)
  const previewSplit = loanTermsReady ? calculateInstallmentSplit(loanTermsFromAccount(destAccount!), startDate) : null

  useEffect(() => {
    if (isDebtPayment && amountMode !== 'fixed') setAmountMode('fixed')
  }, [isDebtPayment, amountMode])

  useEffect(() => {
    if (amountMode === 'variable' && autoPost) setAutoPost(false)
  }, [amountMode, autoPost])

  // expenseCategories โหลดแบบ async — ตั้งหมวดดอกเบี้ยเริ่มต้นทันทีที่ข้อมูลพร้อม (ตอน useState เริ่มต้น รายการยังว่างเสมอ)
  useEffect(() => {
    if (!isEdit && !interestCategoryId && isDebtPayment && expenseCategories.length > 0) {
      const def = expenseCategories.find((c) => c.name === 'ดอกเบี้ยเงินกู้')
      if (def) setInterestCategoryId(def.id)
    }
  }, [isEdit, interestCategoryId, isDebtPayment, expenseCategories])

  // sync ค่าอ้างอิงตั้งต้นในฟอร์มกับตัวเลขที่คำนวณได้ (เฉพาะตอนสร้างใหม่ ไม่ทับตอนแก้ไขรายการเดิม)
  // depend เฉพาะตัวเลข ไม่ใช่ทั้ง object เพราะ previewSplit เป็น literal object ใหม่ทุก render
  useEffect(() => {
    if (!isEdit && loanTermsReady && previewSplit) {
      setPrincipal(String(satangToBaht(previewSplit.principal)))
      setInterest(String(satangToBaht(previewSplit.interest)))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, loanTermsReady, previewSplit?.principal, previewSplit?.interest])

  // เสนอ "สิ้นสุดวันที่" = งวดสุดท้ายของสัญญาให้อัตโนมัติ กันลืมปิดรายการหลังผ่อนครบ
  // (ระบบไม่หยุด auto-post เองถ้าไม่ตั้ง end_date — ดู useDueRecurring) ผู้ใช้ยังแก้ทับเองได้เสมอ
  useEffect(() => {
    if (!isEdit && loanTermsReady && !endDate && destAccount && hasLoanTerms(destAccount)) {
      setEndDate(loanFinalInstallmentDate(loanTermsFromAccount(destAccount)))
    }
  }, [isEdit, loanTermsReady, endDate, destAccount])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    setError(null)

    if (endDate && endDate < startDate) {
      setError('วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่ม')
      return
    }

    let template
    if (flow === 'income' || flow === 'expense') {
      if (!primaryAccountId || !categoryId) {
        setError('กรุณาเลือกบัญชีและหมวดหมู่')
        return
      }
      let amt: number | null = null
      if (amountMode === 'fixed') {
        amt = bahtToSatang(amount)
        if (amt <= 0) {
          setError('กรุณากรอกจำนวนเงิน')
          return
        }
      }
      template = flow === 'income' ? buildIncomeTemplate(primaryAccountId, categoryId, amt) : buildExpenseTemplate(primaryAccountId, categoryId, amt)
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
        template = buildDebtPaymentTemplate(transferSourceId, transferDestId, interestCategoryId || null, p, i)
      } else {
        let amt: number | null = null
        if (amountMode === 'fixed') {
          amt = bahtToSatang(amount)
          if (amt <= 0) {
            setError('กรุณากรอกจำนวนเงิน')
            return
          }
        }
        template = buildTransferTemplate(transferSourceId, transferDestId, amt)
      }
    }

    setSubmitting(true)

    if (isEdit && initial) {
      await supabase.from('recurring_transaction_legs').delete().eq('recurring_transaction_id', initial.id)
    }

    const header = {
      user_id: user.id,
      flow_type: flow,
      frequency,
      amount_mode: isDebtPayment ? 'fixed' : amountMode,
      auto_post: !isDebtPayment && amountMode === 'variable' ? false : autoPost,
      payee: payee.trim() || null,
      note: note.trim() || null,
      start_date: startDate,
      end_date: endDate || null,
      next_due_date: isEdit && initial ? initial.next_due_date : startDate,
      is_active: true,
    }

    const { data: rec, error: recError } =
      isEdit && initial
        ? await supabase.from('recurring_transactions').update(header).eq('id', initial.id).select().single()
        : await supabase.from('recurring_transactions').insert(header).select().single()

    if (recError || !rec) {
      setSubmitting(false)
      setError(recError?.message ?? 'บันทึกไม่สำเร็จ')
      return
    }

    const { error: legsError } = await supabase.from('recurring_transaction_legs').insert(
      template.map((t) => ({
        recurring_transaction_id: rec.id,
        account_id: t.accountId,
        sign: t.sign,
        amount: t.amount,
        note: t.note ?? null,
        user_id: user.id,
      })),
    )

    setSubmitting(false)
    if (legsError) {
      setError(legsError.message)
      return
    }
    onSaved()
  }

  const handleDelete = async () => {
    if (!initial) return
    if (!confirm('ลบรายการประจำนี้ถาวร?')) return
    setSubmitting(true)
    const { error: deleteError } = await deleteRecurring(initial.id)
    setSubmitting(false)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    onSaved()
  }

  return (
    <Modal title={isEdit ? `แก้ไขรายการประจำ: ${FLOW_LABEL[flow]}` : `รายการประจำ: ${FLOW_LABEL[flow]}`} onClose={onClose}>
      {error && <div className="banner-error">{error}</div>}
      <form onSubmit={handleSubmit}>
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
            <div className="field">
              <label htmlFor="category">หมวดหมู่</label>
              <CategorySelect id="category" accounts={flow === 'income' ? incomeCategories : expenseCategories} value={categoryId} onChange={setCategoryId} required />
            </div>
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
          </>
        )}

        <div className="field">
          <label>ยอด</label>
          <div className="radio-group">
            {AMOUNT_MODES.map((m) => (
              <button
                key={m}
                type="button"
                className={`radio-chip${amountMode === m ? ' active' : ''}`}
                disabled={isDebtPayment && m === 'variable'}
                onClick={() => setAmountMode(m)}
              >
                {AMOUNT_MODE_LABEL[m]}
              </button>
            ))}
          </div>
        </div>

        {isDebtPayment ? (
          <>
            {loanTermsReady ? (
              <>
                <div className="banner-info">
                  ตั้งค่าเงินกู้ไว้แล้ว — ระบบคำนวณเงินต้น/ดอกเบี้ยให้อัตโนมัติทุกงวดจากยอดกู้ที่ตั้งไว้ ไม่ต้องกรอกเอง
                  {previewSplit && (
                    <>
                      {' '}
                      (งวดแรก {startDate}: เงินต้น {satangToBaht(previewSplit.principal).toLocaleString('th-TH')} / ดอกเบี้ย{' '}
                      {satangToBaht(previewSplit.interest).toLocaleString('th-TH')} บาท)
                    </>
                  )}
                </div>
                <div className="field">
                  <label htmlFor="endDate">สิ้นสุดวันที่ (ตั้งให้อัตโนมัติตามงวดสุดท้ายของสัญญา แก้ได้)</label>
                  <input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  <div className="field-hint">ระบบจะหยุดบันทึกรายการนี้อัตโนมัติหลังวันที่นี้ — ลบวันที่ทิ้งได้ถ้าไม่ต้องการกำหนด</div>
                </div>
              </>
            ) : (
              <>
                <div className="banner-info">
                  ปลายทางเป็นบัญชีเงินกู้ — ต้องเป็นยอดคงที่ แยกเงินต้น/ดอกเบี้ยเอง (ไปตั้งค่าเงินกู้ที่หน้าบัญชีเพื่อให้ระบบคำนวณให้อัตโนมัติทุกงวด)
                </div>
                <div className="field">
                  <label htmlFor="principal">เงินต้น (บาท)</label>
                  <input id="principal" type="number" inputMode="decimal" step="0.01" min="0" value={principal} onChange={(e) => setPrincipal(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="interest">ดอกเบี้ย (บาท)</label>
                  <input id="interest" type="number" inputMode="decimal" step="0.01" min="0" value={interest} onChange={(e) => setInterest(e.target.value)} />
                </div>
              </>
            )}
            <div className="field">
              <label htmlFor="interestCategory">หมวดดอกเบี้ย</label>
              <CategorySelect id="interestCategory" accounts={expenseCategories} value={interestCategoryId} onChange={setInterestCategoryId} />
            </div>
          </>
        ) : amountMode === 'fixed' ? (
          <div className="field">
            <label htmlFor="amount">จำนวนเงินต่อครั้ง (บาท)</label>
            <input id="amount" type="number" inputMode="decimal" step="0.01" min="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
        ) : (
          <div className="field-hint">ยอดผันแปร — ระบบจะให้กรอกจำนวนเงินตอนถึงกำหนดแต่ละครั้ง</div>
        )}

        <div className="field">
          <label htmlFor="frequency">ความถี่</label>
          <select id="frequency" value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)}>
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {FREQUENCY_LABEL[f]}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="startDate">เริ่มวันที่</label>
          <input id="startDate" type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>

        <div className="checkbox-field">
          <input id="autoPost" type="checkbox" checked={autoPost} disabled={amountMode === 'variable'} onChange={(e) => setAutoPost(e.target.checked)} />
          <label htmlFor="autoPost">บันทึกอัตโนมัติเมื่อถึงกำหนด (ไม่ต้องกดยืนยัน)</label>
        </div>

        <details className="disclosure">
          <summary>ตัวเลือกเพิ่มเติม</summary>
          {!loanTermsReady && (
            <div className="field">
              <label htmlFor="endDate">สิ้นสุดวันที่ (ถ้ามี)</label>
              <input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          )}
          <div className="field">
            <label htmlFor="payee">ผู้รับ/ผู้จ่าย (payee)</label>
            <input id="payee" value={payee} onChange={(e) => setPayee(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="note">โน้ต</label>
            <input id="note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </details>

        <div className="form-actions">
          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
        {isEdit && (
          <button type="button" className="btn btn-danger btn-block" style={{ marginTop: 10 }} onClick={handleDelete} disabled={submitting}>
            ลบรายการประจำนี้
          </button>
        )}
      </form>
    </Modal>
  )
}
