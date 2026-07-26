// Thai PIT (M11, C6) engine — pure functions, รับ config เป็น parameter เสมอ (versioned, ห้าม hardcode ตาม REQUIREMENTS §6)
// flow: เงินได้ตาม 40(1)-(8) จาก ledger → หักค่าใช้จ่าย → หักลดหย่อน (เพดานรวมกลุ่มเกษียณ 500,000 + เพดานบริจาค 10% ของเงินได้หลังหักอื่น) →
// เงินได้สุทธิ → ภาษีขั้นบันได เทียบกับมาตรา 48(2) (0.5% ของเงินได้ประเภท 2-8 รวมกัน ถ้า >= threshold) → เทียบภาษีหัก ณ ที่จ่าย
import type { IncomeType } from '../accounts/constants'
import type {
  DeductionCategory,
  DeductionEntries,
  ExpenseMethodChoices,
  FullTaxConfig,
  IncomeByType,
  TaxBracket,
  TaxConfigVersion,
  TaxDeductionItem,
  TaxExpenseRule,
  TaxRentalRate,
  TaxReturnHeader,
} from './types'

const PER_DEPENDENT_COUNT_FIELD: Record<string, keyof TaxReturnHeader> = {
  child_first: 'child_first_count',
  child_subsequent: 'child_subsequent_count',
  parent: 'parent_count',
  disabled_dependent: 'disabled_dependent_count',
}

export type IncomeTypeBreakdown = { incomeType: IncomeType; gross: number; expense: number; net: number }

export type ExpenseDeductionResult = {
  byType: IncomeTypeBreakdown[]
  totalGross: number
  totalExpense: number
  totalNet: number
}

// หักค่าใช้จ่ายตามประเภทเงินได้ — 40(1)+40(2) แชร์เพดานเดียวกัน (shared_group) แบ่งคืนตามสัดส่วน gross เพื่อแสดงผลรายประเภท
// 40(5)/40(6)/40(7)/40(8) เลือกวิธีได้ (เหมาตาม config หรือกรอกยอดจริงเอง — expenseMethodChoices)
export function computeExpenseDeduction(
  incomeByType: IncomeByType,
  expenseRules: TaxExpenseRule[],
  rentalRates: TaxRentalRate[],
  expenseMethodChoices: ExpenseMethodChoices,
): ExpenseDeductionResult {
  const ruleByType = new Map(expenseRules.map((r) => [r.income_type, r]))
  const byType: IncomeTypeBreakdown[] = []
  const handled = new Set<IncomeType>()

  const sharedGroups = new Map<string, IncomeType[]>()
  for (const rule of expenseRules) {
    if (!rule.shared_group) continue
    sharedGroups.set(rule.shared_group, [...(sharedGroups.get(rule.shared_group) ?? []), rule.income_type])
  }

  for (const types of sharedGroups.values()) {
    const grossTotal = types.reduce((s, t) => s + (incomeByType[t] ?? 0), 0)
    const rule = ruleByType.get(types[0])!
    const rawExpense = grossTotal * (rule.default_rate_percent / 100)
    const cappedExpense = rule.cap_satang != null ? Math.min(rawExpense, rule.cap_satang) : rawExpense
    for (const t of types) {
      const gross = incomeByType[t] ?? 0
      const expense = grossTotal > 0 ? Math.round(cappedExpense * (gross / grossTotal)) : 0
      byType.push({ incomeType: t, gross, expense, net: gross - expense })
      handled.add(t)
    }
  }

  for (const [incomeType, gross] of Object.entries(incomeByType) as [IncomeType, number][]) {
    if (handled.has(incomeType) || !gross) continue
    const rule = ruleByType.get(incomeType)
    if (!rule) {
      byType.push({ incomeType, gross, expense: 0, net: gross })
      continue
    }

    const choice = (['40(5)', '40(6)', '40(7)', '40(8)'] as const).includes(incomeType as never)
      ? expenseMethodChoices[incomeType as '40(5)' | '40(6)' | '40(7)' | '40(8)']
      : undefined

    let expense: number
    if (choice?.method === 'actual') {
      expense = Math.min(choice.amount_satang, gross)
    } else if (rule.uses_category_table) {
      const categoryKey = (choice?.method === 'flat' && choice.category_key) || rentalRates[0]?.category_key
      const rate = rentalRates.find((r) => r.category_key === categoryKey)?.rate_percent ?? 0
      expense = gross * (rate / 100)
    } else {
      const isMedical = choice?.method === 'flat' && choice.is_medical === true
      const rate = isMedical && rule.alt_rate_percent != null ? rule.alt_rate_percent : rule.default_rate_percent
      const raw = gross * (rate / 100)
      expense = rule.cap_satang != null ? Math.min(raw, rule.cap_satang) : raw
    }

    expense = Math.round(expense)
    byType.push({ incomeType, gross, expense, net: gross - expense })
  }

  byType.sort((a, b) => a.incomeType.localeCompare(b.incomeType))
  const totalGross = byType.reduce((s, r) => s + r.gross, 0)
  const totalExpense = byType.reduce((s, r) => s + r.expense, 0)
  return { byType, totalGross, totalExpense, totalNet: totalGross - totalExpense }
}

