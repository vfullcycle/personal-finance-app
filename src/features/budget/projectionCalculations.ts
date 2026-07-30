// C7 ช่วง 2 — Projection engine: คำนวณกระแสเงินสด + net worth ล่วงหน้าจาก budget_items + หนี้ที่ตั้งค่าเงินกู้ครบ (auto)
// ตาม REQUIREMENTS §5.2 — ฐานคำนวณ = budget_items เท่านั้น (ไม่รวม recurring_transactions จริงจาก M4) เป็นตัวเลข after-tax
// pure function ล้วน — ไม่แตะ supabase ที่นี่ (เพื่อทดสอบ/reuse ง่าย เหมือน reportCalculations.ts/ratioCalculations.ts)
//
// รวมชั้น A+B เดิมเป็นโมเดลเดียว (ตกลงระหว่างแชต C7 ช่วง 2 — ดู SPEC-budget.md): ทุกรายการมี start_date/end_date
// (end_date=null คือไม่มีกำหนดจบ) แทน year_start/year_end แบบเดิม — เดือนเริ่มงวดของความถี่ราย 3/6/12 เดือน อ่านจาก
// "เดือน" ของ start_date ตรงๆ ไม่ต้องมีฟิลด์แยก และ growth นับปีจาก start_date ของแต่ละรายการเองเสมอ (กฎเดียวทั้งระบบ)
import { addMonths } from '../../lib/date'
import { calculateInstallmentSplit, hasLoanTerms, loanTermsFromAccount, type LoanTerms } from '../accounts/loanAmortization'
import { calculateTaxReturn } from '../tax/taxCalculations'
import type { DeductionEntries, FullTaxConfig, IncomeByType, TaxReturnHeader } from '../tax/types'
import type { IncomeType } from '../accounts/constants'
import type { BudgetDirection, BudgetFrequency } from './types'

export type YearCutMode = 'calendar' | 'full_year'

export type ProjectionAccountRef = {
  type_id: string
  taxable: boolean
  income_type: string | null
}

export type ProjectionItem = {
  direction: BudgetDirection
  frequency: BudgetFrequency
  start_date: string
  end_date: string | null
  amount_per_occurrence_satang: number
  growth_percent_per_year: number
  is_active: boolean
  account: ProjectionAccountRef
}

export type ProjectionLoanAccountFields = {
  loan_original_principal: number | null
  loan_annual_rate: number | null
  loan_term_months: number | null
  loan_start_date: string | null
  loan_interest_method: string | null
}

export type MonthlyProjectionRow = {
  adYear: number
  month: number // 1-12
  beYear: number
  projectionYearIndex: number
  inflow: number // after-tax แล้ว
  outflow: number // ไม่รวมดอกเบี้ยเงินกู้ (แยกคอลัมน์ต่างหาก)
  transferToAsset: number
  debtPrincipal: number
  debtInterest: number
  netCashFlow: number
  netWorthChange: number
  netWorthCumulative: number
  taxExtrapolated: boolean
}

export type AnnualProjectionRow = {
  beYear: number
  projectionYearIndex: number
  inflow: number
  outflow: number
  transferToAsset: number
  debtPrincipal: number
  debtInterest: number
  netCashFlow: number
  netWorthEnd: number
  taxExtrapolated: boolean
}

type RawMonth = {
  adYear: number
  month: number
  beYear: number
  projectionYearIndex: number
  taxableInflowByType: Partial<Record<IncomeType, number>>
  nonTaxableInflow: number
  outflow: number
  transferToAsset: number
  debtPrincipal: number
  debtInterest: number
}

function monthKey(year: number, month: number): number {
  return year * 12 + month
}

// ปีที่ 1 = ปีปฏิทิน/รอบ 12 เดือนแรกนับจากเดือนถัดจากวันปิดบัญชี (เดือนที่ปิดบัญชีเองเป็นข้อมูลจริงแล้ว ไม่ใช่ตัวคาดการณ์)
function monthGrid(closingDateIso: string, totalYears: number, cutMode: YearCutMode) {
  const start = addMonths(closingDateIso, 1)
  const [startYear, startMonth] = start.split('-').map(Number)
  const slots: { adYear: number; month: number; projectionYearIndex: number }[] = []

  if (cutMode === 'calendar') {
    let y = startYear
    let m = startMonth
    while (y - startYear + 1 <= totalYears) {
      slots.push({ adYear: y, month: m, projectionYearIndex: y - startYear + 1 })
      m += 1
      if (m > 12) {
        m = 1
        y += 1
      }
    }
  } else {
    const totalMonths = totalYears * 12
    const startIndex = startYear * 12 + (startMonth - 1)
    for (let i = 0; i < totalMonths; i++) {
      const idx = startIndex + i
      slots.push({ adYear: Math.floor(idx / 12), month: (idx % 12) + 1, projectionYearIndex: Math.floor(i / 12) + 1 })
    }
  }
  return slots
}

