import type { IncomeType } from '../accounts/constants'
import type { DeductionCategory } from './types'

// เลข "ข้อ" ในแบบ ภ.ง.ด.90 จริง ตามประเภทเงินได้ — ใช้กำกับหน้าสรุปภาษีให้เทียบกับแบบฟอร์มจริงได้ทันที (ตกลงกับวี)
export const INCOME_ITEM_NUMBER: Record<IncomeType, number> = {
  '40(1)': 1,
  '40(2)': 1,
  '40(3)': 2,
  '40(4)': 3,
  '40(5)': 4,
  '40(6)': 5,
  '40(7)': 6,
  '40(8)': 7,
}

export const DEDUCTION_CATEGORY_LABEL: Record<DeductionCategory, string> = {
  personal_family: 'ส่วนตัว/ครอบครัว',
  insurance_retirement: 'ประกัน/เกษียณ/ที่อยู่อาศัย',
  donation: 'เงินบริจาค',
  stimulus: 'มาตรการรัฐ',
}

export const DEDUCTION_CATEGORY_ORDER: DeductionCategory[] = ['personal_family', 'insurance_retirement', 'donation', 'stimulus']

// ประเภทเงินได้ที่เลือกวิธีหักค่าใช้จ่ายได้ (เหมาตาม config หรือกรอกยอดจริงเอง)
export const CHOOSABLE_EXPENSE_INCOME_TYPES = ['40(5)', '40(6)', '40(7)', '40(8)'] as const