export type DeductionLineResult = {
  key: string
  label: string
  category: DeductionCategory
  raw: number
  applied: number
  capped: boolean
}

export type DeductionsResult = {
  lines: DeductionLineResult[]
  retirementRawTotal: number
  retirementAppliedTotal: number
  retirementCapApplied: boolean
  lifeHealthRawTotal: number
  lifeHealthAppliedTotal: number
  lifeHealthCapApplied: boolean
  donationTotal: number
  otherTotal: number
  total: number
}

function computeLineRaw(item: TaxDeductionItem, header: TaxReturnHeader, entries: DeductionEntries): number {
  if (item.calc_type === 'fixed') {
    if (item.key === 'spouse' && !header.has_spouse_no_income) return 0
    return item.unit_amount_satang ?? 0
  }
  if (item.calc_type === 'per_dependent') {
    const field = PER_DEPENDENT_COUNT_FIELD[item.key]
    const count = field ? (header[field] as number) : 0
    return count * (item.unit_amount_satang ?? 0)
  }
  const entered = entries[item.key] ?? 0
  return item.double_amount ? entered * 2 : entered
}

function applyItemCap(item: TaxDeductionItem, raw: number, percentBase: number): DeductionLineResult {
  let applied = raw
  if (item.cap_satang != null) applied = Math.min(applied, item.cap_satang)
  if (item.percent_rate != null) applied = Math.min(applied, percentBase * (item.percent_rate / 100))
  applied = Math.max(0, Math.round(applied))
  return { key: item.key, label: item.label_th, category: item.category, raw, applied, capped: applied < raw }
}

// เพดานกลุ่ม: เกษียณ (retirement_group, รวมกันไม่เกิน retirementCombinedCapSatang) และ ประกันชีวิต+สุขภาพตนเอง
// (life_health_group, รวมกันไม่เกิน lifeHealthCombinedCapSatang — สุขภาพเองมีเพดานย่อยซ้อนอยู่แล้วที่ item.cap_satang)
// ยอดในกลุ่มที่เกินเพดานรวม ตัดตามสัดส่วน (ไม่กระทบยอดรวม แค่กระจายกลับเข้า line เพื่อแสดงผล)
function applyGroupCap(
  lines: DeductionLineResult[],
  items: TaxDeductionItem[],
  groupKey: 'retirement_group' | 'life_health_group',
  cap: number,
): { raw: number; applied: number; capApplied: boolean } {
  let raw = 0
  for (const line of lines) {
    if (items.find((i) => i.key === line.key)?.[groupKey]) raw += line.applied
  }
  const applied = Math.min(raw, cap)
  const capApplied = applied < raw
  if (capApplied && raw > 0) {
    for (const line of lines) {
      if (items.find((i) => i.key === line.key)?.[groupKey]) {
        line.applied = Math.round(line.applied * (applied / raw))
        line.capped = true
      }
    }
  }
  return { raw, applied, capApplied }
}