// ความถี่ กำหนดว่าเดือนไหนใน "รอบปีจากเดือนของ start_date" เกิด occurrence — เดือนเริ่มงวดคือเดือนของ start_date เอง
// ไม่มีฟิลด์แยกอีกต่อไป (ตัดออกตอนรวมชั้น A+B) ช่วงที่ยัง active เช็คจาก start_date..end_date แบบวันที่ละเอียดระดับเดือน
function isOccurrenceMonth(item: ProjectionItem, adYear: number, month: number): boolean {
  const [sy, sm] = item.start_date.split('-').map(Number)
  const curKey = monthKey(adYear, month)
  if (curKey < monthKey(sy, sm)) return false
  if (item.end_date) {
    const [ey, em] = item.end_date.split('-').map(Number)
    if (curKey > monthKey(ey, em)) return false
  }
  switch (item.frequency) {
    case 'monthly':
      return true
    case 'quarterly':
      return (month - sm + 12) % 3 === 0
    case 'semiannual':
      return (month - sm + 12) % 6 === 0
    case 'annual':
      return month === sm
    case 'onetime':
      return curKey === monthKey(sy, sm)
  }
}

function addTaxable(map: Partial<Record<IncomeType, number>>, account: ProjectionAccountRef, amount: number) {
  if (account.taxable && account.income_type) {
    const t = account.income_type as IncomeType
    map[t] = (map[t] ?? 0) + amount
  }
}

export function calculateProjection(input: {
  closingDateIso: string
  totalYears: number
  cutMode: YearCutMode
  items: ProjectionItem[]
  loanAccounts: ProjectionLoanAccountFields[]
  startingNetWorthSatang: number
  taxConfigsByYear: Map<number, FullTaxConfig> // key = ปีภาษี (พ.ศ.) ที่มี config จริง
  deductionHeader: TaxReturnHeader
  deductionEntries: DeductionEntries // เฉพาะรายการที่ผู้ใช้ติ๊ก "ใช้ในงบประมาณ" แล้ว (กรองมาก่อนเรียกฟังก์ชันนี้)
}): { monthlyRows: MonthlyProjectionRow[]; extrapolatedYears: number[]; noTaxDataYears: number[] } {
  const { closingDateIso, totalYears, cutMode, items, loanAccounts, startingNetWorthSatang, taxConfigsByYear, deductionHeader, deductionEntries } =
    input

  const grid = monthGrid(closingDateIso, totalYears, cutMode)
  const latestConfigYear = taxConfigsByYear.size > 0 ? Math.max(...taxConfigsByYear.keys()) : null
  const activeItems = items.filter((i) => i.is_active)
  const loanTermsSet: LoanTerms[] = loanAccounts.filter(hasLoanTerms).map(loanTermsFromAccount)

  // pass 1: คำนวณดิบต่อเดือน (ก่อนหักภาษี) — แยกรายได้ที่ต้องเสียภาษีออกจากที่ไม่ต้อง (taxable=false หรือไม่มี income_type)
  const rawMonths: RawMonth[] = grid.map(({ adYear, month, projectionYearIndex }) => {
    const beYear = adYear + 543
    const taxableInflowByType: Partial<Record<IncomeType, number>> = {}
    let nonTaxableInflow = 0
    let outflow = 0
    let transferToAsset = 0

    for (const item of activeItems) {
      if (!isOccurrenceMonth(item, adYear, month)) continue
      const [sy] = item.start_date.split('-').map(Number)
      const startBEYear = sy + 543
      const grown = item.amount_per_occurrence_satang * (1 + item.growth_percent_per_year / 100) ** (beYear - startBEYear)
      if (item.direction === 'inflow') {
        if (item.account.taxable && item.account.income_type) addTaxable(taxableInflowByType, item.account, grown)
        else nonTaxableInflow += grown
      } else if (item.direction === 'outflow') {
        outflow += grown
      } else {
        transferToAsset += grown
      }
    }

    let debtPrincipal = 0
    let debtInterest = 0
    const occurredOn = `${adYear}-${String(month).padStart(2, '0')}-01`
    for (const terms of loanTermsSet) {
      const split = calculateInstallmentSplit(terms, occurredOn)
      if (!split) continue
      debtPrincipal += split.principal
      debtInterest += split.interest
    }
    // หมายเหตุ: outflow ที่นี่ไม่รวมดอกเบี้ยเงินกู้ตั้งใจ — แยกแสดงเป็นคอลัมน์ "ดอกเบี้ยเงินกู้" ต่างหาก กันงงว่านับซ้ำกับ "จ่ายออก"
    // (คำนวณ net worth/net cash flow ยังรวมดอกเบี้ยอยู่ครบ แค่แยกเก็บคนละตัวแปรสำหรับแสดงผล)

    return { adYear, month, beYear, projectionYearIndex, taxableInflowByType, nonTaxableInflow, outflow, transferToAsset, debtPrincipal, debtInterest }
  })

  // pass 2: รวมรายได้ต้องเสียภาษีรายปี (พ.ศ.) → เรียก calculateTaxReturn (C6) จริง เพื่อได้อัตราหลังหักภาษีต่อปี
  const yearlyTaxableIncome = new Map<number, Partial<Record<IncomeType, number>>>()
  for (const m of rawMonths) {
    const acc = yearlyTaxableIncome.get(m.beYear) ?? {}
    for (const [type, amount] of Object.entries(m.taxableInflowByType)) {
      acc[type as IncomeType] = (acc[type as IncomeType] ?? 0) + (amount ?? 0)
    }
    yearlyTaxableIncome.set(m.beYear, acc)
  }

  const effectiveRateByYear = new Map<number, number>()
  const extrapolatedYears: number[] = []
  const noTaxDataYears: number[] = []

  for (const [beYear, incomeByType] of yearlyTaxableIncome.entries()) {
    const totalGross = Object.values(incomeByType).reduce((s, v) => s + (v ?? 0), 0)
    if (totalGross <= 0) {
      effectiveRateByYear.set(beYear, 1)
      continue
    }
    const exactConfig = taxConfigsByYear.get(beYear)
    const config = exactConfig ?? (latestConfigYear !== null ? taxConfigsByYear.get(latestConfigYear) : undefined)
    if (!config) {
      effectiveRateByYear.set(beYear, 1)
      noTaxDataYears.push(beYear)
      continue
    }
    if (!exactConfig) extrapolatedYears.push(beYear)

    const result = calculateTaxReturn({
      incomeByType: incomeByType as IncomeByType,
      config,
      header: deductionHeader,
      deductionEntries,
      totalWithholding: 0,
    })
    effectiveRateByYear.set(beYear, (totalGross - result.finalTax) / totalGross)
  }

  // pass 3: คูณอัตราหลังหักภาษีของปีนั้นกลับเข้ารายเดือน + สะสม net worth ตามลำดับเวลา
  let cumulativeNetWorth = startingNetWorthSatang
  const monthlyRows: MonthlyProjectionRow[] = rawMonths.map((m) => {
    const rate = effectiveRateByYear.get(m.beYear) ?? 1
    const taxableTotal = Object.values(m.taxableInflowByType).reduce((s, v) => s + (v ?? 0), 0)
    const inflow = taxableTotal * rate + m.nonTaxableInflow
    const netCashFlow = inflow - m.outflow - m.debtInterest - m.transferToAsset - m.debtPrincipal
    const netWorthChange = inflow - m.outflow - m.debtInterest // โยกเข้าสินทรัพย์/เงินต้นผ่อนหนี้ ไม่กระทบ net worth (คงที่ ตาม §3.5/§3.4)
    cumulativeNetWorth += netWorthChange

    return {
      adYear: m.adYear,
      month: m.month,
      beYear: m.beYear,
      projectionYearIndex: m.projectionYearIndex,
      inflow,
      outflow: m.outflow,
      transferToAsset: m.transferToAsset,
      debtPrincipal: m.debtPrincipal,
      debtInterest: m.debtInterest,
      netCashFlow,
      netWorthChange,
      netWorthCumulative: cumulativeNetWorth,
      taxExtrapolated: extrapolatedYears.includes(m.beYear),
    }
  })

  return {
    monthlyRows,
    extrapolatedYears: [...new Set(extrapolatedYears)].sort((a, b) => a - b),
    noTaxDataYears: [...new Set(noTaxDataYears)].sort((a, b) => a - b),
  }
}

