// Domain types สำหรับ Budget (M7, C7 ช่วง 1) — ชั้น A งบประจำ (baseline) + ชั้น B แผนกำหนดการ (schedule)
// ตาม REQUIREMENTS v1.4 §5.1
import type { Tables } from '../../types/database'

export type BudgetPeriod = 'month' | 'year'
export type BudgetDirection = 'outflow' | 'inflow' | 'transfer_to_asset'
export type BudgetFrequency = 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'onetime'

export type BudgetBaselineItem = Tables<'budget_baseline_items'>
export type BudgetScheduleItem = Tables<'budget_schedule_items'>

export const BUDGET_PERIOD_LABEL: Record<BudgetPeriod, string> = {
  month: 'ต่อเดือน',
  year: 'ต่อปี',
}

export const BUDGET_DIRECTION_LABEL: Record<BudgetDirection, string> = {
  outflow: 'จ่ายออก',
  inflow: 'รับเข้า',
  transfer_to_asset: 'โยกเข้าสินทรัพย์',
}

export const BUDGET_FREQUENCY_LABEL: Record<BudgetFrequency, string> = {
  monthly: 'รายเดือน',
  quarterly: 'ราย 3 เดือน',
  semiannual: 'ราย 6 เดือน',
  annual: 'รายปี',
  onetime: 'ครั้งเดียว',
}

// จำนวนครั้ง/ปี ต่อความถี่ — onetime ไม่นับเป็น "ต่อปี" (เกิดครั้งเดียวในปีที่ระบุ)
export const BUDGET_FREQUENCY_OCCURRENCES_PER_YEAR: Record<BudgetFrequency, number> = {
  monthly: 12,
  quarterly: 4,
  semiannual: 2,
  annual: 1,
  onetime: 1,
}

// direction ↔ account.type_id ต้องตรงกันเสมอ (บังคับซ้ำที่ DB trigger ด้วย) — ใช้กรองดรอปดาวน์บัญชีในฟอร์ม
export const BUDGET_DIRECTION_ACCOUNT_TYPE: Record<BudgetDirection, 'income' | 'expense' | 'asset'> = {
  outflow: 'expense',
  inflow: 'income',
  transfer_to_asset: 'asset',
}

export const MONTH_LABEL_TH = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
]
