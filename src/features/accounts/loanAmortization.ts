// คำนวณแยกเงินต้น/ดอกเบี้ยต่องวดอัตโนมัติจากยอดกู้ตั้งต้น เพื่อไม่ต้องเปิด statement ธนาคารมาคำนวณเอง
// เป็นค่าประมาณจากสูตรมาตรฐาน อาจเพี้ยนจากยอดจริงเล็กน้อย (ธนาคารปัดเศษ/มีค่าธรรมเนียมแทรกบางเดือน)
import { addMonths } from '../../lib/date'

export type InterestMethod = 'flat' | 'reducing_balance'

export const INTEREST_METHOD_LABEL: Record<InterestMethod, string> = {
  flat: 'ดอกเบี้ยคงที่ (Flat)',
  reducing_balance: 'ลดต้นลดดอก (Reducing Balance)',
}

export type LoanTerms = {
  originalPrincipal: number // สตางค์
  annualRatePercent: number
  termMonths: number
  startDate: string // ISO date (YYYY-MM-DD)
  interestMethod: InterestMethod
}

type LoanFields = {
  loan_original_principal: number | null
  loan_annual_rate: number | null
  loan_term_months: number | null
  loan_start_date: string | null
  loan_interest_method: string | null
}

type LoanFieldsSet = { [K in keyof LoanFields]: NonNullable<LoanFields[K]> }

// เช็คว่ามีข้อมูลตั้งค่าเงินกู้ครบก่อนเรียก calculateInstallmentSplit ได้
export function hasLoanTerms(account: LoanFields): account is LoanFieldsSet {
  return (
    account.loan_original_principal != null &&
    account.loan_annual_rate != null &&
    account.loan_term_months != null &&
    account.loan_start_date != null &&
    account.loan_interest_method != null
  )
}

export function loanTermsFromAccount(account: LoanFieldsSet): LoanTerms {
  return {
    originalPrincipal: account.loan_original_principal,
    annualRatePercent: account.loan_annual_rate,
    termMonths: account.loan_term_months,
    startDate: account.loan_start_date,
    interestMethod: account.loan_interest_method as InterestMethod,
  }
}

function monthsBetween(startDate: string, targetDate: string): number {
  const s = new Date(`${startDate}T00:00:00`)
  const t = new Date(`${targetDate}T00:00:00`)
  return (t.getFullYear() - s.getFullYear()) * 12 + (t.getMonth() - s.getMonth())
}

// วันที่งวดสุดท้ายของสัญญา = วันเริ่มสัญญา + (ระยะเวลา - 1) เดือน — ใช้เสนอเป็นค่าเริ่มต้นของ "สิ้นสุดวันที่"
// ตอนตั้งรายการประจำผ่อนหนี้ กันลืมปิดรายการหลังผ่อนครบ (ระบบไม่หยุด auto-post เองถ้าไม่ตั้ง end_date)
export function loanFinalInstallmentDate(terms: LoanTerms): string {
  return addMonths(terms.startDate, terms.termMonths - 1)
}

// คืน null ถ้างวดเป้าหมายอยู่นอกช่วงสัญญา (ยังไม่เริ่ม หรือผ่อนครบแล้ว) — ให้ฝั่งเรียกใช้ fallback เป็นกรอกมือ
export function calculateInstallmentSplit(terms: LoanTerms, occurredOn: string): { principal: number; interest: number } | null {
  const period = monthsBetween(terms.startDate, occurredOn) + 1
  if (period < 1 || period > terms.termMonths) return null

  if (terms.interestMethod === 'flat') {
    const totalInterest = terms.originalPrincipal * (terms.annualRatePercent / 100) * (terms.termMonths / 12)
    return {
      principal: Math.round(terms.originalPrincipal / terms.termMonths),
      interest: Math.round(totalInterest / terms.termMonths),
    }
  }

  // reducing_balance: สูตร annuity มาตรฐาน — วนลดยอดคงเหลือทีละงวดจนถึงงวดเป้าหมาย
  const r = terms.annualRatePercent / 100 / 12
  const n = terms.termMonths
  const installment = r === 0 ? terms.originalPrincipal / n : (terms.originalPrincipal * r) / (1 - (1 + r) ** -n)

  let balance = terms.originalPrincipal
  let interest = 0
  let principal = 0
  for (let k = 0; k < period; k++) {
    interest = balance * r
    principal = installment - interest
    balance -= principal
  }

  return { principal: Math.round(principal), interest: Math.round(interest) }
}