// รวมเดือนที่อยู่ใน projection year เดียวกันเป็น 1 แถวรายปี — ใช้กับปีที่เกิน M ไม่แสดงรายเดือน
// หมายเหตุ: โหมด full_year ปีคาบเกี่ยว 2 ปีปฏิทินได้ — ใช้ปี (พ.ศ.) ของเดือนสุดท้ายเป็นตัวแทนป้ายชื่อแถว
export function aggregateToAnnual(monthlyRows: MonthlyProjectionRow[]): AnnualProjectionRow[] {
  const byYear = new Map<number, MonthlyProjectionRow[]>()
  for (const row of monthlyRows) {
    const list = byYear.get(row.projectionYearIndex) ?? []
    list.push(row)
    byYear.set(row.projectionYearIndex, list)
  }
  return [...byYear.entries()]
    .sort(([a], [b]) => a - b)
    .map(([projectionYearIndex, rows]) => {
      const last = rows[rows.length - 1]
      return {
        beYear: last.beYear,
        projectionYearIndex,
        inflow: rows.reduce((s, r) => s + r.inflow, 0),
        outflow: rows.reduce((s, r) => s + r.outflow, 0),
        transferToAsset: rows.reduce((s, r) => s + r.transferToAsset, 0),
        debtPrincipal: rows.reduce((s, r) => s + r.debtPrincipal, 0),
        debtInterest: rows.reduce((s, r) => s + r.debtInterest, 0),
        netCashFlow: rows.reduce((s, r) => s + r.netCashFlow, 0),
        netWorthEnd: last.netWorthCumulative,
        taxExtrapolated: rows.some((r) => r.taxExtrapolated),
      }
    })
}
