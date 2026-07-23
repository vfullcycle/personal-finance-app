// Decision tools (M8, REQUIREMENTS §7): ความสามารถซื้อของชิ้นใหญ่ + ความสามารถเป็นหนี้ (debt headroom)
// จำนวนเงินทุกตัวเป็นสตางค์ (bigint-safe number) ตามธรรมเนียมแอป

export type BigPurchaseInput = {
  purchasePrice: number
  liquidAssets: number
  monthlyExpense: number
  discretionaryMonthlyCashFlow: number
  emergencyFundTargetMonths: number
}

export type BigPurchaseResult = {
  emergencyFundTarget: number
  excessLiquidity: number
  canAffordNow: boolean
  /** null = คำนวณไม่ได้เพราะกระแสเงินสดต่อเดือนไม่เป็นบวก */
  monthsToAfford: number | null
}

// สภาพคล่องส่วนเกิน = สินทรัพย์สภาพคล่อง(แคบ) เกินกว่าเป้าสำรองฉุกเฉิน + discretionary cash flow/เดือน
// → เก็บอีกกี่เดือนถึงซื้อได้โดยไม่แตะ emergency fund (ใช้ได้ทั้งของทั่วไปและเงินดาวน์ที่อยู่อาศัย)
export function calculateBigPurchaseAffordability(input: BigPurchaseInput): BigPurchaseResult {
  const emergencyFundTarget = input.monthlyExpense * input.emergencyFundTargetMonths
  const excessLiquidity = Math.max(0, input.liquidAssets - emergencyFundTarget)

  if (excessLiquidity >= input.purchasePrice) {
    return { emergencyFundTarget, excessLiquidity, canAffordNow: true, monthsToAfford: 0 }
  }

  const remaining = input.purchasePrice - excessLiquidity
  if (input.discretionaryMonthlyCashFlow <= 0) {
    return { emergencyFundTarget, excessLiquidity, canAffordNow: false, monthsToAfford: null }
  }

  return {
    emergencyFundTarget,
    excessLiquidity,
    canAffordNow: false,
    monthsToAfford: Math.ceil(remaining / input.discretionaryMonthlyCashFlow),
  }
}

export type DebtHeadroomResult = {
  monthlyHeadroom: number
  atCeiling: boolean
}

// ความสามารถเป็นหนี้ = (35% × take-home/เดือน) − เงินผ่อนหนี้ปัจจุบัน/เดือน (เพดาน DSR ตาม §7)
export function calculateDebtHeadroom(takeHomeMonthly: number, currentMonthlyDebtService: number): DebtHeadroomResult {
  const monthlyHeadroom = 0.35 * takeHomeMonthly - currentMonthlyDebtService
  return { monthlyHeadroom, atCeiling: monthlyHeadroom <= 0 }
}

// ย้อน headroom/เดือน เป็นวงเงินกู้สูงสุดที่กู้เพิ่มได้ ด้วยสูตร annuity มาตรฐาน (เหมือนแนวทาง loanAmortization.ts แต่แก้สมการกลับด้าน)
export function calculateMaxLoanPrincipal(monthlyPayment: number, annualRatePercent: number, termYears: number): number {
  const n = Math.round(termYears * 12)
  if (monthlyPayment <= 0 || n <= 0) return 0

  const r = annualRatePercent / 100 / 12
  if (r === 0) return Math.round(monthlyPayment * n)

  return Math.round((monthlyPayment * (1 - (1 + r) ** -n)) / r)
}
