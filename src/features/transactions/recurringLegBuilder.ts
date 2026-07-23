// เทมเพลต leg ของรายการประจำ: แยก "ทิศทาง" (sign) ออกจาก "จำนวนเงิน" (amount, satang)
// เพราะยอดผันแปรไม่รู้จำนวนล่วงหน้า (amount เป็น null) แต่ทิศทางเดบิต/เครดิตคงที่เสมอ
import { calculateInstallmentSplit, hasLoanTerms, loanTermsFromAccount } from '../accounts/loanAmortization'
import type { LegInput } from './types'

export type RecurringLegTemplate = {
  accountId: string
  sign: 1 | -1
  amount: number | null
  note?: string | null
}

export function buildIncomeTemplate(assetAccountId: string, categoryAccountId: string, amount: number | null): RecurringLegTemplate[] {
  return [
    { accountId: assetAccountId, sign: 1, amount },
    { accountId: categoryAccountId, sign: -1, amount },
  ]
}

export function buildExpenseTemplate(payAccountId: string, categoryAccountId: string, amount: number | null): RecurringLegTemplate[] {
  return [
    { accountId: categoryAccountId, sign: 1, amount },
    { accountId: payAccountId, sign: -1, amount },
  ]
}

export function buildTransferTemplate(sourceAccountId: string, destAccountId: string, amount: number | null): RecurringLegTemplate[] {
  return [
    { accountId: destAccountId, sign: 1, amount },
    { accountId: sourceAccountId, sign: -1, amount },
  ]
}

// ผ่อนจ่ายหนี้: ยอดคงที่เท่านั้น (บังคับที่ชั้นฟอร์ม/DB constraint) จึง amount ไม่เป็น null
export function buildDebtPaymentTemplate(
  sourceAccountId: string,
  loanAccountId: string,
  interestAccountId: string | null,
  principal: number,
  interest: number,
): RecurringLegTemplate[] {
  const legs: RecurringLegTemplate[] = [{ accountId: loanAccountId, sign: 1, amount: principal }]
  if (interest > 0 && interestAccountId) {
    legs.push({ accountId: interestAccountId, sign: 1, amount: interest })
  }
  legs.push({ accountId: sourceAccountId, sign: -1, amount: principal + interest })
  return legs
}

// ตอนโพสต์จริง: แปลงเทมเพลตเป็น legs signed จริง — ยอดผันแปรต้องส่ง confirmedAmount (magnitude เดียวกันทุก leg)
export function materializeLegs(template: RecurringLegTemplate[], confirmedAmount?: number): LegInput[] {
  return template.map((t) => {
    const magnitude = t.amount ?? confirmedAmount
    if (magnitude == null) {
      throw new Error('missing amount for recurring leg')
    }
    return { account_id: t.accountId, amount: t.sign * magnitude, note: t.note ?? null }
  })
}

type ResolvableLoanAccount = {
  type_id: string
  subtype: string | null
  loan_original_principal: number | null
  loan_annual_rate: number | null
  loan_term_months: number | null
  loan_start_date: string | null
  loan_interest_method: string | null
}

export type ResolvableRecurringLeg = {
  account_id: string
  sign: number
  amount: number | null
  note: string | null
  account: ResolvableLoanAccount
}

// resolve legs ตอน post จริง (auto-post หรือกดยืนยัน): ถ้าเป็นผ่อนจ่ายหนี้บนบัญชีเงินกู้ที่ตั้งค่าครบ
// คำนวณเงินต้น/ดอกเบี้ยสดจาก occurredOn แทนใช้ค่าที่ template เก็บไว้ตอนสร้าง — เพราะสัดส่วนลดต้นลดดอกเปลี่ยนทุกงวด
// ถ้าไม่ใช่เคสนี้ ใช้ materializeLegs ตามปกติ (รองรับ fixed/variable เดิม)
export function resolveRecurringLegs(legs: ResolvableRecurringLeg[], occurredOn: string, confirmedAmount?: number): LegInput[] {
  const loanLeg = legs.find((l) => l.sign > 0 && l.account.subtype === 'loan' && hasLoanTerms(l.account))

  if (loanLeg && hasLoanTerms(loanLeg.account)) {
    const split = calculateInstallmentSplit(loanTermsFromAccount(loanLeg.account), occurredOn)
    if (split) {
      const interestLeg = legs.find((l) => l.account.type_id === 'expense')
      const sourceLeg = legs.find((l) => l.sign < 0)
      const result: LegInput[] = [{ account_id: loanLeg.account_id, amount: split.principal, note: loanLeg.note }]
      if (split.interest > 0 && interestLeg) {
        result.push({ account_id: interestLeg.account_id, amount: split.interest, note: interestLeg.note })
      }
      if (sourceLeg) {
        result.push({ account_id: sourceLeg.account_id, amount: -(split.principal + split.interest), note: sourceLeg.note })
      }
      return result
    }
  }

  return materializeLegs(
    legs.map((l) => ({ accountId: l.account_id, sign: l.sign as 1 | -1, amount: l.amount, note: l.note })),
    confirmedAmount,
  )
}