// เพดานบริจาค: เทียบตาม ภ.ง.ด.90 ข้อ11 บรรทัด 4-6 จริง — เงินบริจาค 2 เท่า (การศึกษา/รพ.รัฐ) คำนวณ 10% จาก "ฐานเต็ม" ก่อน
// แล้วบริจาคทั่วไปคำนวณ 10% จาก "ฐานที่ลดแล้ว" (หลังหักบริจาค 2 เท่าไปแล้ว) — ไม่ใช่เพดาน 10% แยกอิสระจากฐานเดียวกันทั้งคู่
// simplification ที่ตกลงรับได้สำหรับ scope นี้: %-cap ของกลุ่มประกัน/เกษียณใช้เงินได้พึงประเมินรวมทุกประเภทเป็นฐาน
// (กฎจริงบางรายการ เช่น PVD อิงเฉพาะฐานเงินเดือน ไม่ใช่รายได้รวม — ต่างกันเฉพาะกรณีมีรายได้หลายประเภทปนกันมาก)
export function computeDeductions(
  items: TaxDeductionItem[],
  header: TaxReturnHeader,
  entries: DeductionEntries,
  grossAssessableIncome: number,
  netIncomeAfterExpense: number,
  retirementCombinedCapSatang: number,
  lifeHealthCombinedCapSatang: number,
): DeductionsResult {
  const donationItems = items.filter((i) => i.category === 'donation')
  const otherItems = items.filter((i) => i.category !== 'donation')

  const lines: DeductionLineResult[] = []
  for (const item of otherItems) {
    const raw = computeLineRaw(item, header, entries)
    lines.push(applyItemCap(item, raw, grossAssessableIncome))
  }

  const retirement = applyGroupCap(lines, otherItems, 'retirement_group', retirementCombinedCapSatang)
  const lifeHealth = applyGroupCap(lines, otherItems, 'life_health_group', lifeHealthCombinedCapSatang)

  const ungroupedTotal = lines.reduce((s, line) => {
    const item = otherItems.find((i) => i.key === line.key)
    if (!item || item.retirement_group || item.life_health_group) return s
    return s + line.applied
  }, 0)
  const otherTotal = ungroupedTotal + retirement.applied + lifeHealth.applied

  // 2 เท่า (education/hospital) ก่อน ใช้ฐานเต็ม แล้วลดฐานลงก่อนคำนวณบริจาคทั่วไป (cascade ตามแบบฟอร์มจริง)
  const donationSorted = [...donationItems].sort((a, b) => Number(b.double_amount) - Number(a.double_amount))
  let donationBase = Math.max(0, netIncomeAfterExpense - otherTotal)
  let donationTotal = 0
  for (const item of donationSorted) {
    const raw = computeLineRaw(item, header, entries)
    const line = applyItemCap(item, raw, donationBase)
    lines.push(line)
    donationTotal += line.applied
    donationBase = Math.max(0, donationBase - line.applied)
  }

  return {
    lines,
    retirementRawTotal: retirement.raw,
    retirementAppliedTotal: retirement.applied,
    retirementCapApplied: retirement.capApplied,
    lifeHealthRawTotal: lifeHealth.raw,
    lifeHealthAppliedTotal: lifeHealth.applied,
    lifeHealthCapApplied: lifeHealth.capApplied,
    donationTotal,
    otherTotal,
    total: otherTotal + donationTotal,
  }
}

export type BracketLine = { seq: number; rate_percent: number; taxableAmount: number; tax: number }

