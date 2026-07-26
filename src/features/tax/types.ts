// Domain types สำหรับ Thai PIT (M11, C6) — สอดคล้องกับ tax_config_versions และตารางลูกใน migration
import type { IncomeType } from '../accounts/constants'

export type DeductionCategory = 'personal_family' | 'insurance_retirement' | 'donation' | 'stimulus'
export type DeductionCalcType = 'fixed' | 'per_dependent' | 'user_amount'

export type TaxConfigVersion = {
  id: string
  tax_year: number
  version_no: number
  effective_from: string
  note: string | null
  retirement_combined_cap_satang: number
  life_health_combined_cap_satang: number
  section48_2_threshold_satang: number
  section48_2_rate_percent: number
  section48_2_exempt_tax_satang: number
}

export type TaxBracket = {
  seq: number
  min_income_satang: number
  max_income_satang: number | null
  rate_percent: number
}

export type TaxExpenseRule = {
  income_type: IncomeType
  default_rate_percent: number
  cap_satang: number | null
  shared_group: string | null
  allow_actual: boolean
  alt_rate_percent: number | null
  alt_label: string | null
  uses_category_table: boolean
}

export type TaxRentalRate = {
  category_key: string
  label_th: string
  rate_percent: number
}

export type TaxDeductionItem = {
  key: string
  label_th: string
  category: DeductionCategory
  calc_type: DeductionCalcType
  unit_amount_satang: number | null
  cap_satang: number | null
  percent_rate: number | null
  retirement_group: boolean
  life_health_group: boolean
  double_amount: boolean
  sort_order: number
  note: string | null
}

export type FullTaxConfig = {
  version: TaxConfigVersion
  brackets: TaxBracket[]
  expenseRules: TaxExpenseRule[]
  rentalRates: TaxRentalRate[]
  deductionItems: TaxDeductionItem[]
}

// วิธีหักค่าใช้จ่ายที่เลือกได้ (40(5)/40(6)/40(7)/40(8)) — เก็บใน tax_returns.expense_method_choices (jsonb)
export type ExpenseMethodChoice =
  | { method: 'flat'; category_key?: string; is_medical?: boolean }
  | { method: 'actual'; amount_satang: number }

export type ExpenseMethodChoices = Partial<Record<'40(5)' | '40(6)' | '40(7)' | '40(8)', ExpenseMethodChoice>>

export type TaxReturnHeader = {
  has_spouse_no_income: boolean
  child_first_count: number
  child_subsequent_count: number
  parent_count: number
  disabled_dependent_count: number
  expense_method_choices: ExpenseMethodChoices
  // ภาษีครึ่งปีที่ชำระไปแล้วตามแบบ ภ.ง.ด.94 (สำหรับผู้มีเงินได้ 40(2)/(5)-(8) เกินเกณฑ์ต้องยื่นครึ่งปี) — เครดิตหักออกจากภาษีเต็มปี เหมือน WHT แต่คนละที่มา เก็บเป็นยอดเดียว (ตรงตามแบบฟอร์มจริง)
  pnd94_paid_satang: number
}

export const EMPTY_TAX_RETURN_HEADER: TaxReturnHeader = {
  has_spouse_no_income: false,
  child_first_count: 0,
  child_subsequent_count: 0,
  parent_count: 0,
  disabled_dependent_count: 0,
  expense_method_choices: {},
  pnd94_paid_satang: 0,
}

export type IncomeByType = Partial<Record<IncomeType, number>>
export type DeductionEntries = Record<string, number> // item_key -> amount_satang ที่ผู้ใช้กรอก