export function computeBracketTax(netIncomeSatang: number, brackets: TaxBracket[]): { tax: number; lines: BracketLine[] } {
  const income = Math.max(0, netIncomeSatang)
  const sorted = [...brackets].sort((a, b) => a.seq - b.seq)
  const lines: BracketLine[] = []
  let tax = 0

  for (const b of sorted) {
    if (income <= b.min_income_satang) {
      lines.push({ seq: b.seq, rate_percent: b.rate_percent, taxableAmount: 0, tax: 0 })
      continue
    }
    const upper = b.max_income_satang != null ? Math.min(income, b.max_income_satang) : income
    const taxableAmount = Math.max(0, upper - b.min_income_satang)
    const bracketTax = Math.round(taxableAmount * (b.rate_percent / 100))
    tax += bracketTax
    lines.push({ seq: b.seq, rate_percent: b.rate_percent, taxableAmount, tax: bracketTax })
  }

  return { tax, lines }
}

// มาตรา 48(2): เงินได้ประเภท 40(2)-(8) รวมกัน >= threshold ต้องคำนวณอีกวิธี (เงินได้พึงประเมิน x rate%) แล้วเทียบกับวิธีขั้นบันได จ่ายตัวที่สูงกว่า
// ยกเว้น ถ้าภาษีวิธีนี้ <= exempt (เท่ากับ 0 ในทางปฏิบัติ เพราะวิธีขั้นบันไดยกเว้น 150,000 บาทแรกอยู่แล้วซึ่งสูงกว่าเสมอ)
export function computeSection48_2(nonType1AssessableIncomeSatang: number, config: TaxConfigVersion): number {
  if (nonType1AssessableIncomeSatang < config.section48_2_threshold_satang) return 0
  const raw = nonType1AssessableIncomeSatang * (config.section48_2_rate_percent / 100)
  if (raw <= config.section48_2_exempt_tax_satang) return 0
  return Math.round(raw)
}

export type TaxCalculationResult = {
  expense: ExpenseDeductionResult
  deductions: DeductionsResult
  netTaxableIncome: number
  bracket: { tax: number; lines: BracketLine[] }
  section48_2Tax: number
  finalTax: number
  methodUsed: 'bracket' | 'section48_2'
  totalWithholding: number
  pnd94Paid: number
  refund: number
  owe: number
}

export function calculateTaxReturn(inputs: {
  incomeByType: IncomeByType
  config: FullTaxConfig
  header: TaxReturnHeader
  deductionEntries: DeductionEntries
  totalWithholding: number
}): TaxCalculationResult {
  const { incomeByType, config, header, deductionEntries, totalWithholding } = inputs

  const expense = computeExpenseDeduction(incomeByType, config.expenseRules, config.rentalRates, header.expense_method_choices)
  const deductions = computeDeductions(
    config.deductionItems,
    header,
    deductionEntries,
    expense.totalGross,
    expense.totalNet,
    config.version.retirement_combined_cap_satang,
    config.version.life_health_combined_cap_satang,
  )

  const netTaxableIncome = Math.max(0, expense.totalNet - deductions.total)
  const bracket = computeBracketTax(netTaxableIncome, config.brackets)

  const nonType1Income = (Object.entries(incomeByType) as [IncomeType, number][])
    .filter(([type]) => type !== '40(1)')
    .reduce((s, [, v]) => s + (v ?? 0), 0)
  const section48_2Tax = computeSection48_2(nonType1Income, config.version)

  const finalTax = Math.max(bracket.tax, section48_2Tax)
  const methodUsed: 'bracket' | 'section48_2' = section48_2Tax > bracket.tax ? 'section48_2' : 'bracket'

  // ภ.ง.ด.94 (ภาษีครึ่งปีที่ชำระไปแล้ว) หักออกจากภาษีเต็มปีเหมือน WHT แต่คนละที่มา (แบบฟอร์มจริง ข้อ11 บรรทัด 15/17)
  const pnd94Paid = header.pnd94_paid_satang
  const diff = finalTax - totalWithholding - pnd94Paid
  return {
    expense,
    deductions,
    netTaxableIncome,
    bracket,
    section48_2Tax,
    finalTax,
    methodUsed,
    totalWithholding,
    pnd94Paid,
    refund: diff < 0 ? -diff : 0,
    owe: diff > 0 ? diff : 0,
  }
}
